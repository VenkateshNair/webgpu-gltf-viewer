/**
 * Load texture from glTF document
 * @param {Document} document - glTF document from glTF Transform
 * @param {WebGPUResources} resources - WebGPU resources helper
 * @param {GPUDevice} device - WebGPU device
 * @returns {GPUTexture} WebGPU texture
 */
export async function loadTexture(document, resources, device) {
  const root = document.getRoot()

  // Prefer the baseColor texture from the first material that has one.
  let texture = null
  const materials = root.listMaterials()
  for (const material of materials) {
    const baseColorTexture = material.getBaseColorTexture()
    if (baseColorTexture) {
      texture = baseColorTexture
      break
    }
  }

  // Fallback: just use the first texture in the file, if any.
  if (!texture) {
    const textures = root.listTextures()
    texture = textures.length ? textures[0] : null
  }

  if (!texture) {
    console.warn('No texture found in glTF, using default texture')
    return _createDefaultTexture(resources, device)
  }

  // glTF-Transform stores encoded image bytes on the Texture.
  const mimeType = (typeof texture.getMimeType === 'function' && texture.getMimeType()) || 'image/png'
  const imageBytes = typeof texture.getImage === 'function' ? texture.getImage() : null

  if (!imageBytes || imageBytes.byteLength === 0) {
    console.warn('Texture has no image bytes, using default texture')
    return _createDefaultTexture(resources, device)
  }

  // Compressed textures (KTX2/BasisU) require a transcoder — cannot be decoded with createImageBitmap().
  if (mimeType === 'image/ktx2') {
    console.warn('Texture is KTX2 (KHR_texture_basisu). Add a KTX2/BasisU transcoder path, using default texture for now.')
    return _createDefaultTexture(resources, device)
  }

  let bitmap
  try {
    bitmap = await createImageBitmap(new Blob([imageBytes], { type: mimeType }))
  } catch (e) {
    console.warn(`Failed to decode texture via createImageBitmap (mimeType=${mimeType}). Using default texture.`, e)
    return _createDefaultTexture(resources, device)
  }

  // BaseColor textures should be sampled as sRGB.
  const gpuTexture = resources.createTexture({
    size: [bitmap.width, bitmap.height],
    format: 'rgba8unorm-srgb',
    // Dawn requires RENDER_ATTACHMENT for copyExternalImageToTexture() paths.
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    label: 'Model baseColor texture'
  })

  device.queue.copyExternalImageToTexture(
    { source: bitmap },
    { texture: gpuTexture },
    { width: bitmap.width, height: bitmap.height }
  )

  if (typeof bitmap.close === 'function') bitmap.close()

  return gpuTexture
}

/**
 * Create a default 2x2 colored texture for testing
 * @param {WebGPUResources} resources - WebGPU resources helper
 * @param {GPUDevice} device - WebGPU device
 * @returns {GPUTexture} Default colored texture
 */
function _createDefaultTexture(resources, device) {
  const texture = resources.createTexture({
    size: [2, 2],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  })

  // Create a 2x2 checkerboard pattern: red, green, blue, yellow
  const textureData = new Uint8Array([
    255, 0, 0, 255,     // Red
    0, 255, 0, 255,     // Green
    0, 0, 255, 255,     // Blue
    255, 255, 0, 255    // Yellow
  ])

  device.queue.writeTexture(
    { texture },
    textureData,
    { bytesPerRow: 8 }, // 2 pixels * 4 bytes each
    { width: 2, height: 2 }
  )

  return texture
}