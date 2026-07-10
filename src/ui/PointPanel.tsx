import { useEffect, useState } from 'react'
import { ACUPOINTS, ACUPOINT_MAP } from '@/data/acupoints'
import { MERIDIAN_MAP } from '@/data/meridians'
import { ORGAN_MAP } from '@/data/organs'
import { SYMPTOM_MAP } from '@/data/symptoms'
import { COMBO_MAP } from '@/data/combos'
import { ELEMENT_NAMES } from '@/lib/wuxing'
import { useAppStore } from '@/store/useAppStore'

/**
 * 詳情面板（桌機右側滑入；行動裝置為底部抽屜），依選取狀態分頁：
 * 選穴 → 穴位詳情（含白話解、症狀 chips、複製連結）；
 * 配穴 → 組合說明 + 成員；症狀 → 對應穴位列表；
 * 僅選經絡（自由探索）→ 經絡簡介 + 該經穴位。
 * 滾動敘事中未選穴時，以導覽 spotlight 連動顯示（桌機）。
 */

/** 複製本穴的深連結（?point=<id>），回饋文字兩秒後復原 */
function CopyLinkButton({ pointId }: { pointId: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(t)
  }, [copied])
  return (
    <button
      type="button"
      className="qh-copy-link"
      onClick={() => {
        const url = `${location.origin}${location.pathname}?point=${pointId}`
        void navigator.clipboard?.writeText(url).then(() => setCopied(true))
      }}
    >
      {copied ? '✓ 已複製' : '⎘ 複製連結'}
    </button>
  )
}

