import { useAppStore } from '@/store/useAppStore'

/** 開場：標題 + 進入按鈕（entering 期間淡出，explore 卸載） */
export function IntroOverlay() {
  const phase = useAppStore((s) => s.phase)
  const enter = useAppStore((s) => s.actions.enter)

  if (phase === 'explore') return null
  return (
    <div className={`qh-intro ${phase === 'entering' ? 'is-leaving' : ''}`}>
      <p className="qh-intro-kicker">中醫文化・互動體驗</p>
      <h1 className="qh-intro-title">岐黃</h1>
      <p className="qh-intro-subtitle">循經取穴・銅人明堂</p>
      <p className="qh-intro-desc">
        以三維針灸銅人漫遊十四經絡，點選穴位，透視其所應之臟腑。
      </p>
      <button
        type="button"
        className="qh-intro-enter"
        onClick={enter}
        disabled={phase === 'entering'}
      >
        進入
      </button>
    </div>
  )
}
