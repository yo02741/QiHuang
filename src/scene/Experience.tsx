import { useEffect, useRef, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { Group } from 'three'
import { useAppStore } from '@/store/useAppStore'
import { registerSnapshot } from '@/lib/snapshot'
import { Stage } from './Stage'
import { Effects } from './Effects'
import { CameraRig } from './CameraRig'
import { BronzeMan } from './bronze/BronzeMan'
import { Muscle } from './bronze/Muscle'
import { Skeleton } from './bronze/Skeleton'
import { DebugHelpers } from './bronze/DebugHelpers'
import { Organs } from './organs/Organs'
import { OrganLabels } from './organs/OrganLabels'
import { MeridianLines } from './meridians/MeridianLines'
import { QiFlow } from './meridians/QiFlow'
import { AcupointMarkers } from './points/AcupointMarkers'
import { PointTooltip } from './points/PointTooltip'
import { SectionPointLabels } from './points/SectionPointLabels'
import { SkeletonMeasure } from './points/SkeletonMeasure'

/**
 * 首幀渲染後在 <body> 打標記 + 每 10 幀更新幀數計數，
 * 供無頭 smoke test 判斷「WebGL 已就緒且持續產出新幀」（軟體算圖下
 * 固定等待時間不可靠，等幀數才能保證 shader 編譯完、畫面已合成）。
 */
function ReadyFlag() {
  const frames = useRef(0)
  useFrame(() => {
    frames.current++
    if (frames.current % 10 === 0) {
      document.body.dataset.qhFrames = String(frames.current)
    }
    if (document.body.dataset.qhReady !== 'true') {
      document.body.dataset.qhReady = 'true'
    }
  })
  return null
}

/** 成績卡快照橋：把 renderer/scene/camera 交給 lib/snapshot */
function SnapshotBridge() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    registerSnapshot(gl, scene, camera)
  }, [gl, scene, camera])
  return null
}

/**
 * 待機微呼吸：讓銅人「活著」。整組（銅身＋臟腑＋經絡＋穴位）一起
 * 縮放/微升，穴位才不會脫離皮膚；幅度極小（縱向 ±0.8%、抬升 ±4mm、
 * 約 10 秒一次），相機聚焦目標仍取靜態錨點，位移小到不影響運鏡。
 * 自原點（足底 y=0）縮放：胸腔隨吸氣上抬、雙足穩踏臺座。
 */
function BreathGroup({ children }: { children: ReactNode }) {
  const ref = useRef<Group>(null)
  useFrame((state) => {
    const g = ref.current
    if (!g) return
    const b = Math.sin(state.clock.elapsedTime * 0.62)
    g.scale.set(1 + b * 0.006, 1 + b * 0.008, 1 + b * 0.006)
    g.position.y = b * 0.004
  })
  return <group ref={ref}>{children}</group>
}

function ModeFlag() {
  const mode = useAppStore((s) => s.mode)
  const sectionIndex = useAppStore((s) => s.sectionIndex)
  useEffect(() => {
    document.body.dataset.qhMode = mode
    document.body.dataset.qhSection = String(sectionIndex)
  }, [mode, sectionIndex])
  return null
}

export function Experience() {
  return (
    <>
      <Stage />
      <CameraRig />
      {/* 一起呼吸：銅身與依附其上的臟腑/經絡/穴位/標籤同步縮放，維持貼合 */}
      <BreathGroup>
        <Organs />
        <Skeleton />
        <Muscle />
        <BronzeMan />
        <MeridianLines />
        <QiFlow />
        <AcupointMarkers />
        <PointTooltip />
        <SectionPointLabels />
        <SkeletonMeasure />
        <OrganLabels />
      </BreathGroup>
      <Effects />
      <DebugHelpers />
      <ReadyFlag />
      <ModeFlag />
      <SnapshotBridge />
    </>
  )
}
