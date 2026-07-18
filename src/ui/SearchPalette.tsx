import { useEffect, useMemo, useRef, useState } from 'react'
import { ACUPOINTS } from '@/data/acupoints'
import { MERIDIANS } from '@/data/meridians'
import { SYMPTOMS } from '@/data/symptoms'
import { useAppStore } from '@/store/useAppStore'
import type { MeridianId, SymptomId } from '@/data/types'

/**
 * 搜尋盤（command palette）：header 🔍 或按「/」開啟。
 * 可搜穴名／拼音（免聲調）／國際代碼／經絡／症狀，
 * 選定即關盤跳轉（story 模式先切自由探索，讓運鏡聚焦生效）。
 */

/** 去聲調小寫（Hégǔ → hegu），供拼音比對 */
const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

interface Hit {
  kind: 'point' | 'symptom' | 'meridian'
  id: string
  title: string
  sub: string
}

/** 靜態索引：每筆一個可比對字串包 */
const INDEX = (() => {
  const rows: { hit: Hit; keys: string[] }[] = []
  for (const p of ACUPOINTS) {
    rows.push({
      hit: { kind: 'point', id: p.id, title: p.name, sub: `${p.code}・${p.pinyin}` },
      keys: [p.name, fold(p.pinyin), p.code.toLowerCase()],
    })
  }
  for (const s of SYMPTOMS) {
    rows.push({
      hit: { kind: 'symptom', id: s.id, title: s.name, sub: `症狀・${s.group}` },
      keys: [s.name],
    })
  }
  for (const m of MERIDIANS) {
    rows.push({
      hit: { kind: 'meridian', id: m.id, title: m.shortName, sub: m.name },
      keys: [m.name, m.shortName, m.id.toLowerCase()],
    })
  }
  return rows
})()

const KIND_LABEL = { point: '穴位', symptom: '症狀', meridian: '經絡' } as const
const KIND_LIMIT = { point: 8, symptom: 4, meridian: 4 } as const

function search(q: string): Hit[] {
  const needle = fold(q.trim())
  if (!needle) return []
  const grouped: Record<Hit['kind'], Hit[]> = { point: [], symptom: [], meridian: [] }
  for (const { hit, keys } of INDEX) {
    if (grouped[hit.kind].length >= KIND_LIMIT[hit.kind]) continue
    if (keys.some((k) => k.includes(needle))) grouped[hit.kind].push(hit)
  }
  return [...grouped.point, ...grouped.symptom, ...grouped.meridian]
}

export function SearchPalette() {
  const open = useAppStore((s) => s.searchOpen)
  const { setSearchOpen, selectPoint, selectSymptom, selectMeridian, enterFree } = useAppStore(
    (s) => s.actions,
  )
  const [q, setQ] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const hits = useMemo(() => search(q), [q])

  // 開盤時聚焦輸入框並清空上次查詢
  useEffect(() => {
    if (open) {
      setQ('')
      setCursor(0)
      // 等 overlay 掛載完成
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  //「/」快捷鍵開盤（輸入框外）；Esc 關盤由 App 統一處理
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || useAppStore.getState().quizActive) return
      const el = e.target as HTMLElement
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return
      e.preventDefault()
      useAppStore.getState().actions.setSearchOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!open) return null

  const go = (hit: Hit) => {
    setSearchOpen(false)
    // story 模式先切自由探索：選穴運鏡與症狀/經絡點亮皆屬 free
    if (useAppStore.getState().mode === 'story') enterFree()
    if (hit.kind === 'point') {
      const p = ACUPOINTS.find((x) => x.id === hit.id)!
      selectPoint(p.id, p.meridianId)
    } else if (hit.kind === 'symptom') {
      selectSymptom(hit.id as SymptomId)
    } else {
      selectMeridian(hit.id as MeridianId)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(c + 1, hits.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    } else if (e.key === 'Enter' && hits[cursor]) {
      go(hits[cursor])
    }
  }

  return (
    <div className="qh-search-backdrop" onClick={() => setSearchOpen(false)}>
      <div className="qh-search" role="dialog" aria-label="搜尋" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="qh-search-input"
          placeholder="搜尋：穴名／拼音／代碼／經絡／症狀…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setCursor(0)
          }}
          onKeyDown={onKeyDown}
          aria-label="搜尋輸入"
        />
        {q.trim() !== '' && (
          <div className="qh-search-results">
            {hits.length === 0 && <p className="qh-search-empty">找不到「{q}」</p>}
            {hits.map((h, i) => (
              <button
                key={`${h.kind}-${h.id}`}
                type="button"
                className={`qh-search-hit ${i === cursor ? 'is-cursor' : ''}`}
                onMouseEnter={() => setCursor(i)}
                onClick={() => go(h)}
              >
                <span className="qh-search-kind">{KIND_LABEL[h.kind]}</span>
                <b>{h.title}</b>
                <i>{h.sub}</i>
              </button>
            ))}
          </div>
        )}
        <p className="qh-search-hint">↑↓ 移動・Enter 前往・Esc 關閉</p>
      </div>
    </div>
  )
}
