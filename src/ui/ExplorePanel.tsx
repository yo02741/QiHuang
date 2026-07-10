import { useState } from 'react'
import { MERIDIANS } from '@/data/meridians'
import { SYMPTOMS } from '@/data/symptoms'
import { COMBOS } from '@/data/combos'
import { ELEMENT_NAMES } from '@/lib/wuxing'
import { useAppStore } from '@/store/useAppStore'

/**
 * 自由探索的左側選單（桌機直欄／行動裝置底部 chip bar）：
 * 三個 tab——經絡（十四經）、症狀（日常症狀反查）、配穴（經典組合）。
 * 三類選取互斥（store actions 內建清除），點亮邏輯在 AcupointMarkers。
 */

type Tab = 'meridian' | 'symptom' | 'combo'

const TABS: { id: Tab; label: string }[] = [
  { id: 'meridian', label: '經絡' },
  { id: 'symptom', label: '症狀' },
  { id: 'combo', label: '配穴' },
]

export function ExplorePanel() {
  const mode = useAppStore((s) => s.mode)
  const selectedMeridianId = useAppStore((s) => s.selectedMeridianId)
  const selectedSymptomId = useAppStore((s) => s.selectedSymptomId)
  const selectedComboId = useAppStore((s) => s.selectedComboId)
  const { selectMeridian, selectSymptom, selectCombo } = useAppStore((s) => s.actions)
  const [tab, setTab] = useState<Tab>('meridian')

  if (mode !== 'free') return null

  // 症狀依分組排列（詞彙表已按組排序）
  let lastGroup = ''

  return (
    <nav className="qh-meridians is-visible qh-explore" aria-label="探索選單">
      <div className="qh-explore-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`qh-explore-tab ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'meridian' && (
        <>
          <button
            type="button"
            className={`qh-meridian-btn ${selectedMeridianId === null && !selectedSymptomId && !selectedComboId ? 'is-active' : ''}`}
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
        </>
      )}

      {tab === 'symptom' &&
        SYMPTOMS.map((s) => {
          const header = s.group !== lastGroup ? s.group : null
          lastGroup = s.group
          return (
            <div key={s.id} className="qh-symptom-row">
              {header && <div className="qh-explore-group">{header}</div>}
              <button
                type="button"
                className={`qh-meridian-btn ${selectedSymptomId === s.id ? 'is-active' : ''}`}
                onClick={() => selectSymptom(selectedSymptomId === s.id ? null : s.id)}
              >
                <span className="qh-meridian-name">{s.name}</span>
              </button>
            </div>
          )
        })}

      {tab === 'combo' &&
        COMBOS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`qh-meridian-btn ${selectedComboId === c.id ? 'is-active' : ''}`}
            onClick={() => selectCombo(selectedComboId === c.id ? null : c.id)}
            title={c.pointIds.join(' + ')}
          >
            <span className="qh-meridian-dot" style={{ background: 'var(--gold-soft)' }} />
            <span className="qh-meridian-name">{c.name}</span>
            <span className="qh-meridian-element">{c.pointIds.length}穴</span>
          </button>
        ))}
    </nav>
  )
}
