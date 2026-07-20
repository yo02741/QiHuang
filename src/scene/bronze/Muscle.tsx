import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { easing } from 'maath'
import { MeshStandardMaterial, type Mesh } from 'three'
import { buildBodyGeometry } from './buildBody'
import { useAppStore } from '@/store/useAppStore'
import { LAYER_OPACITY, RENDER_ORDER, TIMING } from '@/lib/constants'

/**
 * 肌肉層（示意）：銅身幾何略縮，暗紅肌理材質。看肌肉時實體浮現、
 * 看骨架時退成薄影、回銅身時淡出（visible 依透明度切換省繪製）。
 */
export function Muscle() {
  const geometry = useMemo(() => buildBodyGeometry(), [])
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#7d2b24',
        roughness: 0.9,
        metalness: 0,
        emissive: '#2a0806',
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0,
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])
  const ref = useRef<Mesh>(null)

  useFrame((_, delta) => {
    const mesh = ref.current
    if (!mesh) return
    const layer = useAppStore.getState().anatomyLayer
    const target =
      layer === 'muscle' ? LAYER_OPACITY.muscleFull : layer === 'skeleton' ? LAYER_OPACITY.muscleAtSkeleton : 0
    easing.damp(material, 'opacity', target, TIMING.bodyFade, delta)
    material.depthWrite = material.opacity > 0.5
    mesh.visible = material.opacity > 0.01
  })

  return (
    <mesh
      ref={ref}
      geometry={geometry}
      material={material}
      scale={[0.94, 0.985, 0.94]}
      renderOrder={RENDER_ORDER.organs}
    />
  )
}
