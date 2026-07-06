import { useEffect, useRef } from 'react'
import { CameraControls } from '@react-three/drei'
import type CameraControlsImpl from 'camera-controls'
import { CAMERA_POSES, TIMING } from '@/lib/constants'

/**
 * 鏡頭：使用者 orbit 與程式運鏡共用同一個 CameraControls。
 * M5 將擴充：intro 鎖輸入自轉 → 飛入 → 點穴聚焦/復位。
 * ?az=<度> 供 smoke test 以固定方位角截圖。
 */
export function CameraRig() {
  const ref = useRef<CameraControlsImpl>(null)

  useEffect(() => {
    const controls = ref.current
    if (!controls) return
    const az = new URLSearchParams(window.location.search).get('az')
    if (az !== null) {
      const rad = (Number(az) * Math.PI) / 180
      void controls.setLookAt(
        3.2 * Math.sin(rad), 1.35, 3.2 * Math.cos(rad),
        0, 1.05, 0,
        false,
      )
    } else {
      void controls.setLookAt(...CAMERA_POSES.HOME, false)
    }
  }, [])

  return (
    <CameraControls
      ref={ref}
      makeDefault
      smoothTime={TIMING.orbitSmoothTime}
      minDistance={0.8}
      maxDistance={6}
      minPolarAngle={0.35}
      maxPolarAngle={1.62}
    />
  )
}
