import { ACUPOINTS, ACUPOINT_MAP } from '@/data/acupoints'
import { MERIDIAN_MAP } from '@/data/meridians'
import { ORGAN_MAP } from '@/data/organs'
import { ELEMENT_NAMES } from '@/lib/wuxing'
import { useAppStore } from '@/store/useAppStore'

/**
 * 詳情面板（桌機右側滑入；行動裝置為底部抽屜）：
 * 選穴 → 穴位詳情；僅選經絡（自由探索）→ 經絡簡介 + 該經穴位列表。
 * 滾動敘事中未選穴時，以「導覽 spotlight」連動顯示最新點亮的穴位
 * （僅桌機；不觸發透視與運鏡）。
 */
export function PointPanel() {
  const mode = useAppStore((s) => s.mode)
  const selectedPointId = useAppStore((s) => s.selectedPointId)
  const spotlightPointId = useAppStore((s) => s.spotlightPointId)
  const selectedMeridianId = useAppStore((s) => s.selectedMeridianId)
  const { selectPoint, selectMeridian } = useAppStore((s) => s.actions)

  // 導覽 spotlight：story 模式未選穴時，面板跟著點亮進度走
  const tour = mode === 'story' && !selectedPointId && Boolean(spotlightPointId)
  const effectiveId = selectedPointId ?? (tour ? spotlightPointId : null)

  const point = effectiveId ? ACUPOINT_MAP.get(effectiveId) : null
  const meridian = point
    ? MERIDIAN_MAP.get(point.meridianId)
    : selectedMeridianId
      ? MERIDIAN_MAP.get(selectedMeridianId)
      : null

  // story 模式不顯示「僅經絡」面板（經絡選單屬於自由探索）
  const open = Boolean(point || (meridian && mode === 'free'))
  if (!open) return null

  return (
    <aside className={`qh-panel ${tour ? 'qh-panel--tour' : ''}`} aria-live="polite">
      {!tour && (
        <button
          type="button"
          className="qh-panel-close"
          aria-label="關閉"
          onClick={() => (point ? selectPoint(null) : selectMeridian(null))}
        >
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
