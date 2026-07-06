import { useAppStore } from '@/store/useAppStore'

export function Header() {
  const phase = useAppStore((s) => s.phase)
  return (
    <header className={`qh-header ${phase === 'explore' ? 'is-visible' : ''}`}>
      <div className="qh-header-brand">
        <span className="qh-header-logo">岐黃</span>
        <span className="qh-header-sub">QiHuang・針灸銅人明堂</span>
      </div>
    </header>
  )
}
