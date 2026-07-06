import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAppStore } from '@/store/useAppStore'
import { Stage } from './Stage'
import { Effects } from './Effects'
import { CameraRig } from './CameraRig'
import { BronzeMan } from './bronze/BronzeMan'
import { DebugHelpers } from './bronze/DebugHelpers'
import { Organs } from './organs/Organs'
import { MeridianLines } from './meridians/MeridianLines'
import { AcupointMarkers } from './points/AcupointMarkers'
import { PointTooltip } from './points/PointTooltip'

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

function PhaseFlag() {
  const phase = useAppStore((s) => s.phase)
  useEffect(() => {
    document.body.dataset.qhPhase = phase
  }, [phase])
  return null
}

export function Experience() {
  return (
    <>
      <Stage />
      <CameraRig />
      <Organs />
      <BronzeMan />
      <MeridianLines />
      <AcupointMarkers />
      <PointTooltip />
      <Effects />
      <DebugHelpers />
      <ReadyFlag />
      <PhaseFlag />
    </>
  )
}
