import {
  BufferGeometry,
  CylinderGeometry,
  Matrix4,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { LANDMARKS } from '@/lib/anatomy'

/**
 * ★ 參數化「示意骨架」：與銅身共用同一份 LANDMARKS，故長骨恰好落在
 * 各肢段軸上——骨架層打開時，穴位（骨度分寸定位）自然貼在對應骨頭上，
 * 「腕上二寸」得以標在橈/尺骨之間演示。
 *
 * 非醫學精細模型，是可讀的教育示意：顱、脊椎串珠、肋弓、骨盆、
 * 上臂肱骨、前臂橈尺二骨、股骨、小腿脛腓二骨 + 簡化手足。
 */

const UP = new Vector3(0, 1, 0)
const REF = new Vector3(0, 0, 1)
const mirror = (p: Vector3) => new Vector3(-p.x, p.y, p.z)

function tube(a: Vector3, b: Vector3, rA: number, rB = rA): BufferGeometry {
  const dir = b.clone().sub(a)
  const len = Math.max(dir.length(), 1e-4)
  const g = new CylinderGeometry(rA, rB, len, 12, 1)
  const q = new Quaternion().setFromUnitVectors(UP, dir.clone().normalize().negate())
  g.applyMatrix4(new Matrix4().compose(a.clone().lerp(b, 0.5), q, new Vector3(1, 1, 1)))
  return g
}

function ball(c: Vector3, r: number, scale = new Vector3(1, 1, 1), q = new Quaternion()): BufferGeometry {
  const g = new SphereGeometry(r, 14, 10)
  g.applyMatrix4(new Matrix4().compose(c, q, scale))
  return g
}

/** 肢段軸的側向單位向量（用來把橈尺/脛腓二骨左右分開） */
function sideDir(a: Vector3, b: Vector3): Vector3 {
  const w = b.clone().sub(a).normalize()
  return new Vector3().crossVectors(REF, w).normalize()
}

/** 平行雙骨（前臂橈尺、小腿脛腓）：沿側向 ±sep 各一根 */
function twoBones(a: Vector3, b: Vector3, r: number, sep: number): BufferGeometry[] {
  const u = sideDir(a, b).multiplyScalar(sep)
  return [
    tube(a.clone().add(u), b.clone().add(u), r, r * 0.85),
    tube(a.clone().sub(u), b.clone().sub(u), r * 0.82, r * 0.72),
  ]
}

function limbBones(flip: boolean): BufferGeometry[] {
  const L = (p: Vector3) => (flip ? mirror(p) : p.clone())
  const g: BufferGeometry[] = []
  const sh = L(LANDMARKS.shoulderL)
  const el = L(LANDMARKS.elbowL)
  const wr = L(LANDMARKS.wristL)
  const ht = L(LANDMARKS.handTipL)
  const hp = L(LANDMARKS.hipL)
  const kn = L(LANDMARKS.kneeL)
  const an = L(LANDMARKS.ankleL)
  const to = L(LANDMARKS.toeL)

  // 上肢：肱骨 + 橈尺二骨
  g.push(tube(sh, el, 0.02, 0.015))
  g.push(...twoBones(el, wr, 0.011, 0.011))
  // 腕骨團 + 掌骨（簡化）
  g.push(ball(wr.clone().lerp(ht, 0.18), 0.016))
  g.push(tube(wr.clone().lerp(ht, 0.2), ht, 0.009, 0.004))

  // 下肢：股骨（含股骨頭）+ 脛腓二骨
  g.push(ball(hp, 0.026))
  g.push(tube(hp, kn, 0.024, 0.019))
  g.push(ball(kn.clone().add(new Vector3(0, 0.01, 0.02)), 0.017)) // 髕骨
  g.push(...twoBones(kn, an, 0.015, 0.012))
  // 跗骨團 + 蹠骨
  g.push(ball(an.clone().lerp(to, 0.2), 0.02))
  g.push(tube(an.clone().lerp(to, 0.25), to, 0.012, 0.005))
  return g
}

export function buildSkeletonGeometry(): BufferGeometry {
  const g: BufferGeometry[] = []

  // 顱 + 下頜
  g.push(ball(LANDMARKS.headCenter.clone().add(new Vector3(0, 0.012, -0.004)), 1, new Vector3(0.07, 0.088, 0.076)))
  g.push(ball(new Vector3(0, 1.5, 0.03), 1, new Vector3(0.045, 0.03, 0.05)))

  // 脊椎：頸根 → 骶，沿背側中線串珠（略帶前後 S 彎）
  {
    const top = 1.44
    const bottom = 0.86
    const n = 18
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const y = top + (bottom - top) * t
      // 頸(前) → 胸(後) → 腰(前)：以 z 微調示意曲度
      const z = -0.018 + 0.02 * Math.sin(t * Math.PI) - 0.012 * (1 - t)
      const r = 0.014 + 0.006 * t // 下段椎體較大
      g.push(ball(new Vector3(0, y, z), 1, new Vector3(r, 0.013, r)))
    }
  }

  // 胸廓：胸骨 + 兩側肋弓（幾道由脊向前下彎的弧）
  g.push(tube(new Vector3(0, 1.34, 0.088), new Vector3(0, 1.18, 0.086), 0.012, 0.01)) // 胸骨
  for (const sx of [1, -1]) {
    const levels = [1.33, 1.28, 1.22, 1.16, 1.1]
    levels.forEach((y, i) => {
      const spread = 0.13 + i * 0.006
      const front = new Vector3(sx * 0.05, y - 0.03, 0.075)
      const side = new Vector3(sx * spread, y, -0.01)
      const back = new Vector3(sx * 0.03, y, -0.05)
      g.push(tube(back, side, 0.006))
      g.push(tube(side, front, 0.006, 0.005))
    })
  }

  // 鎖骨：胸骨柄 → 肩
  for (const sx of [1, -1]) {
    g.push(tube(new Vector3(0, 1.36, 0.07), new Vector3(sx * 0.16, 1.4, 0.02), 0.008, 0.007))
  }

  // 骨盆：髖環（扁環）+ 兩髂骨翼
  g.push(ball(new Vector3(0, 0.86, 0), 1, new Vector3(0.12, 0.05, 0.09)))
  {
    const pelvis = new TorusGeometry(0.1, 0.016, 8, 24)
    pelvis.rotateX(Math.PI / 2)
    pelvis.scale(1, 1, 0.8)
    pelvis.translate(0, 0.83, 0)
    g.push(pelvis)
  }
  for (const sx of [1, -1]) {
    g.push(ball(new Vector3(sx * 0.1, 0.9, -0.01), 1, new Vector3(0.03, 0.06, 0.055)))
  }

  g.push(...limbBones(false), ...limbBones(true))

  const merged = mergeGeometries(g, false)
  if (!merged) throw new Error('skeleton mergeGeometries 失敗')
  merged.computeVertexNormals()
  merged.computeBoundingSphere()
  return merged
}
