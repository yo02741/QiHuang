import {
  BufferGeometry,
  LatheGeometry,
  SphereGeometry,
  TorusGeometry,
  TorusKnotGeometry,
  Vector2,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { OrganId } from '@/data/types'

/**
 * 風格化臟腑幾何：全部由 primitive 塑形（單球 → 複合形/車削/圓環弧），
 * 置於軀幹腔內（|z| ≲ 0.07）。解剖右側 = -x（面向 +z 的人）；造型為藝術示意。
 *
 * 形狀以「單位空間」定義（約 ±1），實際大小交給 OrganPart.scale——
 * 材質是加法混合光暈，複合形的內部接縫不會顯形。
 */

export interface OrganPart {
  organId: OrganId
  geometry: () => BufferGeometry
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
}

const sphere = () => new SphereGeometry(1, 24, 18)

const merge = (...geos: BufferGeometry[]) => {
  const merged = mergeGeometries(geos, false)
  if (!merged) throw new Error('organGeometry merge 失敗')
  return merged
}

/** 心：寬圓心底 + 朝左下的心尖（倒垂桃形） */
const heartShape = () => {
  const base = new SphereGeometry(1, 24, 18)
  base.scale(1, 0.92, 0.9)
  const apex = new SphereGeometry(0.58, 18, 14)
  apex.translate(0.42, -0.72, 0.08) // 心尖朝解剖左（+x）下方
  return merge(base, apex)
}

/** 肺：上尖下寬的錐狀葉（車削） */
const lungShape = () => {
  const profile = [
    [0.03, -1.0], [0.3, -0.92], [0.52, -0.62], [0.6, -0.15],
    [0.52, 0.35], [0.32, 0.75], [0.05, 1.0],
  ].map(([r, y]) => new Vector2(r, y))
  return new LatheGeometry(profile, 20)
}

/** 肝：右葉厚大 + 往中線收薄的左葉（楔形雙葉） */
const liverShape = () => {
  const right = new SphereGeometry(1, 24, 18)
  right.scale(1, 0.62, 0.8)
  const left = new SphereGeometry(0.62, 18, 14)
  left.scale(1, 0.55, 0.7)
  left.translate(0.95, 0.08, 0.05)
  return merge(right, left)
}

/** 膽：頸細身圓的梨形 */
const gallbladderShape = () => {
  const body = new SphereGeometry(1, 18, 14)
  const neck = new SphereGeometry(0.5, 14, 10)
  neck.translate(0.15, 0.95, 0)
  return merge(body, neck)
}

/** 胃：彎曲的 J 形囊袋（粗管圓環弧） */
const stomachShape = () => new TorusGeometry(1, 0.62, 14, 28, 2.5)

/** 腎：豆形（開口朝內的圓環弧＝腎門凹陷） */
const kidneyShape = () => new TorusGeometry(1, 0.68, 12, 24, 3.9)

/** 膀胱：上窄下圓的水袋 */
const bladderShape = () => {
  const body = new SphereGeometry(1, 20, 16)
  const top = new SphereGeometry(0.55, 14, 10)
  top.translate(0, 0.85, 0)
  return merge(body, top)
}

export const ORGAN_PARTS: OrganPart[] = [
  // 心：胸腔中偏左，心尖朝左下
  { organId: 'heart', geometry: heartShape, position: [0.015, 1.245, 0.02], rotation: [0, 0, -0.35], scale: [0.036, 0.042, 0.034] },
  // 肺 ×2：心兩側的錐狀葉（上尖下寬）
  { organId: 'lung', geometry: lungShape, position: [0.055, 1.24, 0], rotation: [0, 0, -0.06], scale: [0.062, 0.075, 0.07] },
  { organId: 'lung', geometry: lungShape, position: [-0.055, 1.24, 0], rotation: [0, 0, 0.06], scale: [0.062, 0.075, 0.07] },
  // 肝：右脅下厚楔形雙葉（-x 為解剖右），左葉伸向中線
  { organId: 'liver', geometry: liverShape, position: [-0.048, 1.13, 0.02], rotation: [0, 0, 0.2], scale: [0.048, 0.05, 0.045] },
  // 膽：肝下小梨形，頸朝上貼肝
  { organId: 'gallbladder', geometry: gallbladderShape, position: [-0.03, 1.095, 0.045], rotation: [0, 0, -0.3], scale: [0.012, 0.016, 0.012] },
  // 脾：左脅下扁豆
  { organId: 'spleen', geometry: sphere, position: [0.06, 1.12, -0.01], rotation: [0, 0, 0.5], scale: [0.03, 0.016, 0.02] },
  // 胃：左上腹的 J 形囊袋（弧口朝右下接十二指腸）
  { organId: 'stomach', geometry: stomachShape, position: [0.028, 1.15, 0.03], rotation: [0.15, 0, -2.2], scale: [0.032, 0.036, 0.026] },
  // 腎 ×2：腰部後側豆形，腎門（弧口）朝內
  { organId: 'kidney', geometry: kidneyShape, position: [0.05, 1.05, -0.055], rotation: [0, 0, -1.85], scale: [0.014, 0.017, 0.013] },
  { organId: 'kidney', geometry: kidneyShape, position: [-0.05, 1.05, -0.055], rotation: [0, 0, Math.PI + 1.85], scale: [0.014, 0.017, 0.013] },
  // 膀胱：下腹水袋
  { organId: 'bladder', geometry: bladderShape, position: [0, 0.915, 0.03], scale: [0.024, 0.02, 0.022] },
  // 大腸：繞臍的馬蹄環（開口朝下）
  {
    organId: 'largeIntestine',
    geometry: () => new TorusGeometry(0.055, 0.016, 10, 40, 4.8),
    position: [0, 1.02, 0.01],
    rotation: [0, 0, -0.83],
    scale: [1, 1, 0.6],
  },
  // 小腸：環中蜷曲的結
  {
    organId: 'smallIntestine',
    geometry: () => new TorusKnotGeometry(0.035, 0.012, 64, 8, 2, 3),
    position: [0, 1.0, 0.02],
    scale: [1, 0.8, 0.5],
  },
  // 心包：包覆心的薄殼
  { organId: 'pericardium', geometry: sphere, position: [0.02, 1.24, 0.02], rotation: [0, 0, -0.4], scale: [0.055, 0.065, 0.05] },
  // 三焦：上中下三個抽象腔區
  { organId: 'sanjiao', geometry: sphere, position: [0, 1.25, 0], scale: [0.11, 0.09, 0.07] },
  { organId: 'sanjiao', geometry: sphere, position: [0, 1.06, 0], scale: [0.1, 0.08, 0.065] },
  { organId: 'sanjiao', geometry: sphere, position: [0, 0.92, 0], scale: [0.09, 0.07, 0.06] },
]

/** 各臟腑的標籤錨點（代表位置；雙側器官取單側） */
export const ORGAN_LABEL_ANCHORS: Record<OrganId, [number, number, number]> = {
  heart: [0.015, 1.245, 0.02],
  lung: [-0.055, 1.24, 0],
  liver: [-0.048, 1.13, 0.02],
  gallbladder: [-0.03, 1.095, 0.045],
  spleen: [0.06, 1.12, -0.01],
  stomach: [0.028, 1.15, 0.03],
  kidney: [0.05, 1.05, -0.055],
  bladder: [0, 0.915, 0.03],
  largeIntestine: [0.045, 1.06, 0.01],
  smallIntestine: [0, 1.0, 0.02],
  pericardium: [0.02, 1.24, 0.02],
  sanjiao: [0, 1.06, 0],
}

/** 臟腑五行對應色（取其陰經/本經色） */
export const ORGAN_COLORS: Record<OrganId, string> = {
  lung: '#DDD6C7',
  largeIntestine: '#C9CDD1',
  stomach: '#E6B85C',
  spleen: '#D9A441',
  heart: '#E0453A',
  smallIntestine: '#F06E52',
  bladder: '#4D7FD6',
  kidney: '#2F5DA8',
  pericardium: '#C93756',
  sanjiao: '#E8734A',
  liver: '#3FA47A',
  gallbladder: '#55C48F',
}
