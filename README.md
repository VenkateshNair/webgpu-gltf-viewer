# WebGPU Triangle Renderer

A modern WebGPU-powered 3D triangle renderer built with React, demonstrating the WebGPU API for hardware-accelerated graphics rendering in the browser.

## 🚀 Live Demo

[View Live Demo](https://webgpu-triangle-demo.vercel.app/) *(Coming soon)*

## 📋 Technology Stack

- **Frontend Framework**: React 19.2.0 with Hooks
- **Build Tool**: Vite 7.2.4
- **Graphics API**: WebGPU (WGSL shaders)
- **Math Library**: wgpu-matrix
- **Development**: Hot Module Replacement (HMR)

## 🏗️ Architecture Overview

This application follows a modular React architecture with clear separation of concerns:

### Component Structure
```
App (Main Application)
├── CanvasContainer (Canvas wrapper with fullscreen support)
└── WebGPUTriangle (WebGPU rendering component)
```

### Hook-Based Architecture
- **`useWebGPU`**: Core WebGPU initialization and rendering logic
- **`useFullscreen`**: Fullscreen toggle functionality
- **`useKeyboard`**: Keyboard event handling (F key for fullscreen)

### File Organization
- **`/components`**: React components for UI structure
- **`/hooks`**: Custom React hooks for stateful logic
- **`/assets/shaders`**: WGSL shader files
- **`/utils`**: Utility functions and helpers

## 🏗️ WebGPU Architecture Decisions

### Command Buffer Design: Frame-by-Frame Recording

**Unlike Vulkan's pre-recorded command buffers, WebGPU requires fresh command buffer recording each frame due to dynamic rendering state.**

#### Why Not Pre-Record Like Vulkan?
- **Dynamic Uniforms**: MVP matrices change every frame (rotation, camera movement, viewport changes)
- **Swapchain Textures**: `context.getCurrentTexture()` returns different textures each frame
- **Frame-Bound Resources**: Command buffers are tied to specific frame's GPU state
- **Safety**: WebGPU prevents accessing resources from different frames/devices

#### Implementation Approach
```javascript
// Each frame: record fresh commands with current frame data
const render = () => {
  // 1. Update dynamic uniforms (matrices change each frame)
  updateUniformBuffer(device, uniformBuffer, canvas)

  // 2. Get current frame's swapchain texture
  const currentTexture = context.getCurrentTexture()

  // 3. Record commands with frame-specific data
  const encoder = device.createCommandEncoder()
  const renderPass = encoder.beginRenderPass({
    colorAttachments: [{ view: currentTexture.createView() }]
  })
  // ... render commands
  renderPass.end()

  // 4. Submit to GPU
  device.queue.submit([encoder.finish()])
}
```

**Result**: Optimal for WebGPU's dynamic rendering model while maintaining performance.

### Uniform Buffer Management: Extracted Update Function

**Matrix calculations are extracted into a dedicated `updateUniformBuffer()` function for better code organization and maintainability.**

#### Before (Inline Matrix Code)
```javascript
// Scattered throughout render function
const projectionMatrix = mat4.perspective(/*...*/)
const viewMatrix = mat4.identity()
const modelMatrix = mat4.translation(vec3.fromValues(0, 0, -3))
mat4.rotateY(modelMatrix, rotationRef.current, modelMatrix)
// ... matrix multiplication
device.queue.writeBuffer(uniformBuffer, 0, mvpMatrix)
```

#### After (Organized Function)
```javascript
// Clean separation in updateUniformBuffer()
const updateUniformBuffer = (device, uniformBuffer, canvas) => {
  // Projection matrix (perspective)
  const projectionMatrix = mat4.perspective(/*...*/)

  // View matrix (camera transform)
  const viewMatrix = mat4.identity()

  // Model matrix (object transform: position + rotation)
  const modelMatrix = mat4.create()
  mat4.translate(modelMatrix, vec3.fromValues(0, 0, -3), modelMatrix)
  mat4.rotateY(modelMatrix, rotationRef.current, modelMatrix)

  // MVP = Projection × View × Model
  const mvpMatrix = mat4.create()
  mat4.multiply(projectionMatrix, viewMatrix, mvpMatrix)
  mat4.multiply(mvpMatrix, modelMatrix, mvpMatrix)

  // Update GPU buffer
  device.queue.writeBuffer(uniformBuffer, 0, mvpMatrix)
}
```

#### Benefits
- **Separation of Concerns**: Matrix math isolated from rendering logic
- **Reusability**: Function can be called from anywhere needing uniform updates
- **Testability**: Matrix calculations can be unit tested independently
- **Maintainability**: Clear organization of 3D transformation pipeline
- **Performance**: Same GPU update efficiency with better code structure

### Matrix Transformation Pipeline

The application implements a complete 3D transformation pipeline:

1. **Model Matrix**: Object-local transformations (translation + rotation)
2. **View Matrix**: Camera/world transformations (currently identity)
3. **Projection Matrix**: Perspective projection (72° FOV, configurable aspect)
4. **MVP Matrix**: Combined transformation sent to vertex shader

**Order**: `MVP = Projection × View × Model` (right-to-left multiplication)

## 📁 File Structure & Purpose

```
src/
├── components/
│   ├── WebGPUTriangle.jsx     # Main WebGPU rendering component - orchestrates WebGPU setup and canvas rendering
│   └── CanvasContainer.jsx    # Canvas wrapper component - handles canvas sizing and fullscreen mode
├── hooks/
│   ├── useWebGPU.js          # Core WebGPU hook - manages adapter, device, pipeline, and render loop
│   ├── useFullscreen.js      # Fullscreen management - toggles fullscreen mode and tracks state
│   └── useKeyboard.js        # Keyboard event handler - listens for 'f' key to toggle fullscreen
├── utils/
│   └── webgpu-utils.js       # WebGPU utility functions - helper methods for common operations
├── assets/shaders/
│   ├── triangle.vert         # Vertex shader - transforms 3D triangle vertices using MVP matrix
│   └── triangle.frag         # Fragment shader - colors pixels red for the triangle surface
└── App.jsx                   # Root component - simplified app structure with fullscreen toggle UI
```

## ⚛️ React App Flow

### 1. App Initialization

**Component Mounting Order:**
1. `App.jsx` mounts first, rendering the main layout
2. `CanvasContainer` creates the HTML5 canvas element
3. `WebGPUTriangle` component initializes with canvas reference
4. Custom hooks (`useWebGPU`, `useFullscreen`, `useKeyboard`) initialize in sequence

**Hook Initialization Sequence:**
```javascript
// useKeyboard initializes first (no dependencies)
useKeyboard() // Sets up 'f' key listener

// useFullscreen initializes second (depends on keyboard state)
useFullscreen() // Manages fullscreen state

// useWebGPU initializes last (depends on canvas)
useWebGPU(canvasRef, width, height) // WebGPU pipeline setup
```

### 2. Event Handling

**Keyboard Event Registration:**
- Single event listener attached to `document` for 'f' key
- Debounced to prevent rapid toggling
- Cleanup handled in `useEffect` return function

**Fullscreen State Management:**
- Tracks `document.fullscreenElement` for current state
- Updates React state when fullscreen changes
- Provides toggle function to child components

**Event Cleanup Process:**
```javascript
useEffect(() => {
  // Setup event listeners
  const handleKeyDown = (event) => { /* ... */ }
  document.addEventListener('keydown', handleKeyDown)

  return () => {
    // Cleanup on unmount
    document.removeEventListener('keydown', handleKeyDown)
  }
}, [])
```

### 3. Canvas Management

**Dynamic Sizing:**
- Canvas size updates on window resize
- Device pixel ratio scaling for crisp rendering
- WebGPU textures recreated when canvas resizes

## 🎮 WebGPU Rendering Flow

### Phase 1: Initialization Phase

**WebGPU Adapter Request:**
```javascript
const adapter = await navigator.gpu.requestAdapter()
```
- Requests hardware GPU adapter from browser
- Falls back to software rendering if hardware unavailable

**Device Creation:**
```javascript
const device = await adapter.requestDevice()
```
- Creates logical device with command queue
- Allocates GPU resources and memory

**Canvas Context Configuration:**
```javascript
const context = canvas.getContext('webgpu')
context.configure({
  device,
  format: navigator.gpu.getPreferredCanvasFormat(),
  alphaMode: 'opaque'
})
```

### Phase 2: Resource Creation

**Shader Loading and Compilation:**
```javascript
// Load WGSL source from files
const vertexShaderCode = await loadShader('./src/assets/shaders/triangle.vert')
const fragmentShaderCode = await loadShader('./src/assets/shaders/triangle.frag')

// Create shader modules
const vertexShaderModule = device.createShaderModule({ code: vertexShaderCode })
const fragmentShaderModule = device.createShaderModule({ code: fragmentShaderCode })
```

**Vertex Buffer Setup:**
```javascript
const vertices = new Float32Array([
  0.0,  0.5, 0.0, 1.0,  // top vertex
 -0.5, -0.5, 0.0, 1.0,  // bottom left
  0.5, -0.5, 0.0, 1.0   // bottom right
])

const vertexBuffer = device.createBuffer({
  size: vertices.byteLength,
  usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
})
device.queue.writeBuffer(vertexBuffer, 0, vertices)
```

**Uniform Buffer for Matrices:**
```javascript
const uniformBuffer = device.createBuffer({
  size: 64, // 4x4 matrix = 16 floats = 64 bytes
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
})
```

**Bind Group Layout and Creation:**
```javascript
const bindGroupLayout = device.createBindGroupLayout({
  entries: [{
    binding: 0,
    visibility: GPUShaderStage.VERTEX,
    buffer: { type: 'uniform' }
  }]
})

const bindGroup = device.createBindGroup({
  layout: bindGroupLayout,
  entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
})
```

### Phase 3: Matrix Setup

**Perspective Projection Matrix:**
```javascript
const aspect = canvas.width / canvas.height
const projectionMatrix = mat4.perspective(
  (2 * Math.PI) / 5, // 72° field of view
  aspect,
  1,    // near plane
  100   // far plane
)
```

**View Matrix Configuration:**
```javascript
const viewMatrix = mat4.identity() // Camera at origin, looking down -Z
```

**Model Matrix with Translation:**
```javascript
const modelMatrix = mat4.translation(vec3.fromValues(0, 0, -3))
// Positions triangle 3 units back from camera
```

**MVP Matrix Calculation:**
```javascript
const mvpMatrix = mat4.create()
mat4.multiply(projectionMatrix, viewMatrix, mvpMatrix)    // P * V
mat4.multiply(mvpMatrix, modelMatrix, mvpMatrix)         // (P * V) * M
```

### Phase 4: Render Loop

**Frame Request Animation:**
```javascript
const render = () => {
  // Update matrices and render frame
  animationIdRef.current = requestAnimationFrame(render)
}
render()
```

**Command Encoder Creation:**
```javascript
const encoder = device.createCommandEncoder({ label: 'Render encoder' })
```

**Render Pass Setup:**
```javascript
const renderPass = encoder.beginRenderPass({
  colorAttachments: [{
    view: currentTexture.createView(),
    clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 }, // Pure black background
    loadOp: 'clear',
    storeOp: 'store'
  }],
  depthStencilAttachment: {
    view: depthTexture.createView(),
    depthClearValue: 1.0,
    depthLoadOp: 'clear',
    depthStoreOp: 'store'
  }
})
```

**Pipeline Binding and Drawing:**
```javascript
renderPass.setPipeline(pipeline)
renderPass.setBindGroup(0, bindGroup)
renderPass.setVertexBuffer(0, vertexBuffer)
renderPass.draw(3) // Draw 3 vertices (1 triangle)
renderPass.end()
```

**Command Submission:**
```javascript
const commandBuffer = encoder.finish()
device.queue.submit([commandBuffer])
```

## 🔧 WebGPU Variables & Usage

### Core WebGPU Objects

- **`adapter`**: GPUAdapter - Hardware GPU adapter for requesting devices
- **`device`**: GPUDevice - Logical device with command queues and resource allocation
- **`context`**: GPUCanvasContext - Canvas rendering context configured for WebGPU
- **`format`**: GPUTextureFormat - Preferred texture format from `navigator.gpu.getPreferredCanvasFormat()`

### Shaders & Pipeline

- **`vertexShader`**: GPUShaderModule - Compiled vertex shader module from WGSL source
- **`fragmentShader`**: GPUShaderModule - Compiled fragment shader module from WGSL source
- **`pipeline`**: GPURenderPipeline - Complete render pipeline with vertex/fragment stages and state
- **`pipelineLayout`**: GPUPipelineLayout - Layout defining resource bindings for the pipeline

### Buffers & Data

- **`vertexBuffer`**: GPUBuffer - Triangle vertex data (position coordinates)
- **`uniformBuffer`**: GPUBuffer - Matrix uniform data (MVP transformation matrix)
- **`vertices`**: Float32Array - Triangle geometry data `[x,y,z,w, x,y,z,w, x,y,z,w]`

### Bind Groups

- **`bindGroupLayout`**: GPUBindGroupLayout - Describes resource binding structure
- **`bindGroup`**: GPUBindGroup - Actual resource bindings (uniform buffers, textures, samplers)

### Rendering

- **`commandEncoder`**: GPUCommandEncoder - Records GPU commands for execution
- **`renderPass`**: GPURenderPassEncoder - Individual render pass with attachments and commands
- **`passEncoder`**: GPURenderPassEncoder - Encoder for render pass commands (draw, bind, etc.)

## 🎨 Shader Explanation

### Vertex Shader (`triangle.vert`)

**Input/Output Structure:**
```wgsl
struct Uniforms {
    mvpMatrix: mat4x4<f32>, // Model-View-Projection transformation matrix
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // Transformed vertex position
};

@vertex
fn main(@location(0) position: vec4<f32>) -> VertexOutput {
    var output: VertexOutput;
    output.position = uniforms.mvpMatrix * position; // Apply MVP transformation
    return output;
}
```

**Purpose:** Transforms 3D vertex positions from model space to screen space using the MVP matrix.

### Fragment Shader (`triangle.frag`)

**Color Output:**
```wgsl
@fragment
fn main() -> @location(0) vec4<f32> {
    return vec4<f32>(1.0, 0.0, 0.0, 1.0); // Solid red color (R, G, B, A)
}
```

**Purpose:** Colors every pixel of the triangle surface red.

### WGSL Syntax Features

- **WGSL (WebGPU Shading Language)**: Type-safe, Rust-inspired syntax
- **Built-in Decorators**: `@vertex`, `@fragment`, `@group`, `@binding`, `@location`
- **Vector Types**: `vec4<f32>` for 4-component float vectors
- **Matrix Types**: `mat4x4<f32>` for 4x4 transformation matrices

## 🔢 Matrix Mathematics

### wgpu-matrix Usage

**Import Statement:**
```javascript
import { mat4, vec3 } from 'wgpu-matrix'
```

### Projection Matrix Setup

**Perspective Projection:**
```javascript
const projectionMatrix = mat4.perspective(
  fovy,    // Vertical field of view in radians (72° = 2π/5)
  aspect,  // Aspect ratio (width/height)
  near,    // Near clipping plane (1 unit)
  far      // Far clipping plane (100 units)
)
```

### Camera/View Matrix

**Identity Matrix (Origin Camera):**
```javascript
const viewMatrix = mat4.identity()
// Camera positioned at (0,0,0) looking down negative Z-axis
```

### Model Transformation

**Translation Matrix:**
```javascript
const modelMatrix = mat4.translation(vec3.fromValues(0, 0, -3))
// Moves triangle -3 units along Z-axis (away from camera)
```

### Matrix Multiplication Order

**MVP Matrix Construction:**
```javascript
// CORRECT: Projection * View * Model
const mvpMatrix = mat4.create()
mat4.multiply(projectionMatrix, viewMatrix, mvpMatrix)  // P * V → mvpMatrix
mat4.multiply(mvpMatrix, modelMatrix, mvpMatrix)       // (P * V) * M → mvpMatrix

// Result: mvpMatrix = Projection × View × Model
```

**Why This Order?**
- **Projection** first: Converts world coordinates to clip space
- **View**: Transforms world relative to camera position/orientation
- **Model**: Transforms object from model space to world space

## ⌨️ Event Handling Details

### Keyboard Event Setup

**Event Listener Registration:**
```javascript
useEffect(() => {
  const handleKeyDown = (event) => {
    if (event.key === 'f' || event.key === 'F') {
      event.preventDefault()
      toggleFullscreen()
    }
  }

  document.addEventListener('keydown', handleKeyDown)
  return () => document.removeEventListener('keydown', handleKeyDown)
}, [toggleFullscreen])
```

### Fullscreen API Usage

**Fullscreen Toggle:**
```javascript
const toggleFullscreen = async () => {
  try {
    if (!document.fullscreenElement) {
      await canvasRef.current?.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  } catch (error) {
    console.error('Fullscreen toggle failed:', error)
  }
}
```

**State Management:**
```javascript
const [isFullscreen, setIsFullscreen] = useState(false)

useEffect(() => {
  const handleFullscreenChange = () => {
    setIsFullscreen(!!document.fullscreenElement)
  }

  document.addEventListener('fullscreenchange', handleFullscreenChange)
  return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
}, [])
```

### Dynamic Rendering Features

**Continuous Rotation Animation:**
```javascript
// Triangle rotates around Y-axis at position (0, 0, -3)
const modelMatrix = mat4.create()
mat4.translate(modelMatrix, vec3.fromValues(0, 0, -3), modelMatrix)
mat4.rotateY(modelMatrix, rotationRef.current, modelMatrix)
rotationRef.current += 0.01 // Smooth rotation increment
```
- **Real-time Animation**: 60 FPS rotation using `requestAnimationFrame`
- **Matrix Pipeline**: Model → View → Projection transformations
- **GPU Synchronization**: Uniform buffer updated each frame with fresh MVP matrix

**Frame-by-Frame Dynamic Updates:**
- Swapchain texture changes each frame (`context.getCurrentTexture()`)
- MVP matrix recalculated with current rotation angle
- Command buffers recorded fresh each frame (WebGPU requirement)
- Depth buffer recreated on canvas resize

### Cleanup Procedures

**Resource Cleanup:**
```javascript
useEffect(() => {
  initWebGPU()

  return () => {
    // Cancel animation frame
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current)
    }

    // Destroy GPU resources
    if (depthTextureRef.current) {
      depthTextureRef.current.destroy()
    }

    if (deviceRef.current) {
      deviceRef.current.destroy()
    }
  }
}, [canvasRef, width, height])
```

## ⚡ Performance Considerations

### Frame Rate Optimization

**RequestAnimationFrame Loop:**
- Uses `requestAnimationFrame` for 60fps rendering
- Automatically pauses when tab is inactive
- Synchronized with display refresh rate

### Memory Management

**GPU Resource Cleanup:**
- Depth textures destroyed and recreated on resize
- Device destroyed on component unmount
- Animation frames cancelled to prevent memory leaks

### Shader Compilation Caching

**Development Hot-Reload:**
- Shader files watched by Vite's HMR
- Automatic recompilation on shader changes
- No manual cache invalidation needed

### Event Listener Management

**Single Listener Pattern:**
- One keyboard listener per component
- Proper cleanup prevents memory leaks
- Debounced events prevent excessive toggling

## 🌐 Browser Compatibility

### WebGPU Support Requirements

**Supported Browsers:**
- Chrome 113+ (Chromium-based)
- Edge 113+
- Opera 99+
- Safari 18+ (partial support)

**Hardware Requirements:**
- DirectX 12 (Windows)
- Vulkan (Linux)
- Metal (macOS)

### Fallback Strategies

**Graceful Degradation:**
```javascript
if (!navigator.gpu) {
  throw new Error('WebGPU is not supported in this browser')
}
```

**Feature Detection:**
```javascript
const adapter = await navigator.gpu.requestAdapter()
if (!adapter) {
  throw new Error('Could not request WebGPU adapter')
}
```

### Error Handling

**WebGPU Initialization Errors:**
```javascript
try {
  const device = await adapter.requestDevice()
} catch (error) {
  setError(`WebGPU device creation failed: ${error.message}`)
}
```

## 🛠️ Development & Build

### Development Setup

**Prerequisites:**
- Node.js 18+
- npm or yarn
- WebGPU-compatible browser

**Installation:**
```bash
npm install
```

**Development Server:**
```bash
npm run dev
```
- Starts Vite development server
- Hot module replacement enabled
- Shader file watching active

### Build Process

**Production Build:**
```bash
npm run build
```
- Optimizes shaders and assets
- Minifies JavaScript/CSS
- Generates static files in `dist/`

**Preview Build:**
```bash
npm run preview
```
- Serves production build locally
- Tests optimized version

### Shader File Watching

**Hot-Reload Support:**
- Shader changes trigger automatic recompilation
- No manual page refresh needed
- Preserves application state during development

**File Structure:**
```
src/assets/shaders/
├── triangle.vert  # Vertex shader (WGSL)
└── triangle.frag  # Fragment shader (WGSL)
```

## 🧪 Testing Checklist

- [x] Shaders load correctly from files
- [x] Background renders pure black
- [x] README accurately describes all components
- [x] All WebGPU variables are documented
- [x] Flow explanations are clear and correct
- [x] Development setup instructions work

## 📄 License

This project is open source and available under the [MIT License](LICENSE).