import { CatmullRomCurve3, Vector2, Vector3 } from 'three'

/**
 * ★ 單一事實來源：銅人的所有比例都定義在這裡。
 *
 * 座標約定：
 * - 人立於 y=0，總高 1.70，面向 +z（預設鏡頭方向）
 * - 解剖「左」= +x（畫面上出現在右側）
 * - 雙側資料一律以左側撰寫，鏡射由 lib/anchors.ts 統一處理
 * - 軀幹方位角 az：自 +z（正前）起算，正向轉往 +x（人的左側）；
 *   正前 0、左脅 π/2、正後 π
 */

const v = (x: number, y: number, z: number) => new Vector3(x, y, z)

export const LANDMARKS = {
  crown: v(0, 1.7, 0.01),
  headCenter: v(0, 1.585, 0.01),
  chin: v(0, 1.48, 0.06),
  neckBase: v(0, 1.43, -0.01),
  shoulderL: v(0.2, 1.385, 0),
  elbowL: v(0.275, 1.13, 0.015),
  wristL: v(0.345, 0.895, 0.035),
  handTipL: v(0.385, 0.78, 0.05),
  hipL: v(0.085, 0.88, 0),
  kneeL: v(0.075, 0.47, 0.01),
  ankleL: v(0.07, 0.075, -0.005),
  toeL: v(0.075, 0.02, 0.09),
} satisfies Record<string, Vector3>

export type LandmarkId = keyof typeof LANDMARKS

/** 軀幹車削輪廓 (r, y)：臀 → 腰 → 胸 → 肩頸，經 CatmullRom 平滑 */
export const TORSO_PROFILE: ReadonlyArray<readonly [number, number]> = [
  [0.001, 0.83],
  [0.105, 0.85],
  [0.15, 0.91],
  [0.142, 0.98],
  [0.122, 1.05],
  [0.128, 1.12],
  [0.15, 1.22],
  [0.158, 1.3],
  [0.15, 1.36],
  [0.12, 1.4],
  [0.07, 1.43],
  [0.05, 1.47],
]

/** 軀幹前後壓扁比（橢圓截面：x 半徑 = r，z 半徑 = r × 此值） */
export const TORSO_Z_SCALE = 0.72

export const TORSO_Y_MIN = TORSO_PROFILE[0][1]
export const TORSO_Y_MAX = TORSO_PROFILE[TORSO_PROFILE.length - 1][1]

/** 頭部橢球半徑（x, y, z），中心在 LANDMARKS.headCenter */
export const HEAD_SCALE = v(0.082, 0.112, 0.092)

/** 由輪廓曲線取樣的軀幹車削 Vector2 點列（LatheGeometry 與半徑查表共用同一條曲線） */
export function sampleTorsoProfile(samples = 64): Vector2[] {
  const curve = new CatmullRomCurve3(
    TORSO_PROFILE.map(([r, y]) => v(r, y, 0)),
    false,
    'centripetal',
  )
  return curve.getPoints(samples).map((p) => new Vector2(Math.max(p.x, 0.001), p.y))
}

// 256 筆 y → r 查表（輪廓的 y 單調遞增，r(y) 定義良好）
const LOOKUP = sampleTorsoProfile(256)

/** 軀幹在高度 y 的車削半徑（超出範圍時 clamp 至端點值） */
export function torsoRadiusAt(y: number): number {
  if (y <= LOOKUP[0].y) return LOOKUP[0].x
  const last = LOOKUP[LOOKUP.length - 1]
  if (y >= last.y) return last.x
  // 線性搜尋足矣（每次呼叫僅在啟動期的資料解析中發生）
  for (let i = 1; i < LOOKUP.length; i++) {
    if (LOOKUP[i].y >= y) {
      const a = LOOKUP[i - 1]
      const b = LOOKUP[i]
      const t = (y - a.y) / (b.y - a.y)
      return a.x + (b.x - a.x) * t
    }
  }
  return last.x
}

export interface SegmentDef {
  from: LandmarkId
  to: LandmarkId
  rStart: number
  rEnd: number
}

/** 四肢肢段：端點地標 + 起迄半徑（身體網格與 limb anchor 共用） */
export const SEGMENTS = {
  upperArm: { from: 'shoulderL', to: 'elbowL', rStart: 0.042, rEnd: 0.034 },
  forearm: { from: 'elbowL', to: 'wristL', rStart: 0.034, rEnd: 0.026 },
  hand: { from: 'wristL', to: 'handTipL', rStart: 0.026, rEnd: 0.012 },
  thigh: { from: 'hipL', to: 'kneeL', rStart: 0.062, rEnd: 0.045 },
  calf: { from: 'kneeL', to: 'ankleL', rStart: 0.045, rEnd: 0.028 },
  foot: { from: 'ankleL', to: 'toeL', rStart: 0.03, rEnd: 0.018 },
} satisfies Record<string, SegmentDef>

/** 關節填充球半徑（避免「散裝膠囊人」的斷裂感） */
export const JOINT_RADII: Partial<Record<LandmarkId, number>> = {
  shoulderL: 0.058,
  elbowL: 0.036,
  wristL: 0.028,
  hipL: 0.064,
  kneeL: 0.048,
  ankleL: 0.03,
}
