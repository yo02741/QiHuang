import { useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAppStore } from '@/store/useAppStore'
import { Stage } from './Stage'
import { CameraRig } from './CameraRig'
import { BronzeMan } from './bronze/BronzeMan'
import { DebugHelpers } from './bronze/DebugHelpers'

/** 首幀渲染後在 <body> 打標記，供無頭 smoke test 判斷 WebGL 已就緒 */
function ReadyFlag() {
  useFrame(() => {
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
      <BronzeMan />
      <DebugHelpers />
      <ReadyFlag />
      <PhaseFlag />
    </>
  )
}
