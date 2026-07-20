import { Html } from '@react-three/drei'
import { Vector3 } from 'three'
import { LANDMARKS, type LandmarkId } from '@/lib/anatomy'
import { BONE_CUN } from '@/lib/cun'
import { ACUPOINT_MAP } from '@/data/acupoints'
import { resolveAnchor } from '@/lib/anchors'
import { useAppStore } from '@/store/useAppStore'

/**
 * 骨架層的骨度分寸標註：把定位規則「演」在骨頭上。
 * - 常駐三把肢段量尺（前臂12寸／小腿16寸／大腿19寸）浮在對應長骨旁；
 * - 選中骨度分寸穴時，於穴位處標出它的「X寸」（如內關「腕上2寸」）。
 * 只在骨骼層顯示。
 */

const RULERS: { key: string; from: LandmarkId; to: LandmarkId; label: string }[] = [
  { key: 'forearm', from: 'elbowL', to: 'wristL', label: `前臂 ${BONE_CUN.forearm}寸` },
  { key: 'calf', from: 'kneeL', to: 'ankleL', label: `小腿 ${BONE_CUN.calfLat}寸` },
  { key: 'thigh', from: 'hipL', to: 'kneeL', label: `大腿 ${BONE_CUN.thighLat}寸` },
]

export function SkeletonMeasure() {
  const layer = useAppStore((s) => s.anatomyLayer)
  const selectedPointId = useAppStore((s) => s.selectedPointId)
  const selectedSide = useAppStore((s) => s.selectedSide)

  if (layer !== 'skeleton') return null

  // 選中穴的寸數標註（僅骨度分寸穴帶 cunNote）
  const point = selectedPointId ? ACUPOINT_MAP.get(selectedPointId) : undefined
  const cunNote =
    point && 'cunNote' in point.anchor ? (point.anchor.cunNote as string | undefined) : undefined
  const pointPos = point ? resolveAnchor(point.anchor, selectedSide).position : null

  return (
    <>
      {RULERS.map((r) => {
        // 量尺浮在長骨外側（L 側為 +x，往外再挪開一點避免壓到骨）
        const mid = LANDMARKS[r.from].clone().lerp(LANDMARKS[r.to], 0.5).add(new Vector3(0.15, 0, 0.02))
        return (
          <Html key={r.key} position={mid} center zIndexRange={[7, 0]} style={{ pointerEvents: 'none' }}>
            <div className="qh-cun-ruler">{r.label}</div>
          </Html>
        )
      })}
      {cunNote && pointPos && (
        <Html
          key={selectedPointId ?? 'cun-callout'}
          position={pointPos}
          center
          zIndexRange={[9, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="qh-cun-callout">
            <b>{point!.name}</b>
            <span>{cunNote}</span>
          </div>
        </Html>
      )}
    </>
  )
}
