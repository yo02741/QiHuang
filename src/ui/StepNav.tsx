import { useEffect, useRef, useState } from 'react'
import { STORY_SECTIONS } from '@/data/sections'
import { TOUR_STEPS, firstStepOfSection, stepRaw } from '@/lib/tourSteps'
import { useAppStore } from '@/store/useAppStore'
import { useIsNarrow } from '@/hooks/useIsNarrow'

/**
 * 手機步進式導覽（窄視口 + story 模式）：
 * 垂直滾動在手機與慣性手勢先天衝突，改為「‹ 上一穴｜章節選單｜下一穴 ›」
 * 按鈕驅動——把 rawProgress 以緩動動畫移到下一站，既有的相機/點亮/
 * spotlight/迷你卡整條管線原封不動。landing / finale 以疊層呈現。
 */
export function StepNav() {
  const narrow = useIsNarrow()
  const mode = useAppStore((s) => s.mode)
  const enterFree = useAppStore((s) => s.actions.enterFree)
  const [stepIndex, setStepIndex] = useState(0)
  const animRef = useRef(0)

  // 步進：清掉點選（導覽接手），把 rawProgress 緩動到目標站
  const go = (idx: number) => {
    const next = Math.min(Math.max(idx, 0), TOUR_STEPS.length - 1)
    setStepIndex(next)
    const { actions, rawProgress } = useAppStore.getState()
    actions.reset()
    const from = rawProgress
    const to = stepRaw(TOUR_STEPS[next])
    const duration = Math.min(1400, 450 + Math.abs(to - from) * 350)
    const t0 = performance.now()
    cancelAnimationFrame(animRef.current)
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration)
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2 // easeInOutQuad
      useAppStore.getState().actions.setScroll(from + (to - from) * e, 0)
      if (t < 1) animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
  }

  // 進入步進模式時對齊目前站點；離開時停動畫
  useEffect(() => {
    if (!narrow || mode !== 'story') return
    go(stepIndex)
    return () => cancelAnimationFrame(animRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrow, mode])

  if (!narrow || mode !== 'story') return null

  const step = TOUR_STEPS[stepIndex]
  const section = STORY_SECTIONS[step.sectionIndex]
  const isLanding = step.sectionId === 'landing'
  const isFinale = step.sectionId === 'finale'

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
          disabled={stepIndex === 0}
          onClick={() => go(stepIndex - 1)}
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
          disabled={stepIndex === TOUR_STEPS.length - 1}
          onClick={() => go(stepIndex + 1)}
        >
          ›
        </button>
      </div>
    </>
  )
}
