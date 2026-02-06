import { Document, WebIO } from '@gltf-transform/core'

/**
 * Load a glTF or GLB model file using glTF Transform
 * @param {string} url - URL to the model file
 * @returns {Promise<Document>} Parsed glTF document
 */
export async function loadModel(url) {
  try {
    const io = new WebIO()

    // Determine format from URL extension
    const isGLB = url.toLowerCase().endsWith('.glb')

    let document
    if (isGLB) {
      // Fetch the file as ArrayBuffer
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch model: ${url} (${response.status})`)
      }

      const arrayBuffer = await response.arrayBuffer()

      // Load GLB (binary format)
      document = await io.readBinary(new Uint8Array(arrayBuffer))
    } else {
      // Load glTF (JSON + external buffers/images) and let WebIO resolve resources.
      document = await io.read(url)
    }

    return document
  } catch (error) {
    console.error('Error loading model:', error)
    throw error
  }
}