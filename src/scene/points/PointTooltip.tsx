import { useMemo } from 'react'
import { Html } from '@react-three/drei'
import { useAppStore } from '@/store/useAppStore'
import { ACUPOINT_MAP } from '@/data/acupoints'
import { resolveAnchor } from '@/lib/anchors'

/** hover 穴位時的浮動提示（觸控裝置不顯示 hover，故只在滑鼠環境出現） */
export function PointTooltip() {
  const hoveredPointId = useAppStore((s) => s.hoveredPointId)
  const hoveredSide = useAppStore((s) => s.hoveredSide)

  const data = useMemo(() => {
    if (!hoveredPointId) return null
    const point = ACUPOINT_MAP.get(hoveredPointId)
    if (!point) return null
    return { point, position: resolveAnchor(point.anchor, hoveredSide).position }
  }, [hoveredPointId, hoveredSide])

  if (!data) return null
  return (
    <Html
      position={data.position}
      center
      style={{ pointerEvents: 'none', transform: 'translateY(-26px)' }}
      zIndexRange={[10, 0]}
    >
      <div className="qh-tooltip">
        <span className="qh-tooltip-name">{data.point.name}</span>
        <span className="qh-tooltip-code">{data.point.code}</span>
      </div>
    </Html>
  )
}
