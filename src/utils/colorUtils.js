/**
 * Color utility functions for WebGPU
 */

/**
 * Convert hex color string to normalized RGBA floats
 * @param {string} hexColor - Hex color string like "#ff0000" or "ff0000"
 * @returns {number[]} - Array of [r, g, b, a] normalized floats (0.0 to 1.0)
 */
export function hexToNormalizedRGBA(hexColor) {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Parse hex values
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const a = 1.0; // Full alpha

  return [r, g, b, a];
}

/**
 * Convert normalized RGBA floats to Float32Array for WebGPU
 * @param {number[]} rgba - Array of [r, g, b, a] normalized floats
 * @returns {Float32Array} - Float32Array ready for WebGPU buffer
 */
export function rgbaToFloat32Array(rgba) {
  return new Float32Array(rgba);
}