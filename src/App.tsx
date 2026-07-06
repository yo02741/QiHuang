import { Canvas } from '@react-three/fiber'
import { Experience } from '@/scene/Experience'

export default function App() {
  return (
    <div className="qh-canvas">
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        camera={{ fov: 42, near: 0.1, far: 30, position: [0, 1.35, 3.2] }}
      >
        <Experience />
      </Canvas>
    </div>
  )
}
