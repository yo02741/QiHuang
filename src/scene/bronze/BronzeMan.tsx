import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { easing } from 'maath'
import { buildBodyGeometry } from './buildBody'
import { createBronzeMaterial } from './bronzeMaterial'
import { useAppStore } from '@/store/useAppStore'
import { BODY_OPACITY, LAYER_OPACITY, RENDER_ORDER, TIMING } from '@/lib/constants'

export function BronzeMan() {
  const geometry = useMemo(() => buildBodyGeometry(), [])
  const material = useMemo(() => createBronzeMaterial(), [])
  useEffect(() => () => material.dispose(), [material])

  useFrame((_, delta) => {
    const { xray, mode, selectedPointId, spotlightPointId, anatomyLayer } = useAppStore.getState()
    // 導覽 spotlight：淺透視（銅身仍可辨），讓所應臟腑自動透出
    const tourGhost = mode === 'story' && !selectedPointId && spotlightPointId !== null
    // 解剖分層優先：剝到肌/骨時銅身退成殘影；否則沿用 xray/tour/normal
    const target =
      anatomyLayer === 'skeleton'
        ? LAYER_OPACITY.skinAtSkeleton
        : anatomyLayer === 'muscle'
          ? LAYER_OPACITY.skinAtMuscle
          : xray
            ? BODY_OPACITY.xray
            : tourGhost
              ? BODY_OPACITY.tour
              : BODY_OPACITY.normal
    easing.damp(material, 'opacity', target, TIMING.bodyFade, delta)
    // 半透明後停止寫深度，讓體內臟腑與背面線條正確透出（布林翻轉不觸發重編譯）
    material.depthWrite = material.opacity > BODY_OPACITY.depthWriteThreshold
  })

  return <mesh geometry={geometry} material={material} renderOrder={RENDER_ORDER.body} />
}
