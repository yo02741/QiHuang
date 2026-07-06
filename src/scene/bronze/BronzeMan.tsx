import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { easing } from 'maath'
import type { MeshPhysicalMaterial } from 'three'
import { buildBodyGeometry } from './buildBody'
import { useAppStore } from '@/store/useAppStore'
import { BODY_OPACITY, COLORS, RENDER_ORDER, TIMING } from '@/lib/constants'

export function BronzeMan() {
  const geometry = useMemo(() => buildBodyGeometry(), [])
  const matRef = useRef<MeshPhysicalMaterial>(null)
  const xray = useAppStore((s) => s.xray)

  useFrame((_, delta) => {
    const mat = matRef.current
    if (!mat) return
    easing.damp(
      mat,
      'opacity',
      xray ? BODY_OPACITY.xray : BODY_OPACITY.normal,
      TIMING.bodyFade,
      delta,
    )
    // 半透明後停止寫深度，讓體內臟腑與背面線條正確透出（布林翻轉不觸發重編譯）
    mat.depthWrite = mat.opacity > BODY_OPACITY.depthWriteThreshold
  })

  return (
    <mesh geometry={geometry} renderOrder={RENDER_ORDER.body}>
      <meshPhysicalMaterial
        ref={matRef}
        color={COLORS.bronze}
        metalness={1}
        roughness={0.35}
        clearcoat={0.25}
        clearcoatRoughness={0.5}
        envMapIntensity={0.9}
        transparent
      />
    </mesh>
  )
}
