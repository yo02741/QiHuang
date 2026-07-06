import { LANDMARKS } from '@/lib/anatomy'
import { useAppStore } from '@/store/useAppStore'

/** ?debug：顯示骨架地標（左紅右藍）與地面格線，供調整比例/錨點 */
export function DebugHelpers() {
  const debug = useAppStore((s) => s.debug)
  if (!debug) return null

  const entries = Object.entries(LANDMARKS)
  return (
    <group>
      <gridHelper args={[4, 40, '#444444', '#22262c']} />
      <axesHelper args={[0.5]} />
      {entries.map(([id, p]) => (
        <mesh key={id} position={p}>
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshBasicMaterial color="#ff4060" depthTest={false} />
        </mesh>
      ))}
      {entries
        .filter(([, p]) => p.x !== 0)
        .map(([id, p]) => (
          <mesh key={`${id}-R`} position={[-p.x, p.y, p.z]}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshBasicMaterial color="#4080ff" depthTest={false} />
          </mesh>
        ))}
    </group>
  )
}
