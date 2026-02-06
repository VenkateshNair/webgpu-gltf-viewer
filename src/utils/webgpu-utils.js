// WebGPU utility functions

export function isWebGPUSupported() {
  return !!navigator.gpu
}

export function getPreferredCanvasFormat() {
  if (navigator.gpu) {
    return navigator.gpu.getPreferredCanvasFormat()
  }
  return 'bgra8unorm'
}

export function createShaderModule(device, code, label) {
  return device.createShaderModule({
    label,
    code
  })
}

export function createBuffer(device, size, usage, label) {
  return device.createBuffer({
    label,
    size,
    usage
  })
}