import { useEffect, useMemo, useRef } from 'react'
import { Html } from '@react-three/drei'
import { STORY_SECTIONS, lightThreshold } from '@/data/sections'
import { ACUPOINT_MAP } from '@/data/acupoints'
import { MERIDIAN_MAP } from '@/data/meridians'
import { resolveAnchor } from '@/lib/anchors'
import { useAppStore } from '@/store/useAppStore'

/**
 * 滾動敘事的穴名標籤：只為「當前章的 labelIds」掛 drei <Html>
 * （每章 ≤ 8 個，換章即卸載）。點亮門檻與 AcupointMarkers 同公式；
 * 進度判定走 store 訂閱直接切 CSS class，不觸發 React 重繪。
 * 雙側穴位的標籤跟隨該章相機所在側（section.side）。
 */
export function SectionPointLabels() {
  const mode = useAppStore((s) => s.mode)
  const sectionIndex = useAppStore((s) => s.sectionIndex)
  const section = STORY_SECTIONS[sectionIndex]

  const labels = useMemo(() => {
    if (!section || section.labelIds.length === 0) return []
    return section.labelIds.map((id) => {
      const point = ACUPOINT_MAP.get(id)!
      const meridian = MERIDIAN_MAP.get(point.meridianId)!
      const side = meridian.bilateral ? section.side : 'L'
      return {
        id,
        name: point.name,
        code: point.code,
        position: resolveAnchor(point.anchor, side).position,
        threshold: lightThreshold(
          sectionIndex,
          section.pointIds.indexOf(id),
          section.pointIds.length,
        ),
      }
    })
  }, [section, sectionIndex])

  const els = useRef<(HTMLDivElement | null)[]>([])

  // 單一元素套用點亮狀態（drei Html 的 portal 子元素掛載晚於 effect，
  // 故 ref callback 附掛當下也要補套用一次，不能只靠 store 訂閱）
  const applyOne = (el: HTMLDivElement, threshold: number) => {
    const s = useAppStore.getState()
    const p = s.rawProgress - s.sectionIndex
    const show = s.selectedPointId === null // focus 時讓位給詳情面板
    el.classList.toggle('is-lit', show && p >= threshold)
  }

  useEffect(() => {
    els.current.length = labels.length
    if (labels.length === 0) return
    return useAppStore.subscribe(() => {
      labels.forEach((l, i) => {
        const el = els.current[i]
        if (el) applyOne(el, l.threshold)
      })
    })
  }, [labels])

  if (mode !== 'story' || labels.length === 0) return null
  return (
    <group>
      {labels.map((l, i) => (
        <Html
          key={l.id}
          position={l.position}
          center
          zIndexRange={[9, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            ref={(el) => {
              els.current[i] = el
              if (el) applyOne(el, l.threshold)
            }}
            className="qh-point-label"
            style={{ '--qh-label-lift': i % 2 ? '-46px' : '-24px' } as React.CSSProperties}
          >
            <span className="qh-point-label-name">{l.name}</span>
            <span className="qh-point-label-code">{l.code}</span>
          </div>
        </Html>
      ))}
    </group>
  )
}
