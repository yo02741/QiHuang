import { Vector3 } from 'three'
import type { BodyAnchor } from '@/data/types'
import {
  HEAD_SCALE,
  LANDMARKS,
  SEGMENTS,
  TORSO_Z_SCALE,
  torsoRadiusAt,
} from './anatomy'

/**
 * ★ BodyAnchor → 世界座標解析器。
 *
 * 所有 anchor 一律先以「左側」語意解析，右側由 mirror（x 取負）得出 —
 * 這保證雙側穴位（如左右合谷）的繞軸角語意完全一致。
 *
 * limb anchor 的 angle 語意（由 refUp=(0,0,1) 的 frame 建構而來）：
 *   0 = 外側（+x 方向）、+π/2 = 前（+z）、π = 內側、-π/2 = 後
 */

export interface ResolvedAnchor {
  position: Vector3
  normal: Vector3
}

export type Side = 'L' | 'R'

const DEFAULT_OUT = 0.006
const REF_UP = new Vector3(0, 0, 1)

function resolveLeft(anchor: BodyAnchor): ResolvedAnchor {
  switch (anchor.kind) {
    case 'torso': {
      const { y, az } = anchor
      const r = torsoRadiusAt(y)
      const a = r
      const b = r * TORSO_Z_SCALE
      const sin = Math.sin(az)
      const cos = Math.cos(az)
      const p = new Vector3(a * sin, y, b * cos)
      // 橢圓截面法線（忽略 y 向斜率，對標記/線的偏移足夠精確）
      const normal = new Vector3(sin / a, 0, cos / b).normalize()
      return {
        position: p.addScaledVector(normal, anchor.out ?? DEFAULT_OUT),
        normal,
      }
    }
    case 'head': {
      const { polar, az } = anchor
      const st = Math.sin(polar)
      const d = new Vector3(st * Math.sin(az), Math.cos(polar), st * Math.cos(az))
      const p = LANDMARKS.headCenter.clone().add(d.clone().multiply(HEAD_SCALE))
      const normal = new Vector3(
        d.x / (HEAD_SCALE.x * HEAD_SCALE.x),
        d.y / (HEAD_SCALE.y * HEAD_SCALE.y),
        d.z / (HEAD_SCALE.z * HEAD_SCALE.z),
      ).normalize()
      return {
        position: p.addScaledVector(normal, anchor.out ?? DEFAULT_OUT),
        normal,
      }
    }
    case 'limb': {
      const seg = SEGMENTS[anchor.segment]
      const start = LANDMARKS[seg.from]
      const end = LANDMARKS[seg.to]
      const w = end.clone().sub(start).normalize()
      const u = new Vector3().crossVectors(REF_UP, w).normalize()
      const vv = new Vector3().crossVectors(w, u)
      const radial = u
        .clone()
        .multiplyScalar(Math.cos(anchor.angle))
        .addScaledVector(vv, Math.sin(anchor.angle))
      const c = start.clone().lerp(end, anchor.t)
      const r = seg.rStart + (seg.rEnd - seg.rStart) * anchor.t
      return {
        position: c.addScaledVector(radial, r + (anchor.out ?? DEFAULT_OUT)),
        normal: radial,
      }
    }
    case 'point': {
      const p = new Vector3(...anchor.pos)
      // point 型 anchor 無面可依，法線取「離身體中軸向外」的水平方向
      const normal = new Vector3(p.x, 0, p.z)
      if (normal.lengthSq() < 1e-6) normal.set(0, 0, 1)
      return { position: p, normal: normal.normalize() }
    }
  }
}

/** 解析 anchor；side='R' 時將位置與法線的 x 取負（完整鏡射） */
export function resolveAnchor(anchor: BodyAnchor, side: Side = 'L'): ResolvedAnchor {
  const res = resolveLeft(anchor)
  if (side === 'R') {
    res.position.x *= -1
    res.normal.x *= -1
  }
  return res
}
