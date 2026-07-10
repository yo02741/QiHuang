import { useAppStore } from '@/store/useAppStore'

export function Header() {
  const mode = useAppStore((s) => s.mode)
  const sectionIndex = useAppStore((s) => s.sectionIndex)
  const enterStory = useAppStore((s) => s.actions.enterStory)
  // landing 大標在畫面中央時隱藏品牌角標，捲入章節後浮現
  const visible = mode === 'free' || sectionIndex > 0
  return (
    <header className={`qh-header ${visible ? 'is-visible' : ''}`}>
      <div className="qh-header-brand">
        <span className="qh-header-logo">岐黃</span>
        <span className="qh-header-sub">QiHuang・針灸銅人明堂</span>
      </div>
      {mode === 'free' && (
        <button
          type="button"
          className="qh-header-story"
          onClick={() => {
            enterStory()
            window.scrollTo({ top: 0 })
          }}
        >
          ↺ 重看導覽
        </button>
      )}
    </header>
  )
}
