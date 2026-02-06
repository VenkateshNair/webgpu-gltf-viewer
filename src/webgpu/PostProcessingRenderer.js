/**
 * Post-Processing Renderer
 * Handles rendering a fullscreen quad with post-processing effects
 */
export class PostProcessingRenderer {
  constructor(resources) {
    if (!resources) {
      throw new Error('WebGPUResources is required')
    }
    this.resources = resources
    this.device = resources.device

    // Refs for resources
    this.sampler = null
    this.bindGroupLayout = null
    this.bindGroup = null
    this.pipeline = null
    this.sceneColorTexture = null

    // Initialization flag
    this.isInitialized = false
  }

  /**
   * Initialize post-processing resources
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   * @param {GPUTextureFormat} presentationFormat - Presentation format
   * @param {GPUTexture} sceneColorTexture - Scene color texture from combined scene renderer
   */
  async initialize(canvas, width, height, presentationFormat, sceneColorTexture) {
    if (!sceneColorTexture) {
      throw new Error('Scene color texture is required for post-processing')
    }
    this.sceneColorTexture = sceneColorTexture

    // Load post-processing shaders
    const [fullscreenVertexCode, postFragmentCode] = await Promise.all([
      this.resources.loadShader('./shaders/fullscreen.vert'),
      this.resources.loadShader('./shaders/post.frag')
    ])

    // Create shader modules
    const fullscreenVertexModule = this.resources.createShaderModule(
      fullscreenVertexCode,
      'Fullscreen Vertex Shader'
    )
    const postFragmentModule = this.resources.createShaderModule(
      postFragmentCode,
      'Post-processing Fragment Shader'
    )

    // Create sampler for post-processing
    this.sampler = this.resources.createSampler({
      magFilter: 'linear',
      minFilter: 'linear'
    })

    // Create bind group layout for post-processing
    this.bindGroupLayout = this.resources.createBindGroupLayout({
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {}
      }, {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        texture: { sampleType: 'float' }
      }]
    })

    // Create bind group with scene texture
    this.bindGroup = this.resources.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [{
        binding: 0,
        resource: this.sampler
      }, {
        binding: 1,
        resource: this.sceneColorTexture.createView()
      }]
    })

    // Create pipeline layout
    const pipelineLayout = this.resources.createPipelineLayout({
      bindGroupLayouts: [this.bindGroupLayout]
    })

    // Create post-processing pipeline
    this.pipeline = this.resources.createRenderPipeline({
      label: 'Post-processing pipeline',
      layout: pipelineLayout,
      vertex: {
        module: fullscreenVertexModule,
        entryPoint: 'main',
        buffers: [] // No vertex buffers - using @builtin(vertex_index)
      },
      fragment: {
        module: postFragmentModule,
        entryPoint: 'main',
        targets: [{
          format: presentationFormat
        }]
      },
      primitive: {
        topology: 'triangle-list'
      }
    })

    this.isInitialized = true
  }

  /**
   * Render the post-processing fullscreen quad
   * @param {GPUCommandEncoder} encoder - Command encoder
   * @param {GPUTexture} currentTexture - Current swapchain texture
   */
  render(encoder, currentTexture) {
    if (!currentTexture) {
      console.warn('⚠️ No current texture available for post-processing')
      return
    }

    const postPass = encoder.beginRenderPass({
      label: 'Post-processing render pass',
      colorAttachments: [{
        view: currentTexture.createView(),
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store'
      }]
    })

    postPass.setPipeline(this.pipeline)
    postPass.setBindGroup(0, this.bindGroup)
    postPass.draw(6) // Draw fullscreen quad (6 vertices, 2 triangles, no vertex buffer)
    postPass.end()
  }

  /**
   * Update the bind group when scene texture changes (e.g., on resize)
   * @param {GPUTexture} newSceneColorTexture - New scene color texture
   */
  updateSceneTexture(newSceneColorTexture) {
    if (!newSceneColorTexture) {
      throw new Error('New scene color texture is required')
    }
    if (!this.bindGroupLayout) {
      throw new Error('Bind group layout not initialized')
    }
    if (!this.sampler) {
      throw new Error('Sampler not initialized')
    }

    this.sceneColorTexture = newSceneColorTexture

    // Recreate bind group with new texture
    this.bindGroup = this.resources.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [{
        binding: 0,
        resource: this.sampler
      }, {
        binding: 1,
        resource: this.sceneColorTexture.createView()
      }]
    })
  }

  /**
   * Resize resources when canvas size changes
   * @param {GPUTexture} newSceneColorTexture - New scene color texture from combined scene renderer
   */
  resize(newSceneColorTexture) {
    this.updateSceneTexture(newSceneColorTexture)
  }

  /**
   * Destroy all resources
   */
  destroy() {
    // Note: Samplers and bind groups don't need explicit cleanup in WebGPU
    // Textures are owned by TriangleRenderer
  }
}