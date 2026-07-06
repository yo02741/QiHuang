import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { useIsCoarsePointer } from '@/hooks/useIsCoarsePointer'

/**
 * 後製：選擇性 bloom（規則：發光 ⇔ 顏色分量 >1 且 toneMapped:false）
 * + 邊暈。銅人本體維持 tone-mapped，不會產生光暈。
 */
export function Effects() {
  const coarse = useIsCoarsePointer()
  return (
    <EffectComposer multisampling={coarse ? 0 : 4}>
      <Bloom mipmapBlur intensity={0.9} luminanceThreshold={1} luminanceSmoothing={0.02} />
      <Vignette eskil={false} offset={0.25} darkness={0.62} />
    </EffectComposer>
  )
}
