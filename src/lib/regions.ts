import type { Acupoint } from '@/data/types'

/**
 * ★ 穴位 → 身體部位（滾動敘事章節）的單一分類來源。
 *
 * 部位不存在資料欄位裡，而是由 anchor 幾何推導（head 的 polar/az、
 * torso 的 y/az、limb 的 segment），少數邊界穴與 point 型 anchor
 * 由 REGION_OVERRIDES 人工指定。validate-data.ts 會斷言 67 穴全覆蓋。
 */

export type RegionId =
  | 'face-front'
  | 'face-side'
  | 'crown'
  | 'occiput'
  | 'neck'
  | 'upper-limb'
  | 'chest'
  | 'back'
  | 'abdomen'
  | 'lumbar'
  | 'lower-limb'
  | 'foot'

/** point 型 anchor（無幾何可推導）與邊界穴的人工指定 */
export const REGION_OVERRIDES: Record<string, RegionId> = {
  HT1: 'upper-limb', // 極泉：腋窩正中，歸上肢章
  GB21: 'neck',      // 肩井：肩上，歸頸項章
}

export function regionOf(point: Pick<Acupoint, 'id' | 'anchor'>): RegionId {
  const override = REGION_OVERRIDES[point.id]
  if (override) return override

  const a = point.anchor
  switch (a.kind) {
    case 'head': {
      if (a.polar < 0.75) return 'crown'
      const az = Math.abs(a.az)
      if (az >= 2.0) return 'occiput'
      return az < 0.6 ? 'face-front' : 'face-side'
    }
    case 'torso': {
      if (a.y >= 1.4) return 'neck' // 大椎 1.42、廉泉 1.455；俞府 1.385 仍屬胸
      if (Math.abs(a.az) > Math.PI / 2) return a.y >= 1.08 ? 'back' : 'lumbar'
      return a.y >= 1.16 ? 'chest' : 'abdomen'
    }
    case 'limb': {
      if (a.segment === 'foot') return 'foot'
      if (a.segment === 'thigh' || a.segment === 'calf') return 'lower-limb'
      return 'upper-limb' // upperArm / forearm / hand
    }
    case 'point':
      throw new Error(`point 型 anchor 必須列入 REGION_OVERRIDES：${point.id}`)
  }
}

/** 依部位分組（保持傳入順序） */
export function pointsByRegion(
  points: ReadonlyArray<Pick<Acupoint, 'id' | 'anchor'>>,
): Map<RegionId, string[]> {
  const map = new Map<RegionId, string[]>()
  for (const p of points) {
    const region = regionOf(p)
    const list = map.get(region)
    if (list) list.push(p.id)
    else map.set(region, [p.id])
  }
  return map
}
