import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, Sparkles } from '@react-three/drei'
import { AdditiveBlending, CanvasTexture, type Mesh } from 'three'
import { COLORS, RENDER_ORDER } from '@/lib/constants'

/** 背景墨霧：canvas 放射漸層貼圖的大平面，緩慢旋轉 */
function InkWisp({
  position,
  scale,
  speed,
}: {
  position: [number, number, number]
  scale: number
  speed: number
}) {
  const ref = useRef<Mesh>(null)
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(128, 128, 12, 128, 128, 128)
    g.addColorStop(0, 'rgba(227, 179, 65, 0.55)')
    g.addColorStop(0.45, 'rgba(160, 120, 50, 0.16)')
    g.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 256, 256)
    return new CanvasTexture(c)
  }, [])

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += speed * delta
  })

  return (
    <mesh ref={ref} position={position} scale={scale} renderOrder={RENDER_ORDER.stage}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.05}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </mesh>
  )
}

/**
 * 舞台：燈光、程序化環境反射（不用 Environment preset — 那會在
 * runtime 抓 CDN HDRI）、接觸陰影、漆黑臺座與金環飾條。
 */
export function Stage() {
  return (
    <>
      <color attach="background" args={[COLORS.bg]} />
      <fogExp2 attach="fog" args={[COLORS.bg, 0.09]} />

      <ambientLight intensity={0.14} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.35} color="#ffe2b8" />

      {/*
        鎏金質感的關鍵：離線 Lightformer 環境反射（不用 preset — 那會 runtime
        抓 CDN HDRI，違反 CSP 且離線失效）。金屬「像金屬」全靠這些反射源。
      */}
      <Environment resolution={384} frames={1}>
        {/* 頂部大柔光：主反射源，暖白，鋪出銅身縱向高光帶 */}
        <Lightformer
          form="rect"
          intensity={2.4}
          color="#FFE3B0"
          position={[0, 4, 1]}
          rotation-x={-Math.PI / 2}
          scale={[6, 6, 1]}
        />
        {/* 正面偏左冷補光：金屬藍調反射，與暖側拉開冷暖層次 */}
        <Lightformer form="rect" intensity={0.5} color="#7FA8D6" position={[-2.6, 1.4, 3]} rotation-y={-0.5} scale={[3, 4, 1]} />
        {/* 後右暖緣光：勾出輪廓的鎏金邊 */}
        <Lightformer
          form="rect"
          intensity={3.4}
          color="#FFCE84"
          position={[3, 1.9, -2.5]}
          rotation-y={Math.PI * 0.72}
          scale={[2, 4, 1]}
        />
        {/* 低位環光：在腹部/下身彎面補一道圓弧反射，避免死黑 */}
        <Lightformer form="ring" intensity={0.7} color="#C98A3A" position={[0, 0.5, 2.6]} scale={[2.2, 2.2, 1]} />
      </Environment>

      {/* 金塵與墨霧氛圍 */}
      <Sparkles
        count={140}
        scale={[2.6, 2.2, 1.6]}
        position={[0, 1.1, 0]}
        size={2}
        speed={0.25}
        opacity={0.35}
        color="#E8C87A"
      />
      <InkWisp position={[-1.4, 1.5, -1.8]} scale={3.2} speed={0.02} />
      <InkWisp position={[1.5, 0.7, -2.2]} scale={4.0} speed={-0.014} />

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
