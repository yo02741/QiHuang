import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { easing } from 'maath'
import { MeshStandardMaterial, type Mesh } from 'three'
import { buildSkeletonGeometry } from './buildSkeleton'
import { useAppStore } from '@/store/useAppStore'
import { RENDER_ORDER, TIMING } from '@/lib/constants'

/**
 * 骨架層（示意）：與銅身共用 LANDMARKS，長骨落在肢段軸上，故骨架打開時
 * 穴位（骨度分寸定位）自然貼在對應骨頭——「腕上二寸」得以標在橈尺骨間。
 * 象牙白骨色、微自發光以在暗場可辨；visible 依透明度切換省繪製。
 */
export function Skeleton() {
  const geometry = useMemo(() => buildSkeletonGeometry(), [])
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#EBE4D2',
        roughness: 0.72,
        metalness: 0.04,
        emissive: '#3b3728',
        emissiveIntensity: 0.18,
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
    const visible = useAppStore.getState().anatomyLayer === 'skeleton'
    easing.damp(material, 'opacity', visible ? 1 : 0, TIMING.bodyFade, delta)
    material.depthWrite = material.opacity > 0.5
    mesh.visible = material.opacity > 0.01
  })

  return <mesh ref={ref} geometry={geometry} material={material} renderOrder={RENDER_ORDER.organs} />
}
