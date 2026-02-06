/**
 * Extract mesh geometry from a glTF document
 * @param {Document} document - glTF document from glTF Transform
 * @returns {Object} { positions, texcoords, indices, vertexCount, indexCount }
 */
export function extractMesh(document) {
  // Get the root document
  const gltfDoc = document.getRoot()

  // Get first mesh
  const meshes = gltfDoc.listMeshes()
  if (meshes.length === 0) {
    throw new Error('No meshes found in glTF document')
  }

  const mesh = meshes[0]

  // Get first primitive
  const primitives = mesh.listPrimitives()
  if (primitives.length === 0) {
    throw new Error('No primitives found in mesh')
  }

  const primitive = primitives[0]

  // Extract POSITION attribute (required)
  const positionAccessor = primitive.getAttribute('POSITION')
  if (!positionAccessor) {
    throw new Error('POSITION attribute not found in primitive')
  }

  // Get position data as Float32Array (vec3 positions)
  const positions = positionAccessor.getArray()
  const vertexCount = positions.length / 3

  // Extract TEXCOORD_0 attribute (UV coordinates)
  const texcoordAccessor = primitive.getAttribute('TEXCOORD_0')
  let texcoords = null

  if (texcoordAccessor) {
    texcoords = texcoordAccessor.getArray()
  } else {
    // If no UV coordinates, create default ones
    texcoords = new Float32Array(vertexCount * 2)
    // Default UV coordinates (0,0) for all vertices
    for (let i = 0; i < texcoords.length; i++) {
      texcoords[i] = 0.0
    }
  }

  // Extract indices (optional)
  const indexAccessor = primitive.getIndices()
  let indices = null
  let indexCount = 0

  if (indexAccessor) {
    indices = indexAccessor.getArray()
    indexCount = indices.length

    // Convert to Uint16Array or Uint32Array based on max index value
    const maxIndex = Math.max(...indices)
    if (maxIndex <= 65535) {
      indices = new Uint16Array(indices)
    } else {
      indices = new Uint32Array(indices)
    }
  }

  return {
    positions: positions, // Float32Array of vec3 positions
    texcoords: texcoords, // Float32Array of vec2 texcoords
    indices: indices,     // Uint16Array or Uint32Array, or null
    vertexCount,
    indexCount
  }
}