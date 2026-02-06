import { useRef, useEffect } from 'react'
import { useWebGPU } from '../hooks/useWebGPU'
import { guiControls } from '../datguiControls'

export function WebGPUTriangle({ width, height }) {
  const canvasRef = useRef(null)
  const { error, isInitialized, resize } = useWebGPU(canvasRef, width, height)

  // GUI is automatically initialized via singleton pattern when module loads
  // No need for component-level init/cleanup - let the singleton handle it

  // Handle resize when dimensions change
  useEffect(() => {
    if (isInitialized) {
      resize(width, height)
    }
  }, [width, height, isInitialized, resize])

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        color: '#fff',
        fontFamily: 'monospace',
        padding: '20px'
      }}>
        <h2 style={{ color: '#ff4444', marginBottom: '16px' }}>WebGPU Error</h2>
        <p style={{ textAlign: 'center', lineHeight: '1.6' }}>{error}</p>
        <p style={{
          marginTop: '16px',
          fontSize: '14px',
          opacity: 0.7,
          textAlign: 'center'
        }}>
          Please make sure you're using a browser that supports WebGPU<br/>
          (Chrome 113+, Edge 113+, or enable WebGPU flags)
        </p>
      </div>
    )
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        backgroundColor: '#111'
      }}
    />
  )
}