/**
 * ★ 滾動進度 → 相機姿勢的純函式層（無 three 依賴，可無頭驗證）。
 *
 * 姿勢以球座標表示：target + azimuth/polar/distance。
 * azimuth 存「連續實數」（可累計圈數）：section 之間直接線性插值，
 * 數值本身就是作者指定的旋轉方向與圈數，不需要最短角邏輯。
 *
 * rawProgress 定義（由 StorySections 量測）：
 *   Σ_i clamp((視口中心線 - section_i 頂端) / section_i 高度, 0, 1)
 * 即「整數部分 = 已完全越過中心線的 section 數、小數部分 = 當前 section
 * 越過中心線的比例」。section i 的段內進度 u∈[0,DWELL_START] 做
 * 前一姿勢 → 本姿勢的 smoothstep 過渡，之後停駐（點亮與微互動窗口）。
 */

export interface CameraPose {
  target: readonly [number, number, number]
  azimuth: number // 連續實數（累計圈數）
  polar: number   // 0=正上方俯視，π/2=水平
  distance: number
}

/** 段內前 40% 做運鏡過渡，其餘停駐 */
export const DWELL_START = 0.4

const smoothstep = (t: number) => t * t * (3 - 2 * t)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function lerpPose(a: CameraPose, b: CameraPose, t: number): CameraPose {
  return {
    target: [
      lerp(a.target[0], b.target[0], t),
      lerp(a.target[1], b.target[1], t),
      lerp(a.target[2], b.target[2], t),
    ],
    azimuth: lerp(a.azimuth, b.azimuth, t),
    polar: lerp(a.polar, b.polar, t),
    distance: lerp(a.distance, b.distance, t),
  }
}

/**
 * rawProgress ∈ [0, poses.length-1]（超界自動 clamp）→ 插值後姿勢。
 * transitionEnds：各段過渡結束的進度比例（省略時全段用 DWELL_START）。
 */
export function evaluatePose(
  poses: readonly CameraPose[],
  rawProgress: number,
  transitionEnds?: readonly number[],
): CameraPose {
  const last = poses.length - 1
  const raw = Math.min(Math.max(rawProgress, 0), last + 0.999)
  const i = Math.min(Math.floor(raw), last)
  if (i === 0) return poses[0]
  const u = raw - i
  const end = transitionEnds?.[i] ?? DWELL_START
  const t = smoothstep(Math.min(u / end, 1))
  return lerpPose(poses[i - 1], poses[i], t)
}

/** 球座標姿勢 → 相機世界座標（three.js Spherical 約定：azimuth 0 = +z） */
export function poseToCamera(pose: CameraPose): {
  position: [number, number, number]
  target: [number, number, number]
} {
  const [tx, ty, tz] = pose.target
  const sp = Math.sin(pose.polar)
  return {
    position: [
      tx + pose.distance * sp * Math.sin(pose.azimuth),
      ty + pose.distance * Math.cos(pose.polar),
      tz + pose.distance * sp * Math.cos(pose.azimuth),
    ],
    target: [tx, ty, tz],
  }
}

/**
 * 相機實際姿勢 → 球座標 pose（focus 復位接回滾動運鏡用）。
 * azimuth 反解會落在 (-π,π]，以 referenceAzimuth 展開到最近的圈，
 * 讓後續阻尼追蹤不會繞遠路。
 */
export function extractPose(
  position: readonly [number, number, number],
  target: readonly [number, number, number],
  referenceAzimuth: number,
): CameraPose {
  const dx = position[0] - target[0]
  const dy = position[1] - target[1]
  const dz = position[2] - target[2]
  const distance = Math.max(Math.hypot(dx, dy, dz), 1e-6)
  const polar = Math.acos(Math.min(Math.max(dy / distance, -1), 1))
  let azimuth = Math.atan2(dx, dz)
  azimuth += 2 * Math.PI * Math.round((referenceAzimuth - azimuth) / (2 * Math.PI))
  return { target: [target[0], target[1], target[2]], azimuth, polar, distance }
}

/** 阻尼追蹤的可變姿勢（useFrame 熱路徑重複使用，避免每幀配置） */
export interface MutablePose {
  target: [number, number, number]
  azimuth: number
  polar: number
  distance: number
}

export function copyPose(from: CameraPose, into: MutablePose): void {
  into.target[0] = from.target[0]
  into.target[1] = from.target[1]
  into.target[2] = from.target[2]
  into.azimuth = from.azimuth
  into.polar = from.polar
  into.distance = from.distance
}
