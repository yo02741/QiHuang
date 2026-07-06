import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Experience } from '@/scene/Experience'
import { IntroOverlay } from '@/ui/IntroOverlay'
import { useAppStore } from '@/store/useAppStore'

export default function App() {
  // Esc：先取消選穴，再取消選經絡
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const { selectedPointId, selectedMeridianId, actions } = useAppStore.getState()
      if (selectedPointId) actions.selectPoint(null)
      else if (selectedMeridianId) actions.selectMeridian(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <div className="qh-canvas">
        <Canvas
          dpr={[1, 2]}
          gl={{ antialias: false, powerPreference: 'high-performance' }}
          camera={{ fov: 42, near: 0.1, far: 30, position: [0, 1.35, 3.2] }}
        >
          <Experience />
        </Canvas>
      </div>
      <div className="qh-overlay">
        <IntroOverlay />
      </div>
    </>
  )
}
