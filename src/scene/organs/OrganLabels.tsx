import { Html } from '@react-three/drei'
import { ORGAN_LABEL_ANCHORS } from './organGeometry'
import { ORGAN_MAP } from '@/data/organs'
import { ACUPOINT_MAP } from '@/data/acupoints'
import { ELEMENT_NAMES } from '@/lib/wuxing'
import { useAppStore } from '@/store/useAppStore'

/**
 * 臟腑名稱標籤：透視時為被點亮的臟腑浮現名稱＋五行——點穴或
 * 導覽 spotlight 都會觸發。只標高亮的臟腑（通常 1–3 個）；
 * 相鄰臟腑（如心/心包）以索引奇偶交錯浮升高度避免互疊。
 */
export function OrganLabels() {
  const xray = useAppStore((s) => s.xray)
  const mode = useAppStore((s) => s.mode)
  const selectedPointId = useAppStore((s) => s.selectedPointId)
  const spotlightPointId = useAppStore((s) => s.spotlightPointId)

  const focusId = selectedPointId ?? (mode === 'story' ? spotlightPointId : null)
  if (!focusId || (selectedPointId && !xray)) return null
  const organIds = ACUPOINT_MAP.get(focusId)?.organIds ?? []
  if (organIds.length === 0) return null

  return (
    <group>
      {organIds.map((id, i) => {
        const organ = ORGAN_MAP.get(id)
        if (!organ) return null
        return (
          <Html
            key={id}
            position={ORGAN_LABEL_ANCHORS[id]}
            center
            zIndexRange={[9, 0]}
            style={{ pointerEvents: 'none' }}
          >
            <div
              className="qh-organ-label"
              style={{ '--qh-label-lift': i % 2 ? '-52px' : '-28px' } as React.CSSProperties}
            >
              <span className="qh-organ-label-name">{organ.name}</span>
              <span className="qh-organ-label-meta">
                {ELEMENT_NAMES[organ.element]}・{organ.type === 'zang' ? '臟' : '腑'}
              </span>
            </div>
          </Html>
        )
      })}
    </group>
  )
}
