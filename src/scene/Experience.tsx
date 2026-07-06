import { useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAppStore } from '@/store/useAppStore'
import { COLORS } from '@/lib/constants'

/** 首幀渲染後在 <body> 打標記，供無頭 smoke test 判斷 WebGL 已就緒 */
function ReadyFlag() {
  useFrame(() => {
    if (document.body.dataset.qhReady !== 'true') {
      document.body.dataset.qhReady = 'true'
    }
  })
  return null
}

function PhaseFlag() {
  const phase = useAppStore((s) => s.phase)
  useEffect(() => {
    document.body.dataset.qhPhase = phase
  }, [phase])
  return null
}

export function Experience() {
  return (
    <>
      <color attach="background" args={[COLORS.bg]} />
      <fogExp2 attach="fog" args={[COLORS.bg, 0.09]} />

      <ambientLight intensity={0.15} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.2} color="#ffe2b8" />

      {/* M1 佔位：臺座 + 銅球（M2 換成參數化銅人） */}
      <group>
        <mesh position={[0, -0.06, 0]}>
          <cylinderGeometry args={[0.55, 0.55, 0.12, 48]} />
          <meshStandardMaterial color={COLORS.lacquer} roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.7, 0.7, 0.06, 48]} />
          <meshStandardMaterial color={COLORS.lacquer} roughness={0.7} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.9, 0]}>
          <sphereGeometry args={[0.35, 48, 48]} />
          <meshPhysicalMaterial
            color={COLORS.bronze}
            metalness={1}
            roughness={0.35}
            clearcoat={0.25}
            clearcoatRoughness={0.5}
          />
        </mesh>
      </group>

      <ReadyFlag />
      <PhaseFlag />
    </>
  )
}
