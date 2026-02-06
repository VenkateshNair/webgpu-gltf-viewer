import * as dat from 'dat.gui'

// Singleton pattern to avoid multiple GUIs in React 18 Strict Mode
let guiInstance = null

export class DatGuiControls {
  constructor() {
    if (guiInstance) {
      return guiInstance
    }

    this.gui = new dat.GUI({ name: 'WebGPU Triangle Controls' })
    this.controls = {
      color: '#ff0000' // Default red
    }

    // Add color picker
    this.gui.addColor(this.controls, 'color').name('Triangle Color')

    guiInstance = this
    return this
  }

  // Get current color as normalized floats [r, g, b, a]
  getColorFloats() {
    const hex = this.controls.color
    // Convert hex string to RGB
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    const a = 1.0 // Full alpha
    return [r, g, b, a]
  }

  // Get raw controls object (for debugging)
  getControls() {
    return this.controls
  }

  // Cleanup method for React unmount
  destroy() {
    if (this.gui) {
      this.gui.destroy()
      this.gui = null
      guiInstance = null
    }
  }
}

// Export singleton instance
export const guiControls = new DatGuiControls()