import { Html } from '@react-three/drei'
import { STORY_SECTIONS } from '@/data/sections'
import { ACUPOINT_MAP } from '@/data/acupoints'
import { MERIDIAN_MAP } from '@/data/meridians'
import { resolveAnchor } from '@/lib/anchors'
import { useAppStore } from '@/store/useAppStore'

/**
 * 滾動敘事的穴名標籤：只標「目前」的穴位（導覽 spotlight）——
 * 已點亮過的穴位轉為柔和已訪狀態（見 AcupointMarkers），
 * 避免一章多穴時滿屏標籤干擾「我現在在哪」。
 * key 以穴位 id 重掛，換穴時重播淡入動畫。
 */
export function SectionPointLabels() {
  const mode = useAppStore((s) => s.mode)
  const sectionIndex = useAppStore((s) => s.sectionIndex)
  const spotlightPointId = useAppStore((s) => s.spotlightPointId)
  const selectedPointId = useAppStore((s) => s.selectedPointId)

  if (mode !== 'story' || !spotlightPointId || selectedPointId) return null
  const point = ACUPOINT_MAP.get(spotlightPointId)
  const section = STORY_SECTIONS[sectionIndex]
  if (!point || !section) return null

  const meridian = MERIDIAN_MAP.get(point.meridianId)
  const side = meridian?.bilateral ? section.side : 'L'
  const position = resolveAnchor(point.anchor, side).position

  return (
    <Html
      key={spotlightPointId}
      position={position}
      center
      zIndexRange={[9, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div className="qh-point-label is-lit">
        <span className="qh-point-label-name">{point.name}</span>
        <span className="qh-point-label-code">{point.code}</span>
      </div>
    </Html>
  )
}
