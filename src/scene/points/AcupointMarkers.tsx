import { useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useCursor } from '@react-three/drei'
import { Color, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three'
import { ACUPOINTS } from '@/data/acupoints'
import { MERIDIAN_MAP } from '@/data/meridians'
import { resolveAnchor, type Side } from '@/lib/anchors'
import { useAppStore } from '@/store/useAppStore'
import { RENDER_ORDER } from '@/lib/constants'
import type { MeridianId } from '@/data/types'

/**
 * 穴位標記：兩層 InstancedMesh —
 * 視覺層（小球 + instanceColor，休止金 / hover 增亮 / 選中經絡色 ×3.5 bloom）
 * 命中層（半徑 2.5 倍、材質不可見但可 raycast，掛 R3F pointer events）
 */

interface MarkerInstance {
  pointId: string
  meridianId: MeridianId
  side: Side
  position: Vector3
  baseColor: Color
}

const REST_GOLD = new Color('#D9B36C')
const VISUAL_R = 0.008
const HIT_R = 0.02

function buildInstances(): MarkerInstance[] {
  const list: MarkerInstance[] = []
  for (const p of ACUPOINTS) {
    const meridian = MERIDIAN_MAP.get(p.meridianId)!
    const sides: Side[] = meridian.bilateral ? ['L', 'R'] : ['L']
    for (const side of sides) {
      list.push({
        pointId: p.id,
        meridianId: p.meridianId,
        side,
        position: resolveAnchor(p.anchor, side).position,
        baseColor: new Color(meridian.color),
      })
    }
  }
  return list
}

export function AcupointMarkers() {
  const instances = useMemo(buildInstances, [])
  const visualRef = useRef<InstancedMesh>(null)
  const hitRef = useRef<InstancedMesh>(null)
  const [hovering, setHovering] = useState(false)
  useCursor(hovering)

  // 每 instance 的動畫快取（damp 用）
  const anim = useMemo(
    () => instances.map(() => ({ scale: 1, color: REST_GOLD.clone().multiplyScalar(0.55) })),
    [instances],
  )

  const tmpM = useMemo(() => new Matrix4(), [])
  const tmpQ = useMemo(() => new Quaternion(), [])
  const tmpS = useMemo(() => new Vector3(), [])
  const tmpC = useMemo(() => new Color(), [])

  useFrame((_, delta) => {
    const mesh = visualRef.current
    const hit = hitRef.current
    if (!mesh || !hit) return
    const { hoveredPointId, hoveredSide, selectedPointId, selectedMeridianId } =
      useAppStore.getState()

    const k = 1 - Math.exp(-delta / 0.12) // 統一的 damp 係數

    instances.forEach((inst, i) => {
      const isSelected = selectedPointId === inst.pointId
      const isHovered =
        hoveredPointId === inst.pointId && (inst.side === hoveredSide || isSelected)
      const dimmed =
        selectedMeridianId !== null && inst.meridianId !== selectedMeridianId

      let targetScale = 1
      tmpC.copy(inst.baseColor)
      if (isSelected) {
        targetScale = 2.4
        tmpC.multiplyScalar(3.5)
      } else if (isHovered) {
        targetScale = 1.8
        tmpC.copy(REST_GOLD).multiplyScalar(1.6)
      } else if (dimmed) {
        targetScale = 0.7
        tmpC.copy(REST_GOLD).multiplyScalar(0.15)
      } else {
        tmpC.copy(REST_GOLD).multiplyScalar(0.55)
      }

      const a = anim[i]
      a.scale += (targetScale - a.scale) * k
      a.color.lerp(tmpC, k)

      tmpS.setScalar(a.scale)
      tmpM.compose(inst.position, tmpQ, tmpS)
      mesh.setMatrixAt(i, tmpM)
      mesh.setColorAt(i, a.color)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  // 命中層矩陣只需設定一次
  const hitMatrices = useMemo(() => {
    const m = new Matrix4()
    return (mesh: InstancedMesh | null) => {
      if (!mesh) return
      instances.forEach((inst, i) => {
        m.makeTranslation(inst.position.x, inst.position.y, inst.position.z)
        mesh.setMatrixAt(i, m)
      })
      mesh.instanceMatrix.needsUpdate = true
      hitRef.current = mesh
    }
  }, [instances])

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (e.instanceId === undefined) return
    const inst = instances[e.instanceId]
    useAppStore.getState().actions.hoverPoint(inst.pointId, inst.side)
    setHovering(true)
  }
  const onOut = () => {
    useAppStore.getState().actions.hoverPoint(null)
    setHovering(false)
  }
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.instanceId === undefined) return
    const inst = instances[e.instanceId]
    useAppStore.getState().actions.selectPoint(inst.pointId, inst.meridianId)
  }

  return (
    <group>
      <instancedMesh
        ref={visualRef}
        args={[undefined, undefined, instances.length]}
        renderOrder={RENDER_ORDER.markers}
        frustumCulled={false}
      >
        <sphereGeometry args={[VISUAL_R, 12, 12]} />
        <meshBasicMaterial toneMapped={false} transparent depthWrite={false} />
      </instancedMesh>
      <instancedMesh
        ref={hitMatrices}
        args={[undefined, undefined, instances.length]}
        onPointerOver={onOver}
        onPointerOut={onOut}
        onClick={onClick}
        frustumCulled={false}
      >
        <sphereGeometry args={[HIT_R, 8, 8]} />
        <meshBasicMaterial visible={false} />
      </instancedMesh>
    </group>
  )
}
