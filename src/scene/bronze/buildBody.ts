import {
  BufferGeometry,
  CylinderGeometry,
  LatheGeometry,
  Matrix4,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import {
  HEAD_SCALE,
  JOINT_RADII,
  LANDMARKS,
  SEGMENTS,
  TORSO_Z_SCALE,
  sampleTorsoProfile,
  type SegmentDef,
} from '@/lib/anatomy'

/**
 * ★ 程序化銅人：全部由 primitive 組裝、烘焙變換後合併成
 * 「單一 BufferGeometry」→ 單一 mesh、單一材質、單一 draw call，
 * 透視淡出時不會出現部件間的透明疊影。
 *
 * 右側肢體不用負縮放鏡射（會翻轉繞向/法線），而是直接以
 * x 取負的端點重新建構。
 */

const UP = new Vector3(0, 1, 0)

/** 起迄點間的漸縮圓柱（+Y 端 = start，radiusTop = rStart） */
function tube(start: Vector3, end: Vector3, rStart: number, rEnd: number): BufferGeometry {
  const dir = end.clone().sub(start)
  const len = dir.length()
  const geo = new CylinderGeometry(rStart, rEnd, len, 20, 1)
  const quat = new Quaternion().setFromUnitVectors(UP, dir.clone().normalize().negate())
  const mid = start.clone().lerp(end, 0.5)
  geo.applyMatrix4(new Matrix4().compose(mid, quat, new Vector3(1, 1, 1)))
  return geo
}

function ball(center: Vector3, radius: number, scale = new Vector3(1, 1, 1), quat = new Quaternion()): BufferGeometry {
  const geo = new SphereGeometry(radius, 24, 18)
  geo.applyMatrix4(new Matrix4().compose(center, quat, scale))
  return geo
}

const mirror = (p: Vector3) => new Vector3(-p.x, p.y, p.z)

/** 單側（左或右）的四肢 + 關節 + 手腳 */
function limbGeometries(flip: boolean): BufferGeometry[] {
  const L = (p: Vector3) => (flip ? mirror(p) : p.clone())
  const geoms: BufferGeometry[] = []

  const seg = (def: SegmentDef) =>
    tube(L(LANDMARKS[def.from]), L(LANDMARKS[def.to]), def.rStart, def.rEnd)

  geoms.push(seg(SEGMENTS.upperArm), seg(SEGMENTS.forearm), seg(SEGMENTS.thigh), seg(SEGMENTS.calf))

  // 斜方肌/鎖骨：頸根 → 肩，填補肩球與軀幹的縫隙
  geoms.push(tube(L(new Vector3(0.045, 1.415, -0.005)), L(LANDMARKS.shoulderL), 0.052, 0.05))

  // 關節填充球
  for (const [id, r] of Object.entries(JOINT_RADII)) {
    geoms.push(ball(L(LANDMARKS[id as keyof typeof LANDMARKS]), r!))
  }

  // 手：沿腕→指尖對齊的壓扁橢球（連指手套）
  {
    const wrist = L(LANDMARKS.wristL)
    const tip = L(LANDMARKS.handTipL)
    const dir = tip.clone().sub(wrist)
    const quat = new Quaternion().setFromUnitVectors(UP, dir.clone().normalize())
    const mid = wrist.clone().lerp(tip, 0.55)
    geoms.push(ball(mid, 1, new Vector3(0.03, 0.062, 0.02), quat))
  }

  // 腳：踝前方的拉長壓扁橢球，底面貼近臺座
  {
    const ankle = L(LANDMARKS.ankleL)
    const toe = L(LANDMARKS.toeL)
    const center = new Vector3(
      ankle.x + (toe.x - ankle.x) * 0.5,
      0.032,
      ankle.z + (toe.z - ankle.z) * 0.6,
    )
    geoms.push(ball(center, 1, new Vector3(0.044, 0.028, 0.1)))
  }

  return geoms
}

export function buildBodyGeometry(): BufferGeometry {
  const geoms: BufferGeometry[] = []

  // 軀幹：車削 + z 壓扁（烘進 geometry，mesh transform 保持 identity）
  const torso = new LatheGeometry(sampleTorsoProfile(64), 48)
  torso.scale(1, 1, TORSO_Z_SCALE)
  torso.computeVertexNormals()
  geoms.push(torso)

  // 頸
  geoms.push(
    (() => {
      const neck = new CylinderGeometry(0.048, 0.055, 0.09, 20)
      neck.translate(0, 1.455, -0.005)
      return neck
    })(),
  )

  // 頭：橢球（非均勻縮放後重算法線）
  {
    const head = new SphereGeometry(1, 32, 24)
    head.applyMatrix4(
      // clone：compose 不會改動 scale 參數，但避免共享參照的意外
      new Matrix4().compose(LANDMARKS.headCenter, new Quaternion(), HEAD_SCALE.clone()),
    )
    head.computeVertexNormals()
    geoms.push(head)
  }

  // 正反面辨識線索（僅正面有的浮雕，背面保持素淨）：
  // 鼻＝面前小橢球；耳＝兩側壓扁橢球；眉弓＝眼窩上緣的扁條；
  // 胸膛＝兩片胸肌浮雕；臍＝小腹圓凸
  geoms.push(ball(new Vector3(0, 1.572, 0.099), 1, new Vector3(0.013, 0.024, 0.016)))
  for (const sx of [1, -1]) {
    geoms.push(ball(new Vector3(sx * 0.082, 1.575, 0.002), 1, new Vector3(0.009, 0.03, 0.022)))
    geoms.push(ball(new Vector3(sx * 0.026, 1.615, 0.082), 1, new Vector3(0.02, 0.007, 0.01)))
    geoms.push(ball(new Vector3(sx * 0.055, 1.27, 0.082), 1, new Vector3(0.038, 0.045, 0.02)))
  }
  geoms.push(ball(new Vector3(0, 1.02, 0.092), 1, new Vector3(0.008, 0.008, 0.005)))

  geoms.push(...limbGeometries(false), ...limbGeometries(true))

  const merged = mergeGeometries(geoms, false)
  if (!merged) throw new Error('mergeGeometries 失敗：attribute 不一致')
  merged.computeBoundingSphere()
  return merged
}
