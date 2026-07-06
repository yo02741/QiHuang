import { ContactShadows, Environment, Lightformer } from '@react-three/drei'
import { COLORS, RENDER_ORDER } from '@/lib/constants'

/**
 * 舞台：燈光、程序化環境反射（不用 Environment preset — 那會在
 * runtime 抓 CDN HDRI）、接觸陰影、漆黑臺座與金環飾條。
 */
export function Stage() {
  return (
    <>
      <color attach="background" args={[COLORS.bg]} />
      <fogExp2 attach="fog" args={[COLORS.bg, 0.09]} />

      <ambientLight intensity={0.15} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.2} color="#ffe2b8" />

      {/* 鎏金質感的關鍵：三面 Lightformer 打出的離線環境反射 */}
      <Environment resolution={256} frames={1}>
        <Lightformer
          form="rect"
          intensity={2}
          color="#FFD9A0"
          position={[0, 3, 0]}
          rotation-x={-Math.PI / 2}
          scale={[4, 4, 1]}
        />
        <Lightformer form="rect" intensity={0.6} color="#8FB4D9" position={[0, 1.2, 3]} scale={[3, 2, 1]} />
        <Lightformer
          form="rect"
          intensity={3}
          color="#FFE7B8"
          position={[2.5, 1.8, -2.5]}
          rotation-y={Math.PI * 0.75}
          scale={[2, 3, 1]}
        />
      </Environment>

      <ContactShadows
        position={[0, 0.002, 0]}
        opacity={0.55}
        blur={2.4}
        far={1.2}
        scale={1.8}
        resolution={512}
        frames={1}
      />

      {/* 臺座（頂面 y=0） */}
      <group renderOrder={RENDER_ORDER.stage}>
        <mesh position={[0, -0.06, 0]}>
          <cylinderGeometry args={[0.55, 0.55, 0.12, 64]} />
          <meshStandardMaterial color={COLORS.lacquer} roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.7, 0.72, 0.06, 64]} />
          <meshStandardMaterial color="#101216" roughness={0.7} metalness={0.1} />
        </mesh>
        {/* 金環飾條（M7 後由 bloom 微微發光） */}
        <mesh position={[0, -0.004, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.55, 0.006, 12, 96]} />
          <meshBasicMaterial color={COLORS.gold} toneMapped={false} />
        </mesh>
      </group>
    </>
  )
}
