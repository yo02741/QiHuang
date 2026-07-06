export type WuXing = 'wood' | 'fire' | 'earth' | 'metal' | 'water'

export type MeridianId =
  | 'LU' | 'LI' | 'ST' | 'SP' | 'HT' | 'SI' | 'BL'
  | 'KI' | 'PC' | 'TE' | 'LR' | 'GB' | 'CV' | 'GV'

export type OrganId =
  | 'lung' | 'largeIntestine' | 'stomach' | 'spleen' | 'heart' | 'smallIntestine'
  | 'bladder' | 'kidney' | 'pericardium' | 'sanjiao' | 'liver' | 'gallbladder'

export type SegmentId = 'upperArm' | 'forearm' | 'hand' | 'thigh' | 'calf' | 'foot'

/**
 * 身體錨點：所有雙側資料一律以「左側（+x）」撰寫，
 * 鏡射由 lib/anchors.ts 統一處理，元件不各自鏡射。
 */
export type BodyAnchor =
  /** 軀幹車削面：y 高度 + 方位角 az（0=正前，+ 往左），out 為離面法向偏移 */
  | { kind: 'torso'; y: number; az: number; out?: number }
  /** 頭部橢球面：polar 極角（0=頭頂百會），az 同上 */
  | { kind: 'head'; polar: number; az: number; out?: number }
  /** 四肢：沿肢段軸 t∈[0,1]，angle 為繞軸角（0 朝前），out 離面偏移 */
  | { kind: 'limb'; segment: SegmentId; t: number; angle: number; out?: number }
  /** 逃生口：直接給世界座標（指尖等特殊位置） */
  | { kind: 'point'; pos: [number, number, number] }

export interface Meridian {
  id: MeridianId
  name: string        // 手太陰肺經
  shortName: string   // 肺經
  element: WuXing     // 心包/三焦歸火
  color: string       // 由五行推導後存明碼
  bilateral: boolean  // 任督二脈為 false
  organIds: OrganId[] // 表裡臟腑配對
  description: string
  flowHour?: string   // 子午流注，如「寅時 03–05」
  path: BodyAnchor[]  // 風格化行經路線 waypoints
}

export interface Acupoint {
  id: string          // 'LI4'（=== code）
  meridianId: MeridianId
  name: string        // 合谷
  pinyin: string      // Hégǔ
  code: string        // LI4
  anchor: BodyAnchor
  location: string    // 定位（示意描述）
  functions: string[] // 主治/功效
  organIds: OrganId[] // 點選時發光的臟腑
}

export interface Organ {
  id: OrganId
  name: string
  type: 'zang' | 'fu' // 臟/腑（心包=zang、三焦=fu）
  element: WuXing
  pairedWith: OrganId
  description: string
}
