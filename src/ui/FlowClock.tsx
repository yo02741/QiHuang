import { useEffect, useState } from 'react'
import { FLOW_ORDER, currentFlowSlot } from '@/data/flowClock'
import { MERIDIAN_MAP } from '@/data/meridians'
import { useAppStore } from '@/store/useAppStore'

/**
 * 子午流注時辰鐘（自由探索右下角）：十二地支環形排列（午時在頂、
 * 子時在底，如日晷），當令時辰金色高亮，中央顯示當令經絡。
 * 點任一時辰 → 選取該時辰經絡。每分鐘校時一次。
 */

const RADIUS = 52 // 時辰字距中心的半徑（px）

/** 地支在鐘面上的固定次序（子=0 起算），午（index 6）在正上方 */
const BRANCH_ANGLE = (branchIndex: number) => ((branchIndex - 6) * 30 - 90) * (Math.PI / 180)

const BRANCH_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

export function FlowClock() {
  const mode = useAppStore((s) => s.mode)
  const selectedMeridianId = useAppStore((s) => s.selectedMeridianId)
  const selectMeridian = useAppStore((s) => s.actions.selectMeridian)
  const [hour, setHour] = useState(() => new Date().getHours())

  // 每分鐘校時（時辰兩小時才換一次，分鐘級足夠）
  useEffect(() => {
    const t = setInterval(() => setHour(new Date().getHours()), 60_000)
    return () => clearInterval(t)
  }, [])

  if (mode !== 'free') return null

  const current = currentFlowSlot(hour)
  const currentMeridian = MERIDIAN_MAP.get(current.meridianId)!

  return (
    <div className="qh-flowclock" aria-label="子午流注時辰鐘">
      <div className="qh-flowclock-ring">
        {FLOW_ORDER.map((slot) => {
          const angle = BRANCH_ANGLE(BRANCH_ORDER.indexOf(slot.branch))
          const x = Math.cos(angle) * RADIUS
          const y = Math.sin(angle) * RADIUS
          const meridian = MERIDIAN_MAP.get(slot.meridianId)!
          const isNow = slot.branch === current.branch
          const isSelected = selectedMeridianId === slot.meridianId
          return (
            <button
              key={slot.branch}
              type="button"
              className={`qh-flowclock-branch ${isNow ? 'is-now' : ''} ${isSelected ? 'is-selected' : ''}`}
              style={{ transform: `translate(${x}px, ${y}px)` }}
              title={`${slot.branch}時 ${String(slot.startHour).padStart(2, '0')}–${String(slot.endHour).padStart(2, '0')}・${meridian.shortName}`}
              onClick={() =>
                selectMeridian(selectedMeridianId === slot.meridianId ? null : slot.meridianId)
              }
            >
              {slot.branch}
            </button>
          )
        })}
        <button
          type="button"
          className="qh-flowclock-center"
          title={`現在${current.branch}時，${currentMeridian.name}當令`}
          onClick={() =>
            selectMeridian(
              selectedMeridianId === current.meridianId ? null : current.meridianId,
            )
          }
        >
          <span className="qh-flowclock-label">當令</span>
          <span className="qh-flowclock-meridian" style={{ color: currentMeridian.color }}>
            {currentMeridian.shortName}
          </span>
        </button>
      </div>
    </div>
  )
}
