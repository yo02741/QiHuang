import { useEffect, useRef } from 'react'
import { FACING_LABELS, facingOf, viewState } from '@/lib/viewState'
import { useAppStore } from '@/store/useAppStore'

/**
 * 視角方位指示器（上方正中）：顯示目前看到銅人的哪一面（正面/左側/背面/右側），
 * 附一枚隨方位旋轉的小羅盤針。以 rAF 直讀 viewState，不觸發 React 重繪。
 * landing 大標時隱藏，進入章節（或自由探索）後才浮現。
 */
export function ViewCompass() {
  const mode = useAppStore((s) => s.mode)
  const sectionIndex = useAppStore((s) => s.sectionIndex)
  const visible = mode === 'free' || sectionIndex > 0
  const labelRef = useRef<HTMLSpanElement>(null)
  const needleRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let raf = 0
    let lastText = ''
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const az = viewState.azimuth
      const text = FACING_LABELS[facingOf(az)]
      if (labelRef.current && text !== lastText) {
        labelRef.current.textContent = text
        lastText = text
      }
      // 針頭指向「銅人的正面」相對於相機的方向
      if (needleRef.current) {
        needleRef.current.style.transform = `rotate(${az}rad)`
      }
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className={`qh-compass ${visible ? 'is-visible' : ''}`} aria-hidden="true">
      <span className="qh-compass-needle" ref={needleRef}>
        ▲
      </span>
      <span className="qh-compass-label" ref={labelRef}>
        正面
      </span>
    </div>
  )
}
