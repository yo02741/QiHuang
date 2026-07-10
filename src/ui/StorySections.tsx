import { useEffect, useRef } from 'react'
import { STORY_SECTIONS, sectionHeightVh } from '@/data/sections'
import { SCROLL } from '@/lib/constants'
import { useAppStore } from '@/store/useAppStore'

/**
 * 滾動敘事軌道：每章一個 ~130vh 的 <section>（正常文流，撐高頁面），
 * canvas 固定在底層。scroll handler（passive + rAF 節流）把連續進度
 * 寫入 store transient 欄位——相機在 useFrame 以 getState() 讀，
 * React 只在跨章時重繪。文字卡淡入淡出走 IntersectionObserver + CSS。
 *
 * rawProgress = Σ clamp((視口中心線 - section 頂端) / section 高度, 0, 1)
 */

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1)

export function StorySections() {
  const mode = useAppStore((s) => s.mode)
  const enterFree = useAppStore((s) => s.actions.enterFree)
  const trackRef = useRef<HTMLDivElement>(null)

  // scroll → store（rAF 節流；velocity 供微互動衰減與 focus 退出判定）
  useEffect(() => {
    if (mode !== 'story') return
    const track = trackRef.current
    if (!track) return
    const sections = Array.from(track.querySelectorAll('section'))
    let raf = 0
    let lastY = window.scrollY
    let lastT = performance.now()
    let focusScrollAcc = 0 // focus（選穴）中的累積滾動量，超過門檻自動退出

    const update = () => {
      raf = 0
      const centerY = window.innerHeight / 2
      let raw = 0
      for (const el of sections) {
        const rect = el.getBoundingClientRect()
        raw += clamp01((centerY - rect.top) / rect.height)
      }
      const now = performance.now()
      const deltaY = window.scrollY - lastY
      const velocity = (deltaY / Math.max(now - lastT, 1)) * 1000
      lastY = window.scrollY
      lastT = now
      const { selectedPointId, actions } = useAppStore.getState()
      if (selectedPointId) {
        focusScrollAcc += Math.abs(deltaY)
        // reset：連同經絡選取一併清掉，讓導覽 spotlight 無縫接手
        if (focusScrollAcc > SCROLL.focusExitPx) actions.reset()
      } else {
        focusScrollAcc = 0
      }
      actions.setScroll(raw, velocity)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [mode])

  // 文字卡進出視口的淡入淡出
  useEffect(() => {
    if (mode !== 'story') return
    const track = trackRef.current
    if (!track) return
    const cards = Array.from(track.querySelectorAll('.qh-section-card'))
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) e.target.classList.toggle('is-inview', e.isIntersecting)
      },
      { threshold: 0.25 },
    )
    cards.forEach((c) => io.observe(c))
    return () => io.disconnect()
  }, [mode])

  if (mode !== 'story') return null

  return (
    <div className="qh-track" ref={trackRef}>
      {STORY_SECTIONS.map((s) => (
        <section
          key={s.id}
          id={`sec-${s.id}`}
          className={`qh-section qh-section--${s.id}`}
          style={{ minHeight: `${sectionHeightVh(s)}vh` }}
        >
          <div className="qh-section-card">
            <p className="qh-section-kicker">{s.kicker}</p>
            {s.id === 'landing' ? (
              <h1 className="qh-section-title qh-section-title--landing">{s.title}</h1>
            ) : (
              <h2 className="qh-section-title">{s.title}</h2>
            )}
            <p className="qh-section-body">{s.body}</p>
            {s.id === 'landing' && (
              <div className="qh-scroll-hint" aria-hidden="true">
                <span>往下捲動</span>
                <span className="qh-scroll-hint-arrow">↓</span>
              </div>
            )}
            {s.id === 'finale' && (
              <button type="button" className="qh-free-enter" onClick={enterFree}>
                進入自由探索
              </button>
            )}
          </div>
        </section>
      ))}
    </div>
  )
}
