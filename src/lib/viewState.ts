/**
 * 相機視角的共享可變狀態：CameraRig 每幀寫入，DOM 端（ViewCompass）
 * 以 rAF 讀取——不經過 React/zustand，零重繪成本。
 */
export const viewState = {
  /** 相機繞主體的方位角（rad，未正規化） */
  azimuth: 0,
}

export type Facing = 'front' | 'left' | 'right' | 'back'

/** 方位角 → 面向哪一側（front = 看到銅人正面） */
export function facingOf(azimuth: number): Facing {
  // 正規化到 (-π, π]
  const az = Math.atan2(Math.sin(azimuth), Math.cos(azimuth))
  const a = Math.abs(az)
  if (a < Math.PI / 4) return 'front'
  if (a > (3 * Math.PI) / 4) return 'back'
  // 相機在 +x（銅人解剖左）側 → 看到左側
  return az > 0 ? 'left' : 'right'
}

export const FACING_LABELS: Record<Facing, string> = {
  front: '正面',
  left: '左側',
  right: '右側',
  back: '背面',
}
