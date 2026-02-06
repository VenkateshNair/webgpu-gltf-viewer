import { mat4, vec3 } from 'wgpu-matrix'
import { hexToNormalizedRGBA, rgbaToFloat32Array } from '../utils/colorUtils'
import { guiControls } from '../datguiControls'

/**
 * Triangle Renderer
 * Handles rendering a rotating triangle to an offscreen texture
 */
export class TriangleRenderer {
  constructor(resources) {
    if (!resources) {
      throw new Error('WebGPUResources is required')
    }
    this.resources = resources
    this.device = resources.device

    // Triangle vertices (position only, 4 floats per vertex)
    this.vertices = new Float32Array([
      0.0,  0.5, 0.0, 1.0,  // top
     -0.5, -0.5, 0.0, 1.0,  // bottom left
      0.5, -0.5, 0.0, 1.0   // bottom right
    ])

    // Refs for resources
    this.vertexBuffer = null
    this.uniformBuffer = null
    this.bindGroup = null
    this.pipeline = null

    // Animation state
    this.rotation = 0
  }

  /**
   * Initialize all triangle rendering resources
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   * @param {GPUTextureFormat} presentationFormat - Presentation format
   * @returns {Object} Scene textures for post-processing
   */
  async initialize(canvas, width, height, presentationFormat) {
    // Load triangle shaders
    const [vertexShaderCode, fragmentShaderCode] = await Promise.all([
      this.resources.loadShader('./shaders/triangle.vert'),
      this.resources.loadShader('./shaders/triangle.frag')
    ])

    // Create shader modules
    const vertexShaderModule = this.resources.createShaderModule(
      vertexShaderCode,
      'Triangle Vertex Shader'
    )
    const fragmentShaderModule = this.resources.createShaderModule(
      fragmentShaderCode,
      'Triangle Fragment Shader'
    )

    // Create vertex buffer
    this.vertexBuffer = this.resources.createBuffer(
      this.vertices.byteLength,
      GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      'Triangle vertices'
    )
    this.resources.writeBuffer(this.vertexBuffer, 0, this.vertices)

    // Create uniform buffer for MVP matrix + color (4x4 matrix = 64 bytes + vec4 color = 16 bytes = 80 bytes total)
    this.uniformBuffer = this.resources.createBuffer(
      80,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      'Triangle uniform buffer'
    )

    // Create bind group layout
    const bindGroupLayout = this.resources.createBindGroupLayout({
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' }
      }]
    })

    // Create bind group
    this.bindGroup = this.resources.createBindGroup({
      layout: bindGroupLayout,
      entries: [{
        binding: 0,
        resource: { buffer: this.uniformBuffer }
      }]
    })

    // Create pipeline layout
    const pipelineLayout = this.resources.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout]
    })

    // Create render pipeline
    this.pipeline = this.resources.createRenderPipeline({
      label: 'Triangle pipeline',
      layout: pipelineLayout,
      vertex: {
        module: vertexShaderModule,
        entryPoint: 'main',
        buffers: [{
          arrayStride: 16, // 4 floats * 4 bytes each
          attributes: [{
            shaderLocation: 0,
            offset: 0,
            format: 'float32x4'
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
        topology: 'triangle-list'
      },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: true,
        depthCompare: 'less'
      }
    })

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

    this.rotation += 0.1

    // Model = translation * rotation (rotates in place, then moves to the right)
    const translation = mat4.translation([2, 0, -3]) // Move to right side
    const rotation = mat4.rotationY(this.rotation)
    model = mat4.multiply(translation, rotation)

    // MVP = projection * view * model
    const mvp = mat4.multiply(mat4.multiply(projection, view), model)

    // Write MVP matrix (64 bytes)
    this.resources.writeBuffer(this.uniformBuffer, 0, mvp)

    // Write color (16 bytes at offset 64) - from GUI controls
    const colorRGBA = hexToNormalizedRGBA(guiControls.controls.color)
    const colorBuffer = rgbaToFloat32Array(colorRGBA)
    this.resources.writeBuffer(this.uniformBuffer, 64, colorBuffer)
  }

  /**
   * Render the triangle to the current render pass
   * @param {GPURenderPassEncoder} renderPass - Current render pass encoder
   */
  render(renderPass) {
    renderPass.setPipeline(this.pipeline)
    renderPass.setBindGroup(0, this.bindGroup)
    renderPass.setVertexBuffer(0, this.vertexBuffer)
    renderPass.draw(3) // Draw triangle (3 vertices)
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