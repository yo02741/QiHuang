import type { MeridianId } from './types'

/**
 * 子午流注：十二時辰 ↔ 十二經當令對映（任督二脈不入時辰輪）。
 * meridians.ts 的 flowHour 為展示字串，此表才是機器可用的對映。
 */

export interface FlowSlot {
  meridianId: MeridianId
  branch: string      // 地支時辰名
  startHour: number   // 起始鐘點（含）
  endHour: number     // 結束鐘點（不含）
}

export const FLOW_ORDER: FlowSlot[] = [
  { meridianId: 'LU', branch: '寅', startHour: 3, endHour: 5 },
  { meridianId: 'LI', branch: '卯', startHour: 5, endHour: 7 },
  { meridianId: 'ST', branch: '辰', startHour: 7, endHour: 9 },
  { meridianId: 'SP', branch: '巳', startHour: 9, endHour: 11 },
  { meridianId: 'HT', branch: '午', startHour: 11, endHour: 13 },
  { meridianId: 'SI', branch: '未', startHour: 13, endHour: 15 },
  { meridianId: 'BL', branch: '申', startHour: 15, endHour: 17 },
  { meridianId: 'KI', branch: '酉', startHour: 17, endHour: 19 },
  { meridianId: 'PC', branch: '戌', startHour: 19, endHour: 21 },
  { meridianId: 'TE', branch: '亥', startHour: 21, endHour: 23 },
  { meridianId: 'GB', branch: '子', startHour: 23, endHour: 1 },
  { meridianId: 'LR', branch: '丑', startHour: 1, endHour: 3 },
]

/** 目前鐘點（0–23）→ 當令時辰槽 */
export function currentFlowSlot(hour: number): FlowSlot {
  const slot = FLOW_ORDER.find((s) =>
    s.startHour < s.endHour
      ? hour >= s.startHour && hour < s.endHour
      : hour >= s.startHour || hour < s.endHour, // 跨午夜（子時 23–1）
  )
  return slot ?? FLOW_ORDER[0]
}
