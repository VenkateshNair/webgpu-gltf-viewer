/**
 * WebGPU Resource Creation Utilities
 * Shared utilities for creating WebGPU resources across different renderers
 */
export class WebGPUResources {
  constructor(device) {
    if (!device) {
      throw new Error('WebGPU device is required')
    }
    this.device = device
  }

  /**
   * Load a shader from file
   * @param {string} path - Path to shader file
   * @returns {Promise<string>} Shader source code
   */
  async loadShader(path) {
    try {
      const response = await fetch(path)
      if (!response.ok) {
        throw new Error(`Failed to load shader: ${path} (${response.status})`)
      }
      return await response.text()
    } catch (error) {
      console.error(`Error loading shader ${path}:`, error)
      throw error
    }
  }

  /**
   * Create a shader module from source code
   * @param {string} code - Shader source code
   * @param {string} label - Debug label
   * @returns {GPUShaderModule}
   */
  createShaderModule(code, label) {
    return this.device.createShaderModule({
      label,
      code
    })
  }

  /**
   * Create a buffer
   * @param {number} size - Buffer size in bytes
   * @param {GPUBufferUsageFlags} usage - Buffer usage flags
   * @param {string} label - Debug label
   * @returns {GPUBuffer}
   */
  createBuffer(size, usage, label) {
    return this.device.createBuffer({
      label,
      size,
      usage
    })
  }

  /**
   * Create a texture
   * @param {GPUTextureDescriptor} descriptor - Texture descriptor
   * @returns {GPUTexture}
   */
  createTexture(descriptor) {
    return this.device.createTexture(descriptor)
  }

  /**
   * Create a bind group layout
   * @param {GPUBindGroupLayoutDescriptor} descriptor - Layout descriptor
   * @returns {GPUBindGroupLayout}
   */
  createBindGroupLayout(descriptor) {
    return this.device.createBindGroupLayout(descriptor)
  }

  /**
   * Create a bind group
   * @param {GPUBindGroupDescriptor} descriptor - Bind group descriptor
   * @returns {GPUBindGroup}
   */
  createBindGroup(descriptor) {
    return this.device.createBindGroup(descriptor)
  }

  /**
   * Create a pipeline layout
   * @param {GPUPipelineLayoutDescriptor} descriptor - Pipeline layout descriptor
   * @returns {GPUPipelineLayout}
   */
  createPipelineLayout(descriptor) {
    return this.device.createPipelineLayout(descriptor)
  }

  /**
   * Create a render pipeline
   * @param {GPURenderPipelineDescriptor} descriptor - Pipeline descriptor
   * @returns {GPURenderPipeline}
   */
  createRenderPipeline(descriptor) {
    return this.device.createRenderPipeline(descriptor)
  }

  /**
   * Create a sampler
   * @param {GPUSamplerDescriptor} descriptor - Sampler descriptor
   * @returns {GPUSampler}
   */
  createSampler(descriptor = {}) {
    return this.device.createSampler(descriptor)
  }

  /**
   * Write data to a buffer
   * @param {GPUBuffer} buffer - Target buffer
   * @param {number} offset - Offset in bytes
   * @param {BufferSource} data - Data to write
   */
  writeBuffer(buffer, offset, data) {
    this.device.queue.writeBuffer(buffer, offset, data)
  }

  /**
   * Create a depth texture
   * @param {number} width - Texture width
   * @param {number} height - Texture height
   * @param {string} label - Debug label
   * @returns {GPUTexture}
   */
  createDepthTexture(width, height, label = 'Depth texture') {
    return this.createTexture({
      size: [width, height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      label
    })
  }

  /**
   * Create an offscreen render texture
   * @param {number} width - Texture width
   * @param {number} height - Texture height
   * @param {GPUTextureFormat} format - Texture format
   * @param {string} label - Debug label
   * @returns {GPUTexture}
   */
  createRenderTexture(width, height, format, label = 'Render texture') {
    return this.createTexture({
      size: [width, height],
      format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      label
    })
  }
}