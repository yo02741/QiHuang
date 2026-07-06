import { BufferGeometry, SphereGeometry, TorusGeometry, TorusKnotGeometry } from 'three'
import type { OrganId } from '@/data/types'

/**
 * 風格化臟腑幾何：全部由 primitive 構成，置於軀幹腔內（|z| ≲ 0.07）。
 * 解剖右側 = -x（面向 +z 的人）；造型為藝術示意。
 */

export interface OrganPart {
  organId: OrganId
  geometry: () => BufferGeometry
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
}

const sphere = () => new SphereGeometry(1, 24, 18)

export const ORGAN_PARTS: OrganPart[] = [
  // 心：胸腔中偏左，微傾
  { organId: 'heart', geometry: sphere, position: [0.02, 1.24, 0.02], rotation: [0, 0, -0.4], scale: [0.045, 0.055, 0.04] },
  // 肺 ×2：心兩側的長橢球
  { organId: 'lung', geometry: sphere, position: [0.055, 1.24, 0], scale: [0.038, 0.075, 0.045] },
  { organId: 'lung', geometry: sphere, position: [-0.055, 1.24, 0], scale: [0.038, 0.075, 0.045] },
  // 肝：右脅下的扁楔（-x 為解剖右）
  { organId: 'liver', geometry: sphere, position: [-0.045, 1.13, 0.02], rotation: [0, 0, 0.25], scale: [0.06, 0.035, 0.045] },
  // 膽：肝下小梨形
  { organId: 'gallbladder', geometry: sphere, position: [-0.03, 1.1, 0.045], scale: [0.014, 0.022, 0.014] },
  // 脾：左脅下小扁球
  { organId: 'spleen', geometry: sphere, position: [0.06, 1.12, -0.01], scale: [0.03, 0.018, 0.02] },
  // 胃：左上腹傾斜豆形
  { organId: 'stomach', geometry: sphere, position: [0.03, 1.15, 0.03], rotation: [0, 0, 0.5], scale: [0.035, 0.05, 0.03] },
  // 腎 ×2：腰部後側
  { organId: 'kidney', geometry: sphere, position: [0.05, 1.05, -0.055], scale: [0.02, 0.035, 0.018] },
  { organId: 'kidney', geometry: sphere, position: [-0.05, 1.05, -0.055], scale: [0.02, 0.035, 0.018] },
  // 膀胱：下腹小球
  { organId: 'bladder', geometry: sphere, position: [0, 0.92, 0.03], scale: [0.028, 0.024, 0.026] },
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