export function PointPanel() {
  const mode = useAppStore((s) => s.mode)
  const selectedPointId = useAppStore((s) => s.selectedPointId)
  const spotlightPointId = useAppStore((s) => s.spotlightPointId)
  const selectedMeridianId = useAppStore((s) => s.selectedMeridianId)
  const selectedSymptomId = useAppStore((s) => s.selectedSymptomId)
  const selectedComboId = useAppStore((s) => s.selectedComboId)
  const { selectPoint, selectMeridian, selectSymptom, selectCombo } = useAppStore(
    (s) => s.actions,
  )

  // 導覽 spotlight：story 模式未選穴時，面板跟著點亮進度走
  const tour = mode === 'story' && !selectedPointId && Boolean(spotlightPointId)
  const effectiveId = selectedPointId ?? (tour ? spotlightPointId : null)

  const point = effectiveId ? ACUPOINT_MAP.get(effectiveId) : null
  const combo = !point && selectedComboId ? COMBO_MAP.get(selectedComboId) : null
  const symptom = !point && !combo && selectedSymptomId ? SYMPTOM_MAP.get(selectedSymptomId) : null
  const meridian = point
    ? MERIDIAN_MAP.get(point.meridianId)
    : selectedMeridianId
      ? MERIDIAN_MAP.get(selectedMeridianId)
      : null

  // story 模式只有穴位頁（經絡/症狀/配穴選單屬於自由探索）
  const open = Boolean(point || (mode === 'free' && (combo || symptom || meridian)))
  if (!open) return null

  const close = () => {
    if (point) selectPoint(null)
    else if (combo) selectCombo(null)
    else if (symptom) selectSymptom(null)
    else selectMeridian(null)
  }

  return (
    <aside className={`qh-panel ${tour ? 'qh-panel--tour' : ''}`} aria-live="polite">
      {!tour && (
        <button type="button" className="qh-panel-close" aria-label="關閉" onClick={close}>
          ×
        </button>
      )}

      {point && meridian ? (
        <>
          <div className="qh-panel-head">
            <h2 className="qh-panel-title">{point.name}</h2>
            <div className="qh-panel-meta">
              <span className="qh-panel-pinyin">{point.pinyin}</span>
              <span className="qh-panel-code">{point.code}</span>
              {!tour && <CopyLinkButton pointId={point.id} />}
            </div>
            <button
              type="button"
              className="qh-panel-meridian"
              style={{ borderColor: meridian.color }}
              onClick={() => selectPoint(null)}
            >
              <span className="qh-meridian-dot" style={{ background: meridian.color }} />
              {meridian.name}
            </button>
          </div>

          <section className="qh-panel-section">
            <h3>白話解</h3>
            <p className="qh-panel-plain">{point.plain}</p>
          </section>

          <section className="qh-panel-section">
            <h3>常見情境</h3>
            <div className="qh-panel-symptoms">
              {point.symptoms.map((id) => {
                const s = SYMPTOM_MAP.get(id)!
                return (
                  <button
                    key={id}
                    type="button"
                    className="qh-symptom-chip"
                    title={`看「${s.name}」的相關穴位`}
                    onClick={() => {
                      // 導覽中點症狀 → 切到自由探索再反查（症狀點亮屬 free 模式）
                      if (useAppStore.getState().mode === 'story') {
                        useAppStore.getState().actions.enterFree()
                      }
                      selectSymptom(id)
                    }}
                  >
                    {s.name}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="qh-panel-section">
            <h3>定位（示意）</h3>
            <p>{point.location}</p>
          </section>

          <section className="qh-panel-section">
            <h3>主治・功效</h3>
            <ul className="qh-panel-functions">
              {point.functions.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </section>

          <section className="qh-panel-section">
            <h3>所應臟腑</h3>
            {point.organIds.length ? (
              <div className="qh-panel-organs">
                {point.organIds.map((id) => {
                  const organ = ORGAN_MAP.get(id)!
                  return (
                    <span key={id} className="qh-organ-chip">
                      <b>{organ.name}</b>
                      <i>{ELEMENT_NAMES[organ.element]}・{organ.type === 'zang' ? '臟' : '腑'}</i>
                    </span>
                  )
                })}
              </div>
            ) : (
              <p className="qh-panel-dim">通調經脈，無特定臟腑對應。</p>
            )}
          </section>
        </>
      ) : combo ? (
        <>
          <div className="qh-panel-head">
            <h2 className="qh-panel-title qh-panel-title-sm">{combo.name}</h2>
            <div className="qh-panel-meta">
              <span className="qh-panel-code">經典配穴</span>
            </div>
          </div>
          <section className="qh-panel-section">
            <h3>為何搭配</h3>
            <p className="qh-panel-plain">{combo.plain}</p>
          </section>
          <section className="qh-panel-section">
            <h3>組合成員</h3>
            <div className="qh-panel-points">
              {combo.pointIds.map((id) => {
                const p = ACUPOINT_MAP.get(id)!
                return (
                  <button
                    key={id}
                    type="button"
                    className="qh-point-btn"
                    onClick={() => selectPoint(id, p.meridianId)}
                  >
                    <b>{p.name}</b>
                    <i>{p.code}</i>
                  </button>
                )
              })}
            </div>
          </section>
        </>
      ) : symptom ? (
        <>
          <div className="qh-panel-head">
            <h2 className="qh-panel-title qh-panel-title-sm">{symptom.name}</h2>
            <div className="qh-panel-meta">
              <span className="qh-panel-code">症狀反查・{symptom.group}</span>
            </div>
          </div>
          <section className="qh-panel-section">
            <h3>相關穴位</h3>
            <div className="qh-panel-points">
              {ACUPOINTS.filter((p) => p.symptoms.includes(symptom.id)).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="qh-point-btn"
                  onClick={() => selectPoint(p.id, p.meridianId)}
                >
                  <b>{p.name}</b>
                  <i>{p.code}</i>
                </button>
              ))}
            </div>
          </section>
          <section className="qh-panel-section">
            <p className="qh-panel-dim">點選穴位查看白話解與按法；內容僅供教育參考，非醫療建議。</p>
          </section>
        </>
      ) : meridian ? (
        <>
          <div className="qh-panel-head">
            <h2 className="qh-panel-title qh-panel-title-sm">{meridian.name}</h2>
            <div className="qh-panel-meta">
              <span className="qh-panel-code">
                {ELEMENT_NAMES[meridian.element]}行
                {meridian.flowHour ? `・${meridian.flowHour}` : ''}
              </span>
            </div>
          </div>
          <section className="qh-panel-section">
            <p>{meridian.description}</p>
          </section>
          <section className="qh-panel-section">
            <h3>本經穴位</h3>
            <div className="qh-panel-points">
              {ACUPOINTS.filter((p) => p.meridianId === meridian.id).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="qh-point-btn"
                  onClick={() => selectPoint(p.id, meridian.id)}
                >
                  <b>{p.name}</b>
                  <i>{p.code}</i>
                </button>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </aside>
  )
}
