import { Color } from 'three'
import type { MeridianId, WuXing } from '@/data/types'

/** 五行配色（陰經深、陽經亮）；任脈珠銀紫（陰脈之海）、督脈金（陽脈之海） */
export const MERIDIAN_COLORS: Record<MeridianId, string> = {
  LR: '#3FA47A', // 木・肝（陰）
  GB: '#55C48F', // 木・膽（陽）
  HT: '#E0453A', // 火・心（陰）
  SI: '#F06E52', // 火・小腸（陽）
  PC: '#C93756', // 火・心包（陰）
  TE: '#E8734A', // 火・三焦（陽）
  SP: '#D9A441', // 土・脾（陰）
  ST: '#E6B85C', // 土・胃（陽）
  LU: '#DDD6C7', // 金・肺（陰）
  LI: '#C9CDD1', // 金・大腸（陽）
  KI: '#2F5DA8', // 水・腎（陰）
  BL: '#4D7FD6', // 水・膀胱（陽）
  CV: '#B09FD8', // 任脈
  GV: '#E3B341', // 督脈
}

export const ELEMENT_NAMES: Record<WuXing, string> = {
  wood: '木',
  fire: '火',
  earth: '土',
  metal: '金',
  water: '水',
}

/** 顏色分量增亮至 >1（配合 toneMapped:false 讓 bloom 拾取） */
export function boost(hex: string, k: number): Color {
  return new Color(hex).multiplyScalar(k)
}
