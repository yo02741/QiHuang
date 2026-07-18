import { useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useCursor } from '@react-three/drei'
import { Color, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three'
import { ACUPOINTS } from '@/data/acupoints'
import { MERIDIAN_MAP } from '@/data/meridians'
import { COMBOS } from '@/data/combos'
import { STORY_SECTIONS, lightThreshold } from '@/data/sections'
import { resolveAnchor, type Side } from '@/lib/anchors'
import { useAppStore } from '@/store/useAppStore'
import { RENDER_ORDER } from '@/lib/constants'
import type { MeridianId } from '@/data/types'

/**
 * 穴位標記：兩層 InstancedMesh —
 * 視覺層（小球 + instanceColor，休止金 / hover 增亮 / 選中經絡色 ×3.5 bloom）
 * 命中層（半徑 2.5 倍、材質不可見但可 raycast，掛 R3F pointer events）
 *
 * story 模式（未選穴時）：當前章的穴位隨 sectionProgress 逐一點亮
 * （經絡色 ×2.8 進 bloom），其餘章節暗化——重用既有 damp 動畫做出
 * 「一顆顆亮起」的節奏。點亮門檻公式與 SectionPointLabels 一致。
 */

/** 症狀 / 配穴 → 對應穴位集合（free 模式點亮用，避免每幀重建） */
const SYMPTOM_POINTS = new Map<string, Set<string>>()
for (const p of ACUPOINTS) {
  for (const s of p.symptoms) {
    let set = SYMPTOM_POINTS.get(s)
    if (!set) SYMPTOM_POINTS.set(s, (set = new Set()))
    set.add(p.id)
  }
}
const COMBO_POINTS = new Map(COMBOS.map((c) => [c.id, new Set(c.pointIds)]))

/** pointId → 所屬章節與點亮順位（門檻於每幀以 lightThreshold 計算，隨視口寬窄變動） */
const SECTION_LIGHT = new Map<string, { section: number; order: number; count: number }>()
/** 無穴位的章節（landing / finale）：全部標記回休止金，不做暗化 */
const NEUTRAL_SECTIONS = new Set<number>()
STORY_SECTIONS.forEach((s, si) => {
  if (s.pointIds.length === 0) NEUTRAL_SECTIONS.add(si)
  s.pointIds.forEach((id, oi) => {
    SECTION_LIGHT.set(id, { section: si, order: oi, count: s.pointIds.length })
  })
})

interface MarkerInstance {
  pointId: string
  meridianId: MeridianId
  side: Side
  position: Vector3
  baseColor: Color
}

const REST_GOLD = new Color('#D9B36C')
const QUIZ_GOLD = new Color('#FFF3D0') // 測驗目標：中性亮金白，不洩漏經絡色
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

  useFrame(({ clock }, delta) => {
    const mesh = visualRef.current
    const hit = hitRef.current
    if (!mesh || !hit) return
    const {
      hoveredPointId, hoveredSide, selectedPointId, selectedMeridianId,
      selectedSymptomId, selectedComboId, mode, sectionIndex, rawProgress, spotlightPointId,
      quizActive, quizTargetId, quizTargetSide,
    } = useAppStore.getState()

    const k = 1 - Math.exp(-delta / 0.12) // 統一的 damp 係數
    const storyLight = mode === 'story' && selectedPointId === null
    const quizPulse = 2.2 + 0.55 * Math.sin(clock.elapsedTime * 4) // 測驗目標脈動
    const sectionProgress = rawProgress - sectionIndex
    // free 模式的症狀 / 配穴點亮集合（互斥，最多一個有值）
    const litSet = selectedSymptomId
      ? SYMPTOM_POINTS.get(selectedSymptomId)
      : selectedComboId
        ? COMBO_POINTS.get(selectedComboId)
        : null

    instances.forEach((inst, i) => {
      const isSelected = selectedPointId === inst.pointId
      const isHovered =
        hoveredPointId === inst.pointId && (inst.side === hoveredSide || isSelected)
      const dimmed =
        selectedMeridianId !== null && inst.meridianId !== selectedMeridianId

      let targetScale = 1
      tmpC.copy(inst.baseColor)
      if (quizActive) {
        // 測驗：只有本題目標中性亮金脈動（不洩漏經絡色），其餘全暗
        if (inst.pointId === quizTargetId && inst.side === quizTargetSide) {
          targetScale = quizPulse
          tmpC.copy(QUIZ_GOLD).multiplyScalar(3.2)
        } else {
          targetScale = 0.5
          tmpC.copy(REST_GOLD).multiplyScalar(0.08)
        }
      } else if (isSelected) {
        targetScale = 2.4
        tmpC.multiplyScalar(3.5)
      } else if (isHovered) {
        targetScale = 1.8
        tmpC.copy(REST_GOLD).multiplyScalar(1.6)
      } else if (storyLight) {
        // 滾動敘事：只有「目前」的穴位全亮（spotlight），已走過的轉為
        // 柔和已訪狀態（帶經絡色、不進 bloom），未到的微光、其餘章節暗化；
        // landing / finale 全體回休止金
        const light = SECTION_LIGHT.get(inst.pointId)
        if (NEUTRAL_SECTIONS.has(sectionIndex)) {
          tmpC.copy(REST_GOLD).multiplyScalar(0.55)
        } else if (light?.section === sectionIndex && inst.pointId === spotlightPointId) {
          targetScale = 1.6
          tmpC.multiplyScalar(2.8)
        } else if (
          light?.section === sectionIndex &&
          sectionProgress >= lightThreshold(light.section, light.order, light.count)
        ) {
          targetScale = 1.05
          tmpC.multiplyScalar(0.85) // 已訪：保留經絡色但不發光
        } else if (light?.section === sectionIndex) {
          targetScale = 1.0
          tmpC.copy(REST_GOLD).multiplyScalar(0.4)
        } else {
          targetScale = 0.7
          tmpC.copy(REST_GOLD).multiplyScalar(0.15)
        }
      } else if (litSet) {
        // 症狀反查 / 配穴組合：命中的穴位群點亮，其餘暗化
        if (litSet.has(inst.pointId)) {
          targetScale = 1.5
          tmpC.multiplyScalar(2.8)
        } else {
          targetScale = 0.7
          tmpC.copy(REST_GOLD).multiplyScalar(0.15)
        }
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
    if (useAppStore.getState().quizActive) return // 測驗中不 hover，避免透露
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
    if (useAppStore.getState().quizActive) return // 測驗中點銅人不選穴（用選項作答）
    const inst = instances[e.instanceId]
    useAppStore.getState().actions.selectPoint(inst.pointId, inst.meridianId, inst.side)
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
