import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { Experience } from '@/scene/Experience'
import { useIsCoarsePointer } from '@/hooks/useIsCoarsePointer'
import { IntroOverlay } from '@/ui/IntroOverlay'
import { Header } from '@/ui/Header'
import { MeridianList } from '@/ui/MeridianList'
import { PointPanel } from '@/ui/PointPanel'
import { Footer } from '@/ui/Footer'
import { useAppStore } from '@/store/useAppStore'

export default function App() {
  const coarse = useIsCoarsePointer()
  // 效能自動降階：掉幀時降 dpr，回穩時升回
  const maxDpr = Math.min(window.devicePixelRatio, coarse ? 1.5 : 2)
  const [dpr, setDpr] = useState(maxDpr)

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
          dpr={dpr}
          gl={{ antialias: false, powerPreference: 'high-performance' }}
          camera={{ fov: 42, near: 0.1, far: 30, position: [0, 1.35, 3.2] }}
        >
          <PerformanceMonitor
            onDecline={() => setDpr(1)}
            onIncline={() => setDpr(maxDpr)}
          >
            <Experience />
          </PerformanceMonitor>
        </Canvas>
      </div>
      <div className="qh-overlay">
        <Header />
        <MeridianList />
        <PointPanel />
        <Footer />
        <IntroOverlay />
      </div>
    </>
  )
}
