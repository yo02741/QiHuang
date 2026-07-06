import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import CameraControlsImpl from 'camera-controls'
import { Vector3 } from 'three'
import { useAppStore } from '@/store/useAppStore'
import { ACUPOINT_MAP } from '@/data/acupoints'
import { resolveAnchor } from '@/lib/anchors'
import { CAMERA_POSES, TIMING } from '@/lib/constants'

const { ACTION } = CameraControlsImpl

/**
 * 鏡頭：使用者 orbit 與程式運鏡共用同一個 CameraControls。
 * intro：遠景緩慢自轉、鎖輸入 →「進入」飛入 HOME → explore 解鎖；
 * 點穴：飛至「穴位 + 法線 ×1.05」；取消/Esc 回 HOME。
 * ?az=<度> 供 smoke test 以固定方位角截圖（並跳過開場）。
 */

function setInputLocked(controls: CameraControlsImpl, locked: boolean) {
  controls.mouseButtons.left = locked ? ACTION.NONE : ACTION.ROTATE
  controls.mouseButtons.wheel = locked ? ACTION.NONE : ACTION.DOLLY
  controls.touches.one = locked ? ACTION.NONE : ACTION.TOUCH_ROTATE
  controls.touches.two = locked ? ACTION.NONE : ACTION.TOUCH_DOLLY_TRUCK
}

export function CameraRig() {
  const ref = useRef<CameraControlsImpl>(null)
  // 遞增 token：新的運鏡請求使進行中的舊請求完成後不再動作
  const transitionToken = useRef(0)

  // 初始姿勢
  useEffect(() => {
    const controls = ref.current
    if (!controls) return
    controls.mouseButtons.right = ACTION.NONE // 不提供平移，保持構圖
    controls.touches.three = ACTION.NONE

    const az = new URLSearchParams(window.location.search).get('az')
    if (az !== null) {
      const rad = (Number(az) * Math.PI) / 180
      void controls.setLookAt(
        3.2 * Math.sin(rad), 1.35, 3.2 * Math.cos(rad),
        0, 1.05, 0,
        false,
      )
      return
    }
    if (useAppStore.getState().phase === 'intro') {
      void controls.setLookAt(...CAMERA_POSES.INTRO, false)
      setInputLocked(controls, true)
    } else {
      void controls.setLookAt(...CAMERA_POSES.HOME, false)
    }
  }, [])

  // intro 緩慢自轉
  useFrame((_, delta) => {
    const controls = ref.current
    if (!controls) return
    if (useAppStore.getState().phase === 'intro') {
      controls.azimuthAngle += 0.045 * delta
    }
  })

  //「進入」飛入
  useEffect(
    () =>
      useAppStore.subscribe((s, prev) => {
        if (s.phase !== 'entering' || prev.phase === 'entering') return
        const controls = ref.current
        if (!controls) return
        const token = ++transitionToken.current
        controls.smoothTime = TIMING.introFlySmoothTime
        void controls.setLookAt(...CAMERA_POSES.HOME, true).then(() => {
          if (token !== transitionToken.current) return
          controls.smoothTime = TIMING.orbitSmoothTime
          setInputLocked(controls, false)
          useAppStore.getState().actions.enterDone()
        })
      }),
    [],
  )

  // 點穴聚焦 / 取消復位
  useEffect(
    () =>
      useAppStore.subscribe((s, prev) => {
        if (s.selectedPointId === prev.selectedPointId && s.selectedSide === prev.selectedSide)
          return
        const controls = ref.current
        if (!controls) return
        const token = ++transitionToken.current

        if (s.selectedPointId) {
          const point = ACUPOINT_MAP.get(s.selectedPointId)
          if (!point) return
          const { position: p, normal } = resolveAnchor(point.anchor, s.selectedSide)
          // 鏡頭方向：anchor 法線（內側穴位會指向軀幹）混合「離身體中軸的
          // 水平徑向」，確保鏡頭一定落在身體外側
          const radial = new Vector3(p.x, 0, p.z)
          if (radial.lengthSq() < 0.02 * 0.02) radial.set(0, 0, 1)
          radial.normalize()
          const dir = radial.multiplyScalar(0.85).addScaledVector(normal, 0.55)
          dir.z += 0.2 // 微偏正面
          dir.normalize()
          const cam = p.clone().addScaledVector(dir, 1.15)
          cam.y = Math.max(cam.y + 0.12, 0.3) // 不潛入臺座下方
          void controls.setLookAt(cam.x, cam.y, cam.z, p.x, p.y, p.z, true).then(() => {
            if (token !== transitionToken.current) return
          })
        } else {
          void controls.setLookAt(...CAMERA_POSES.HOME, true)
        }
      }),
    [],
  )

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
