import { useState, useEffect } from 'react'
import { useFullscreen } from './hooks/useFullscreen'
import { useKeyboard } from './hooks/useKeyboard'
import { CanvasContainer } from './components/CanvasContainer'
import { WebGPUTriangle } from './components/WebGPUTriangle'
import './App.css'

function App() {
  const { isFullscreen, toggleFullscreen } = useFullscreen()
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080
  })

  // Update window size on resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Set up keyboard handlers
  useKeyboard({
    f: toggleFullscreen
  })

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      backgroundColor: '#000'
    }}>
      <CanvasContainer width="100vw" height="100vh">
        <WebGPUTriangle
          width={windowSize.width}
          height={windowSize.height}
        />
      </CanvasContainer>
    </div>
  )
}

export default App
