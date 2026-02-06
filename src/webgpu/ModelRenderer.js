import { mat4 } from 'wgpu-matrix'
import { loadModel } from './loadModel.js'
import { extractMesh } from './extractMesh.js'
import { loadTexture } from './loadTexture.js'

/**
 * Model Renderer
 * Handles loading and rendering a glTF model to an offscreen texture
 */
export class ModelRenderer {
  constructor(resources, modelUrl) {
    if (!resources) {
      throw new Error('WebGPUResources is required')
    }
    if (!modelUrl) {
      throw new Error('Model URL is required')
    }

    this.resources = resources
    this.device = resources.device
    this.modelUrl = modelUrl

    // Model data
    this.modelData = null
    this.vertexBuffer = null
    this.indexBuffer = null
    this.vertexCount = 0
    this.indexCount = 0

    // Texture data
    this.texture = null
    this.sampler = null

    // Refs for resources
    this.uniformBuffer = null
    this.bindGroup = null
    this.pipeline = null

    // Animation state
    this.rotation = 0

    // Initialization flag
    this.isInitialized = false
  }

  /**
   * Initialize all model rendering resources
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   * @param {GPUTextureFormat} presentationFormat - Presentation format
   * @returns {Object} Scene textures for post-processing
   */
  async initialize(canvas, width, height, presentationFormat) {
    // Load model and extract geometry
    const document = await loadModel(this.modelUrl)
    this.modelData = extractMesh(document)

    // Load texture
    this.texture = await loadTexture(document, this.resources, this.device)
    this.sampler = this.resources.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      addressModeU: 'repeat',
      addressModeV: 'repeat',
    })

    // Create vertex buffer with positions and UV coordinates (interleaved)
    const vertexData = new Float32Array(this.modelData.vertexCount * 5) // 3 pos + 2 uv
    for (let i = 0; i < this.modelData.vertexCount; i++) {
      const posIndex = i * 3
      const uvIndex = i * 2
      const vertexIndex = i * 5

      // Position (xyz)
      vertexData[vertexIndex] = this.modelData.positions[posIndex]
      vertexData[vertexIndex + 1] = this.modelData.positions[posIndex + 1]
      vertexData[vertexIndex + 2] = this.modelData.positions[posIndex + 2]

      // UV coordinates (uv)
      vertexData[vertexIndex + 3] = this.modelData.texcoords[uvIndex]
      vertexData[vertexIndex + 4] = this.modelData.texcoords[uvIndex + 1]
    }

    this.vertexBuffer = this.resources.createBuffer(
      vertexData.byteLength,
      GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      'Model vertices'
    )
    this.resources.writeBuffer(this.vertexBuffer, 0, vertexData)
    this.vertexCount = this.modelData.vertexCount

    // Create index buffer if indices exist
    if (this.modelData.indices) {
      this.indexBuffer = this.resources.createBuffer(
        this.modelData.indices.byteLength,
        GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        'Model indices'
      )
      this.resources.writeBuffer(this.indexBuffer, 0, this.modelData.indices)
      this.indexCount = this.modelData.indexCount
    }

    // Load model shaders
    const [vertexShaderCode, fragmentShaderCode] = await Promise.all([
      this.resources.loadShader('./shaders/model.vert'),
      this.resources.loadShader('./shaders/model.frag')
    ])

    // Create shader modules
    const vertexShaderModule = this.resources.createShaderModule(
      vertexShaderCode,
      'Model Vertex Shader'
    )
    const fragmentShaderModule = this.resources.createShaderModule(
      fragmentShaderCode,
      'Model Fragment Shader'
    )

    // Create uniform buffer for MVP matrix (4x4 matrix = 64 bytes)
    this.uniformBuffer = this.resources.createBuffer(
      64,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      'Model uniform buffer'
    )

    // Create bind group layout
    const bindGroupLayout = this.resources.createBindGroupLayout({
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: 'uniform' }
      }, {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {}
      }, {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        texture: { sampleType: 'float' }
      }]
    })

    // Create bind group
    this.bindGroup = this.resources.createBindGroup({
      layout: bindGroupLayout,
      entries: [{
        binding: 0,
        resource: { buffer: this.uniformBuffer }
      }, {
        binding: 1,
        resource: this.sampler
      }, {
        binding: 2,
        resource: this.texture.createView()
      }]
    })

    // Create pipeline layout
    const pipelineLayout = this.resources.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout]
    })

    // Determine index format
    let indexFormat = undefined
    if (this.indexBuffer) {
      indexFormat = this.modelData.indices instanceof Uint16Array ? 'uint16' : 'uint32'
    }

    // Create render pipeline
    this.pipeline = this.resources.createRenderPipeline({
      label: 'Model pipeline',
      layout: pipelineLayout,
      vertex: {
        module: vertexShaderModule,
        entryPoint: 'main',
        buffers: [{
          arrayStride: 20, // 5 floats * 4 bytes each (vec3 pos + vec2 uv)
          attributes: [{
            shaderLocation: 0,
            offset: 0,
            format: 'float32x3' // position
          }, {
            shaderLocation: 1,
            offset: 12, // 3 floats * 4 bytes
            format: 'float32x2' // texcoord
          }]
        }]
      },
      fragment: {
        module: fragmentShaderModule,
        entryPoint: 'main',
        targets: [{
          format: presentationFormat
        }]
      },
      primitive: {
        topology: 'triangle-list',
        cullMode: 'back'
      },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: true,
        depthCompare: 'less'
      }
    })

    this.isInitialized = true

    // Note: Scene textures are now managed externally in the combined render pass
  }

  /**
   * Update uniform buffer with current frame data
   * @param {HTMLCanvasElement} canvas - Canvas element
   */
  update(canvas) {
    const aspect = canvas.width / canvas.height

    const projection = mat4.perspective(
      (2 * Math.PI) / 5,
      aspect,
      0.1,
      100
    )

    const view = mat4.identity()
    let model = mat4.identity()

    this.rotation += 0.01

    // Model = translation * rotation * scale (scale -> rotate -> translate)
    const translation = mat4.translation([0, 0, -3]) // Move to left side
    const rotation = mat4.rotationY(this.rotation)
    const scale = mat4.scaling([1, 1, 1]) // Scale down the model
    model = mat4.multiply(translation, mat4.multiply(rotation, scale))

    // MVP = projection * view * model
    const mvp = mat4.multiply(mat4.multiply(projection, view), model)

    // Write MVP matrix
    this.resources.writeBuffer(this.uniformBuffer, 0, mvp)
  }

  /**
   * Render the model to the current render pass
   * @param {GPURenderPassEncoder} renderPass - Current render pass encoder
   */
  render(renderPass) {
    renderPass.setPipeline(this.pipeline)
    renderPass.setBindGroup(0, this.bindGroup)
    renderPass.setVertexBuffer(0, this.vertexBuffer)

    if (this.indexBuffer) {
      renderPass.setIndexBuffer(this.indexBuffer, this.modelData.indices instanceof Uint16Array ? 'uint16' : 'uint32')
      renderPass.drawIndexed(this.indexCount)
    } else {
      renderPass.draw(this.vertexCount)
    }
  }

  /**
   * Resize resources when canvas size changes
   * @param {number} newWidth - New canvas width
   * @param {number} newHeight - New canvas height
   * @param {GPUTextureFormat} presentationFormat - Presentation format
   */
  resize(newWidth, newHeight, presentationFormat) {
    // Scene textures are now managed externally - no resize needed here
  }

  /**
   * Destroy all resources
   */
  destroy() {
    // Scene textures are now managed externally - only destroy our own resources
    // Note: Buffers don't need explicit cleanup in WebGPU
  }
}