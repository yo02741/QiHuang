import { MERIDIANS } from '@/data/meridians'
import { ELEMENT_NAMES } from '@/lib/wuxing'
import { useAppStore } from '@/store/useAppStore'

/** 十四經絡選擇列表（桌機左側直欄；行動裝置為水平 chip bar） */
export function MeridianList() {
  const phase = useAppStore((s) => s.phase)
  const selectedMeridianId = useAppStore((s) => s.selectedMeridianId)
  const selectMeridian = useAppStore((s) => s.actions.selectMeridian)

  return (
    <nav
      className={`qh-meridians ${phase === 'explore' ? 'is-visible' : ''}`}
      aria-label="經絡選擇"
    >
      <button
        type="button"
        className={`qh-meridian-btn ${selectedMeridianId === null ? 'is-active' : ''}`}
        onClick={() => selectMeridian(null)}
      >
        <span className="qh-meridian-dot" style={{ background: 'var(--gold)' }} />
        <span className="qh-meridian-name">全部經絡</span>
      </button>
      {MERIDIANS.map((m) => (
        <button
          key={m.id}
          type="button"
          className={`qh-meridian-btn ${selectedMeridianId === m.id ? 'is-active' : ''}`}
          onClick={() => selectMeridian(selectedMeridianId === m.id ? null : m.id)}
          title={m.name}
        >
          <span className="qh-meridian-dot" style={{ background: m.color }} />
          <span className="qh-meridian-name">{m.shortName}</span>
          <span className="qh-meridian-element">{ELEMENT_NAMES[m.element]}</span>
        </button>
      ))}
    </nav>
  )
}
