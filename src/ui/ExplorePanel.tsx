import { useState } from 'react'
import { MERIDIANS } from '@/data/meridians'
import { SYMPTOMS } from '@/data/symptoms'
import { COMBOS } from '@/data/combos'
import { ELEMENT_NAMES } from '@/lib/wuxing'
import { useAppStore } from '@/store/useAppStore'
import type { MeridianId, SymptomId } from '@/data/types'

/**
 * 自由探索的探索選單：
 * 桌機＝左側直欄三 tab（經絡／症狀／配穴）；
 * 行動裝置＝底部三顆原生下拉選單（開啟即系統選單，好點好選）。
 * 兩種呈現同時渲染、CSS 依視口切換。三類選取互斥（store 內建清除）。
 */

type Tab = 'meridian' | 'symptom' | 'combo'

/** 症狀依分組整理（optgroup 用） */
const SYMPTOM_GROUPS = SYMPTOMS.reduce<{ group: string; items: typeof SYMPTOMS }[]>(
  (acc, s) => {
    const last = acc[acc.length - 1]
    if (last?.group === s.group) last.items.push(s)
    else acc.push({ group: s.group, items: [s] })
    return acc
  },
  [],
)

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
      {/* 行動裝置：三顆原生下拉選單（CSS 於桌機隱藏） */}
      <div className="qh-explore-selects">
        <select
          value={selectedMeridianId ?? ''}
          onChange={(e) => selectMeridian((e.target.value || null) as MeridianId | null)}
          aria-label="選擇經絡"
        >
          <option value="">經絡…</option>
          {MERIDIANS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.shortName}（{ELEMENT_NAMES[m.element]}）
            </option>
          ))}
        </select>
        <select
          value={selectedSymptomId ?? ''}
          onChange={(e) => selectSymptom((e.target.value || null) as SymptomId | null)}
          aria-label="選擇症狀"
        >
          <option value="">症狀…</option>
          {SYMPTOM_GROUPS.map((g) => (
            <optgroup key={g.group} label={g.group}>
              {g.items.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <select
          value={selectedComboId ?? ''}
          onChange={(e) => selectCombo(e.target.value || null)}
          aria-label="選擇配穴"
        >
          <option value="">配穴…</option>
          {COMBOS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

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
