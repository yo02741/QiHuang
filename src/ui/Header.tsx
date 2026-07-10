import { useAppStore } from '@/store/useAppStore'

const NARROW_QUERY = '(max-width: 768px)'

export function Header() {
  const mode = useAppStore((s) => s.mode)
  const sectionIndex = useAppStore((s) => s.sectionIndex)
  const enterStory = useAppStore((s) => s.actions.enterStory)
  const setTourStep = useAppStore((s) => s.actions.setTourStep)
  // landing 大標在畫面中央時隱藏品牌角標，捲入章節後浮現
  const visible = mode === 'free' || sectionIndex > 0

  // 回首頁：free 先切回敘事；窄視口（步進導覽）跳回第 0 站，桌機捲回頂
  const goHome = () => {
    const narrow = window.matchMedia(NARROW_QUERY).matches
    if (useAppStore.getState().mode === 'free') {
      enterStory()
      if (!narrow) window.scrollTo({ top: 0 })
    }
    if (narrow) setTourStep(0)
    else window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <header className={`qh-header ${visible ? 'is-visible' : ''}`}>
      <button type="button" className="qh-header-brand" onClick={goHome} title="回到首頁">
        <span className="qh-header-logo">岐黃</span>
        <span className="qh-header-sub">QiHuang・針灸銅人明堂</span>
      </button>
      {mode === 'free' && (
        <button type="button" className="qh-header-story" onClick={goHome}>
          ↺ 重看導覽
        </button>
      )}
    </header>
  )
}
