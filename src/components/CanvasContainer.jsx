import { useRef, useEffect } from 'react'

export function CanvasContainer({ width, height, children }) {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.style.width = width
      container.style.height = height
    }
  }, [width, height])

  return (
    <div
      ref={containerRef}
      style={{
        width: width,
        height: height,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#000'
      }}
    >
      {children}
    </div>
  )
}