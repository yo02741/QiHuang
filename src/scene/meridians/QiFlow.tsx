import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three'
import { useMeridianCurves } from './useMeridianCurves'
import { useAppStore } from '@/store/useAppStore'
import { FLOW_ORDER } from '@/data/flowClock'
import { MERIDIAN_MAP } from '@/data/meridians'
import { QIFLOW, RENDER_ORDER } from '@/lib/constants'
import type { MeridianId } from '@/data/types'

/**
 * 經絡氣流循行動畫：一顆發光「氣」彗星沿當前經絡路徑行走，
 * 依子午流注（FLOW_ORDER）12 經一條接一條循環，雙側同步。
 *
 * 高頻的行進進度（t、orderIdx）留在 ref；只有「換經絡」這種低頻事件
 * 回寫 store.flowMeridianId，供經絡線高亮與時辰鐘指針跟隨。
 * 彗星本體＝單一 InstancedMesh（頭亮尾暗的彗尾），停播時 visible=false。
 */

const HEAD_COLOR = '#FFF3D0' // 彗頭近白金

/** 沿等距取樣的 points 取參數 u∈[0,1] 的位置 */
function sampleAt(points: Vector3[], u: number, out: Vector3): Vector3 {
  const n = points.length - 1
  const f = Math.min(Math.max(u, 0), 1) * n
  const i = Math.floor(f)
  const a = points[i]
  const b = points[Math.min(i + 1, n)]
  return out.copy(a).lerp(b, f - i)
}

export function QiFlow() {
  const curves = useMeridianCurves()
  // meridianId → 兩側取樣點（12 正經皆 bilateral）
  const curveMap = useMemo(() => {
    const m = new Map<MeridianId, { L?: Vector3[]; R?: Vector3[] }>()
    for (const c of curves) {
      const e = m.get(c.meridianId) ?? {}
      e[c.side] = c.points
      m.set(c.meridianId, e)
    }
    return m
  }, [curves])

  const meshRef = useRef<InstancedMesh>(null)
  const orderIdx = useRef(0)
  const t = useRef(0)
  const wasPlaying = useRef(false)

  const tmp = useMemo(
    () => ({
      m: new Matrix4(),
      q: new Quaternion(),
      s: new Vector3(),
      p: new Vector3(),
      base: new Color(),
      head: new Color(HEAD_COLOR),
      col: new Color(),
    }),
    [],
  )

  const COUNT = QIFLOW.trail * 2

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh) return
    const { qiFlowPlaying } = useAppStore.getState()

    if (!qiFlowPlaying) {
      if (mesh.visible) mesh.visible = false
      wasPlaying.current = false
      return
    }
    // 剛起播：從肺經（FLOW_ORDER[0]）從頭開始
    if (!wasPlaying.current) {
      wasPlaying.current = true
      orderIdx.current = 0
      t.current = 0
      useAppStore.getState().actions.setFlowMeridian(FLOW_ORDER[0].meridianId)
    }
    mesh.visible = true

    // 前進；走完一條 → 交棒下一條經絡
    t.current += delta / QIFLOW.secondsPerMeridian
    if (t.current >= 1) {
      t.current -= 1
      orderIdx.current = (orderIdx.current + 1) % FLOW_ORDER.length
      useAppStore.getState().actions.setFlowMeridian(FLOW_ORDER[orderIdx.current].meridianId)
    }

    const meridianId = FLOW_ORDER[orderIdx.current].meridianId
    const entry = curveMap.get(meridianId)
    tmp.base.set(MERIDIAN_MAP.get(meridianId)!.color)

    let inst = 0
    for (const pts of [entry?.L, entry?.R]) {
      if (!pts) continue
      for (let k = 0; k < QIFLOW.trail; k++) {
        const fall = 1 - k / QIFLOW.trail // 頭 1 → 尾 0
        sampleAt(pts, t.current - k * QIFLOW.tailStep, tmp.p)
        tmp.s.setScalar(QIFLOW.headRadius * (0.32 + 0.68 * fall))
        tmp.m.compose(tmp.p, tmp.q, tmp.s)
        mesh.setMatrixAt(inst, tmp.m)
        // 頭近白金、尾轉經絡色；亮度頭高尾低（>1 才被 bloom 拾取）
        tmp.col.copy(tmp.base).lerp(tmp.head, fall).multiplyScalar(0.7 + 2.6 * fall)
        mesh.setColorAt(inst, tmp.col)
        inst++
      }
    }
    // 保險：未用到的 instance 縮到 0（12 正經皆雙側，正常會填滿）
    for (; inst < COUNT; inst++) {
      tmp.s.setScalar(0)
      tmp.m.compose(tmp.p, tmp.q, tmp.s)
      mesh.setMatrixAt(inst, tmp.m)
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, COUNT]}
      renderOrder={RENDER_ORDER.markers + 1}
      frustumCulled={false}
      visible={false}
    >
      <sphereGeometry args={[1, 12, 12]} />
      <meshBasicMaterial toneMapped={false} transparent depthWrite={false} />
    </instancedMesh>
  )
}
