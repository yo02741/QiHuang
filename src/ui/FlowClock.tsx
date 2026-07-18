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
  const quizActive = useAppStore((s) => s.quizActive)
  const qiFlowPlaying = useAppStore((s) => s.qiFlowPlaying)
  const flowMeridianId = useAppStore((s) => s.flowMeridianId)
  const toggleQiFlow = useAppStore((s) => s.actions.toggleQiFlow)
  const [hour, setHour] = useState(() => new Date().getHours())

  // 每分鐘校時（時辰兩小時才換一次，分鐘級足夠）
  useEffect(() => {
    const t = setInterval(() => setHour(new Date().getHours()), 60_000)
    return () => clearInterval(t)
  }, [])

  if (mode !== 'free' || quizActive) return null

  const timeSlot = currentFlowSlot(hour)
  // 循經播放中：鐘面高亮跟隨氣流；否則跟隨真實時辰
  const activeSlot =
    qiFlowPlaying && flowMeridianId
      ? (FLOW_ORDER.find((s) => s.meridianId === flowMeridianId) ?? timeSlot)
      : timeSlot
  const activeMeridian = MERIDIAN_MAP.get(activeSlot.meridianId)!

  return (
    <div className={`qh-flowclock ${qiFlowPlaying ? 'is-flowing' : ''}`} aria-label="子午流注時辰鐘">
      <div className="qh-flowclock-ring">
        {FLOW_ORDER.map((slot) => {
          const angle = BRANCH_ANGLE(BRANCH_ORDER.indexOf(slot.branch))
          const x = Math.cos(angle) * RADIUS
          const y = Math.sin(angle) * RADIUS
          const meridian = MERIDIAN_MAP.get(slot.meridianId)!
          const isNow = slot.branch === activeSlot.branch
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
          title={
            qiFlowPlaying
              ? `循經導引中：${activeMeridian.name}`
              : `現在${activeSlot.branch}時，${activeMeridian.name}當令`
          }
          onClick={() =>
            selectMeridian(
              selectedMeridianId === activeSlot.meridianId ? null : activeSlot.meridianId,
            )
          }
        >
          <span className="qh-flowclock-label">{qiFlowPlaying ? '循經' : '當令'}</span>
          <span className="qh-flowclock-meridian" style={{ color: activeMeridian.color }}>
            {activeMeridian.shortName}
          </span>
        </button>
      </div>
      <button
        type="button"
        className={`qh-flow-play ${qiFlowPlaying ? 'is-playing' : ''}`}
        onClick={toggleQiFlow}
        aria-pressed={qiFlowPlaying}
        title="沿子午流注順序，讓「氣」依序循行十二經"
      >
        {qiFlowPlaying ? '❚❚ 暫停循經' : '▶ 循經導引'}
      </button>
    </div>
  )
}
