import { STORY_SECTIONS, lightThreshold, type SectionId } from '@/data/sections'

/**
 * ★ 手機步進式導覽的站點表：把滾動敘事離散化成「一步一穴」。
 *
 * 每一步對應一個 rawProgress 目標（既有的相機/點亮/spotlight 管線全由
 * rawProgress 驅動，步進只是用動畫把它移到下一個門檻），首尾各一步
 * landing / finale。目標值以 stepRaw() 於執行當下計算（點亮門檻隨視口
 * 寬窄不同）。桌機滾動模式不使用本表。
 */

export interface TourStep {
  sectionIndex: number
  sectionId: SectionId
  pointId: string | null // landing / finale 為 null
  order: number          // 章內順位
  count: number          // 章內總穴數
}

export const TOUR_STEPS: TourStep[] = []

STORY_SECTIONS.forEach((s, si) => {
  if (s.pointIds.length === 0) {
    TOUR_STEPS.push({ sectionIndex: si, sectionId: s.id, pointId: null, order: 0, count: 0 })
    return
  }
  s.pointIds.forEach((pointId, oi) => {
    TOUR_STEPS.push({
      sectionIndex: si,
      sectionId: s.id,
      pointId,
      order: oi,
      count: s.pointIds.length,
    })
  })
})

/** 該步的 rawProgress 目標（略過點亮門檻一點點，保證成為 spotlight） */
export function stepRaw(step: TourStep): number {
  if (!step.pointId) {
    // landing 停在晃動區間內；finale 停在停駐段
    return step.sectionIndex === 0 ? 0.3 : step.sectionIndex + 0.5
  }
  return step.sectionIndex + lightThreshold(step.sectionIndex, step.order, step.count) + 0.02
}

/** 某章的第一步（章節選單跳轉用） */
export function firstStepOfSection(sectionId: SectionId): number {
  const i = TOUR_STEPS.findIndex((st) => st.sectionId === sectionId)
  return i === -1 ? 0 : i
}
