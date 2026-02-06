import { useEffect, useRef, useState } from 'react'
import { WebGPUResources } from '../webgpu/WebGPUResources'
import { TriangleRenderer } from '../webgpu/TriangleRenderer'
import { ModelRenderer } from '../webgpu/ModelRenderer'
import { PostProcessingRenderer } from '../webgpu/PostProcessingRenderer'

export function useWebGPU(canvasRef, width, height) {
  const [error, setError] = useState(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // WebGPU refs
  const deviceRef = useRef(null)
  const contextRef = useRef(null)
  const animationIdRef = useRef(null)

  // Renderer instances
  const resourcesRef = useRef(null)
  const triangleRendererRef = useRef(null)
  const modelRendererRef = useRef(null)
  const postRendererRef = useRef(null)

  // Generation token to prevent stale render loops
  const generationRef = useRef(0)
  const aliveRef = useRef(false)


  const initWebGPU = async (gen) => {
    try {
      if (!navigator.gpu) {
        throw new Error('WebGPU is not supported in this browser')
      }

        const canvas = canvasRef.current
        if (!canvas) return

        // Validate canvas dimensions
        if (width <= 0 || height <= 0) {
          console.warn('Canvas dimensions are invalid:', { width, height })
          return
        }

        // Request WebGPU adapter
      const adapter = await navigator.gpu.requestAdapter()
      if (!adapter) {
        throw new Error('Could not request WebGPU adapter')
      }

      // Request WebGPU device
      const device = await adapter.requestDevice()
      deviceRef.current = device

      // Configure canvas context
      const context = canvas.getContext('webgpu')
      if (!context) {
        throw new Error('Could not get WebGPU context')
      }
      contextRef.current = context

      // Set canvas size
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)

      // Configure the canvas
      const presentationFormat = navigator.gpu.getPreferredCanvasFormat()
      context.configure({
        device,
        format: presentationFormat,
        alphaMode: 'opaque',
      })

      // Create resources utility
      const resources = new WebGPUResources(device)
      resourcesRef.current = resources

      // Create shared scene textures for combined rendering
      const sceneColorTexture = resources.createRenderTexture(
        canvas.width,
        canvas.height,
        presentationFormat,
        'Combined scene color texture'
      )
      const sceneDepthTexture = resources.createTexture({
        size: [canvas.width, canvas.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        label: 'Combined scene depth texture'
      })

      // Initialize triangle renderer (without its own textures)
      const triangleRenderer = new TriangleRenderer(resources)
      triangleRendererRef.current = triangleRenderer
      await triangleRenderer.initialize(
        canvas,
        canvas.width,
        canvas.height,
        presentationFormat
      )
      if (!aliveRef.current || gen !== generationRef.current) return

      // Initialize model renderer (without its own textures)
      const modelRenderer = new ModelRenderer(resources, './models/DamagedHelmet.glb')
      modelRendererRef.current = modelRenderer
      await modelRenderer.initialize(
        canvas,
        canvas.width,
        canvas.height,
        presentationFormat
      )
      if (!aliveRef.current || gen !== generationRef.current) return

      // Initialize post-processing renderer with combined scene texture
      const postRenderer = new PostProcessingRenderer(resources)
      postRendererRef.current = postRenderer
      await postRenderer.initialize(
        canvas,
        canvas.width,
        canvas.height,
        presentationFormat,
        sceneColorTexture
      )
      if (!aliveRef.current || gen !== generationRef.current) return

      // Store shared textures for resize
      resourcesRef.current.sceneColorTexture = sceneColorTexture
      resourcesRef.current.sceneDepthTexture = sceneDepthTexture


      // Start render loop
      // Note: Unlike Vulkan, WebGPU command buffers cannot be pre-recorded when:
      // - Using dynamic uniforms (MVP matrices updated each frame)
      // - Swapchain textures change each frame
      // - Dynamic viewport/aspect ratios
      // Each frame must record fresh commands with current frame data
      const render = () => {
        // Prevent stale render loops after cleanup or generation change
        if (!aliveRef.current || gen !== generationRef.current) return

        if (!deviceRef.current || !contextRef.current || !triangleRendererRef.current || !modelRendererRef.current || !postRendererRef.current) {
          return
        }

        try {
          const device = deviceRef.current
          const context = contextRef.current
          const resources = resourcesRef.current
          const triangleRenderer = triangleRendererRef.current
          const modelRenderer = modelRendererRef.current
          const postRenderer = postRendererRef.current

          if (!resources || !triangleRenderer || !modelRenderer || !postRenderer) {
            return
          }

          // Update both renderers (uniforms, animation)
          triangleRenderer.update(canvas)
          modelRenderer.update(canvas)

          // Record render commands each frame
          const encoder = device.createCommandEncoder({ label: 'Render encoder' })

          // === SINGLE SCENE PASS: Render triangle and model together ===
          const scenePass = encoder.beginRenderPass({
            label: 'Combined scene render pass',
            colorAttachments: [{
              view: resources.sceneColorTexture.createView(),
              clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
              loadOp: 'clear',
              storeOp: 'store'
            }],
            depthStencilAttachment: {
              view: resources.sceneDepthTexture.createView(),
              depthClearValue: 1.0,
              depthLoadOp: 'clear',
              depthStoreOp: 'store'
            }
          })

          // Render both objects in the same render pass
          triangleRenderer.render(scenePass)
          modelRenderer.render(scenePass)

          scenePass.end()

          // === POST PASS: Render fullscreen quad to swapchain ===
          const currentTexture = context.getCurrentTexture()
          if (!currentTexture) {
            console.warn('⚠️ No current texture available')
            animationIdRef.current = requestAnimationFrame(render)
            return
          }

          postRenderer.render(encoder, currentTexture)

          // Submit command buffer to GPU queue for execution
          const commandBuffer = encoder.finish()
          device.queue.submit([commandBuffer])

        } catch (error) {
          console.error('Render error:', error)
          setError(`Render error: ${error.message}`)
          return
        }

        animationIdRef.current = requestAnimationFrame(render)
      }

      render()
      setIsInitialized(true)

    } catch (err) {
      setError(err.message)
      console.error('WebGPU initialization failed:', err)
    }
  }

  const resize = (newWidth, newHeight) => {
    const canvas = canvasRef.current
    if (canvas && deviceRef.current && triangleRendererRef.current && triangleRendererRef.current.isInitialized && modelRendererRef.current && modelRendererRef.current.isInitialized && postRendererRef.current && postRendererRef.current.isInitialized) {
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1
      canvas.width = Math.floor(newWidth * dpr)
      canvas.height = Math.floor(newHeight * dpr)

      const presentationFormat = navigator.gpu.getPreferredCanvasFormat()

      // Get resources object
      const resources = resourcesRef.current

      // Resize both renderers
      triangleRendererRef.current.resize(canvas.width, canvas.height, presentationFormat)
      modelRendererRef.current.resize(canvas.width, canvas.height, presentationFormat)

      // Recreate shared scene textures
      if (resources.sceneColorTexture) {
        resources.sceneColorTexture.destroy()
      }
      if (resources.sceneDepthTexture) {
        resources.sceneDepthTexture.destroy()
      }

      resources.sceneColorTexture = resources.createRenderTexture(
        canvas.width,
        canvas.height,
        presentationFormat,
        'Combined scene color texture'
      )
      resources.sceneDepthTexture = resources.createTexture({
        size: [canvas.width, canvas.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        label: 'Combined scene depth texture'
      })

      // Update post-processing renderer with new combined scene texture
      postRendererRef.current.resize(resources.sceneColorTexture)
    }
  }

  useEffect(() => {
    const gen = ++generationRef.current
    aliveRef.current = true

    initWebGPU(gen)

    return () => {
      aliveRef.current = false
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
        animationIdRef.current = null
      }
      // Note: Avoid destroying device in cleanup for React 18 Strict Mode
      // Let the new init handle device management
    }
  }, [canvasRef, width, height]) // Re-init on canvas/size changes

  return {
    error,
    isInitialized,
    resize
  }
}