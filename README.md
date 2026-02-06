Here’s a **super short version** 👇

---

## WebGPU GLTF + Triangle Renderer

A minimal **WebGPU demo** that renders **a GLB model and a triangle in a single render pass**, then feeds that render pass **as a texture into a post-processing fullscreen quad** (second render pass).

**Pipeline flow:**

1. **Render Pass 1**:

   * GLB model
   * Triangle
   * Both rendered together into an offscreen color texture
2. **Render Pass 2 (Post-Process)**:

   * Fullscreen quad
   * Samples the first pass output as a texture

All built with **WebGPU (WGSL shaders)**.

## 🔗 Live Demo

[https://webgpu-gltf.netlify.app/](https://webgpu-gltf.netlify.app/)

## 🛠️ Build & Run

```bash
nvm use 22
npm i
npm run dev
```

That’s it 🚀
