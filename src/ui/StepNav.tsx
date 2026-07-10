import { useEffect, useRef } from 'react'
import { STORY_SECTIONS } from '@/data/sections'
import { TOUR_STEPS, firstStepOfSection, stepRaw } from '@/lib/tourSteps'
import { viewState } from '@/lib/viewState'
import { useAppStore } from '@/store/useAppStore'
import { useIsNarrow } from '@/hooks/useIsNarrow'

/**
 * 手機步進式導覽（窄視口 + story 模式）：
 * 垂直滾動在手機與慣性手勢先天衝突，改為「‹ 上一穴｜章節選單｜下一穴 ›」
 * 按鈕驅動——站點索引在 store（tourStep，Header 回首頁也走它），本元件
 * 監聽變化把 rawProgress 帶到目標：相鄰站緩動動畫、跨章遠跳直接瞬移
 * （不掃過中間章節）。相機/點亮/spotlight/迷你卡整條既有管線原封不動。
 */
export function StepNav() {
  const narrow = useIsNarrow()
  const mode = useAppStore((s) => s.mode)
  const tourStep = useAppStore((s) => s.tourStep)
  const { setTourStep, enterFree } = useAppStore((s) => s.actions)
  const animRef = useRef(0)

  // tourStep 變化 → 把 rawProgress 帶到該站
  useEffect(() => {
    if (!narrow || mode !== 'story') return
    const { actions, rawProgress } = useAppStore.getState()
    actions.reset() // 清掉選穴，導覽接手
    const from = rawProgress
    const to = stepRaw(TOUR_STEPS[tourStep])
    cancelAnimationFrame(animRef.current)

    // 跨章遠跳：直接切到目標（rawProgress 瞬移 + 相機瞬移），不繞中間章節
    if (Math.abs(to - from) > 1.2) {
      viewState.snapCamera = true
      actions.setScroll(to, 0)
      return
    }
    // 相鄰站：緩動動畫
    const duration = Math.min(1200, 450 + Math.abs(to - from) * 350)
    const t0 = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration)
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2 // easeInOutQuad
      useAppStore.getState().actions.setScroll(from + (to - from) * e, 0)
      if (t < 1) animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [tourStep, narrow, mode])

  if (!narrow || mode !== 'story') return null

  const step = TOUR_STEPS[tourStep]
  const section = STORY_SECTIONS[step.sectionIndex]
  const isLanding = step.sectionId === 'landing'
  const isFinale = step.sectionId === 'finale'
  const go = (i: number) => setTourStep(Math.min(Math.max(i, 0), TOUR_STEPS.length - 1))

  return (
    <>
      {/* landing / finale 疊層（步進模式沒有滾動軌道，文案在此呈現） */}
      {(isLanding || isFinale) && (
        <div className={`qh-steplay ${isLanding ? 'qh-steplay--landing' : ''}`}>
          <p className="qh-section-kicker">{section.kicker}</p>
          {isLanding ? (
            <h1 className="qh-section-title qh-section-title--landing">{section.title}</h1>
          ) : (
            <h2 className="qh-section-title">{section.title}</h2>
          )}
          <p className="qh-steplay-body">{section.body}</p>
          {isLanding && (
            <button type="button" className="qh-free-enter" onClick={() => go(1)}>
              開始導覽 ›
            </button>
          )}
          {isFinale && (
            <button type="button" className="qh-free-enter" onClick={enterFree}>
              進入自由探索
            </button>
          )}
        </div>
      )}

      {/* 底部步進控制列 */}
      <div className="qh-stepnav">
        <button
          type="button"
          className="qh-stepnav-btn qh-stepnav-prev"
          aria-label="上一穴"
          disabled={tourStep === 0}
          onClick={() => go(tourStep - 1)}
        >
          ‹
        </button>
        <select
          className="qh-stepnav-select"
          value={step.sectionId}
          aria-label="跳到章節"
          onChange={(e) => go(firstStepOfSection(e.target.value as typeof step.sectionId))}
        >
          {STORY_SECTIONS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.kicker}・{s.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="qh-stepnav-btn qh-stepnav-next"
          aria-label="下一穴"
          disabled={tourStep === TOUR_STEPS.length - 1}
          onClick={() => go(tourStep + 1)}
        >
          ›
        </button>
      </div>
    </>
  )
}
