import type { BodyAnchor, SegmentId } from '@/data/types'

/**
 * ★ 骨度分寸（proportional bone measurement / B-cun）定位層。
 *
 * 依據：WHO《Standard Acupuncture Point Locations in the Western Pacific
 * Region》(2008) 的比例骨度法——穴位不是固定公分，而是把兩個解剖標誌之間
 * 的距離定為固定「寸」數，再按比例切分。如此同一穴在高矮不同的人身上
 * 物理距離不同、比例位置卻一致。
 *
 * 本層只是「授權層」：把「距某端幾寸」換算成既有 BodyAnchor 的沿軸比例 t
 * （四肢）或高度 y（軀幹前正中線），runtime 型別與解析器完全不動。
 * 好處是穴位位置從「目測估」變成「規則推導、可稽核」，且日後銅人若換成
 * 解剖比例網格，這些比例錨點會自動落在正確位置。
 *
 * 註：本銅人為風格化示意體，肢段幾何長度未必等於真人骨度；但因採用
 * 「比例」而非絕對長度，穴位仍落在該肢段的正確分數位置——這正是骨度法
 * 的精神。故此處定位為「規則正確」，非「臨床量測級精確」。
 */

/**
 * 四肢肢段的骨度分寸標準值（寸）。內外側標準不同者分列——
 * 小腿內側（脛骨內側髁下→內踝）13 寸、外側（膕橫紋→外踝）16 寸；
 * 大腿內側（恥骨上緣→股骨內上髁）18 寸、外側（股骨大轉子→膝中）19 寸。
 */
export const BONE_CUN = {
  forearm: 12, // 肘橫紋 → 腕橫紋
  calfLat: 16, // 膕橫紋 → 外踝尖（外/前側）
  calfMed: 13, // 脛骨內側髁下 → 內踝尖（內側）
  thighLat: 19, // 股骨大轉子 → 膝中（外/前側）
  thighMed: 18, // 恥骨聯合上緣 → 股骨內上髁（內側）
} as const

/** 定位參照：由哪個解剖標誌起算、屬哪一肢段、該段幾寸 */
type CunRef =
  | 'belowElbow' // 前臂，肘橫紋下（近端起算）
  | 'aboveWrist' // 前臂，腕橫紋上（遠端起算）
  | 'belowKneeLat' // 小腿外側，犢鼻/膝下（近端起算）
  | 'belowKneeMed' // 小腿內側，脛骨內側髁下（近端起算）
  | 'aboveAnkleLat' // 小腿外側，外踝上（遠端起算）
  | 'aboveAnkleMed' // 小腿內側，內踝上（遠端起算）
  | 'aboveKneeLat' // 大腿外側，膝上（遠端起算）
  | 'aboveKneeMed' // 大腿內側，膝上（遠端起算）

const REF_TABLE: Record<CunRef, { segment: SegmentId; total: number; fromDistal: boolean }> = {
  belowElbow: { segment: 'forearm', total: BONE_CUN.forearm, fromDistal: false },
  aboveWrist: { segment: 'forearm', total: BONE_CUN.forearm, fromDistal: true },
  belowKneeLat: { segment: 'calf', total: BONE_CUN.calfLat, fromDistal: false },
  belowKneeMed: { segment: 'calf', total: BONE_CUN.calfMed, fromDistal: false },
  aboveAnkleLat: { segment: 'calf', total: BONE_CUN.calfLat, fromDistal: true },
  aboveAnkleMed: { segment: 'calf', total: BONE_CUN.calfMed, fromDistal: true },
  aboveKneeLat: { segment: 'thigh', total: BONE_CUN.thighLat, fromDistal: true },
  aboveKneeMed: { segment: 'thigh', total: BONE_CUN.thighMed, fromDistal: true },
}

/** 寸 → 沿軸比例 t∈[0,1]（fromDistal 時由遠端起算；clamp 保護） */
export function cunToT(ref: CunRef, cun: number): number {
  const { total, fromDistal } = REF_TABLE[ref]
  const t = fromDistal ? (total - cun) / total : cun / total
  return Math.min(1, Math.max(0, t))
}

/**
 * 以骨度分寸定位四肢穴位。
 * @param ref   參照解剖標誌（決定肢段與該段寸長）
 * @param cun   距該標誌的寸數（穴位標準定位裡的「X 寸」）
 * @param angle 繞軸角（沿用既有語意：0 外側、+π/2 前、π 內側、-π/2 後）
 * @param out   離面法向偏移（省略則用解析器預設）
 *
 * 例：內關 PC6「腕橫紋上二寸」→ limbCun('aboveWrist', 2, 3.0)
 */
export function limbCun(ref: CunRef, cun: number, angle: number, out?: number): BodyAnchor {
  const { segment } = REF_TABLE[ref]
  const anchor: BodyAnchor = { kind: 'limb', segment, t: cunToT(ref, cun), angle }
  return out === undefined ? anchor : { ...anchor, out }
}

/**
 * 軀幹前正中線縱向骨度：以臍（神闕）為原點。
 * 標定：天突（胸骨上窩）→ 臍 = 17 寸（天突→歧骨 9 寸 + 歧骨→臍 8 寸）。
 * 銅人上天突 y=1.42、臍 y=1.02，故每寸 ≈ 0.0235 的 y。
 */
const NAVEL_Y = 1.02
const CUN_Y = (1.42 - NAVEL_Y) / 17

/** 臍上（正）/臍下（負）幾寸 → 銅人高度 y */
export function trunkCunY(cunFromNavel: number): number {
  return NAVEL_Y + cunFromNavel * CUN_Y
}

/**
 * 以縱向骨度定位軀幹穴位（多用於任/督脈與腹部穴）。
 * @param cunFromNavel 臍上為正、臍下為負的寸數
 * @param az           軀幹方位角（0 正前、π 正後）
 * @param out          離面偏移
 *
 * 例：關元 CV4「臍下三寸」→ torsoCun(-3, 0)
 */
export function torsoCun(cunFromNavel: number, az: number, out?: number): BodyAnchor {
  const anchor: BodyAnchor = { kind: 'torso', y: trunkCunY(cunFromNavel), az }
  return out === undefined ? anchor : { ...anchor, out }
}
