import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import CameraControlsImpl from 'camera-controls'
import { Vector3 } from 'three'
import { useAppStore } from '@/store/useAppStore'
import { ACUPOINT_MAP } from '@/data/acupoints'
import { resolveAnchor } from '@/lib/anchors'
import { SECTION_POSES, TRANSITION_ENDS } from '@/data/sections'
import {
  copyPose,
  evaluatePose,
  extractPose,
  type MutablePose,
} from '@/lib/cameraPath'
import { CAMERA_POSES, SCROLL, TIMING } from '@/lib/constants'
import { useIsCoarsePointer } from '@/hooks/useIsCoarsePointer'

const { ACTION } = CameraControlsImpl

/**
 * 鏡頭三種狀態，共用同一個 CameraControls：
 *
 * story（滾動敘事）：輸入鎖定，每幀以阻尼姿勢追蹤 evaluatePose(rawProgress)
 *   再 setLookAt(..., false)——阻尼層即「類 lenis」平滑手感的來源。
 *   章內停駐時可小幅拖曳旋轉（dragOffset 疊加在姿勢上，滾動/換章時衰減歸零）。
 * focus（story/free 皆可，selectedPointId 有值）：滾動運鏡暫停，
 *   沿 anchor 法線飛至穴位；取消時 story 把相機實際姿勢反解回阻尼姿勢，
 *   平滑接回滾動軌道（free 則飛回 HOME）。
 * free（自由探索）：原生 orbit，限制較緊以保構圖。
 *
 * ?az=<度> 供 smoke test 以固定方位角截圖（?az/?debug 直接進 free 模式）。
 */

function setInputLocked(controls: CameraControlsImpl, locked: boolean) {
  controls.mouseButtons.left = locked ? ACTION.NONE : ACTION.ROTATE
  controls.mouseButtons.wheel = locked ? ACTION.NONE : ACTION.DOLLY
  // 自由探索右鍵：螢幕面 xy 平移（不旋轉、不改距離）
  controls.mouseButtons.right = locked ? ACTION.NONE : ACTION.TRUCK
  controls.touches.one = locked ? ACTION.NONE : ACTION.TOUCH_ROTATE
  controls.touches.two = locked ? ACTION.NONE : ACTION.TOUCH_DOLLY_TRUCK
}

/** story 模式放寬限制（軌道有俯瞰頭頂與遠景 landing）；free 收緊保構圖 */
function setLimits(controls: CameraControlsImpl, storyMode: boolean) {
  controls.minDistance = storyMode ? 0.3 : 0.8
  controls.maxDistance = storyMode ? 12 : 6
  controls.minPolarAngle = storyMode ? 0.05 : 0.35
  controls.maxPolarAngle = storyMode ? Math.PI - 0.05 : 1.62
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

export function CameraRig() {
  const ref = useRef<CameraControlsImpl>(null)
  const gl = useThree((s) => s.gl)
  const coarse = useIsCoarsePointer()
  // 遞增 token：新的運鏡請求使進行中的舊請求完成後不再動作
  const transitionToken = useRef(0)
  // story 阻尼姿勢（useFrame 熱路徑，重複使用避免每幀配置）
  const current = useRef<MutablePose>({
    target: [...SECTION_POSES[0].target],
    azimuth: SECTION_POSES[0].azimuth,
    polar: SECTION_POSES[0].polar,
    distance: SECTION_POSES[0].distance,
  })
  // 章內微互動拖曳 offset
  const drag = useRef({ az: 0, pol: 0, active: false, section: 0 })
  const camPos = useRef(new Vector3())
  const camTgt = useRef(new Vector3())

  /** 把相機當下實際姿勢反解回阻尼姿勢（focus 退出 / 重回 story 時接回） */
  const syncCurrentFromControls = () => {
    const controls = ref.current
    if (!controls) return
    controls.getPosition(camPos.current)
    controls.getTarget(camTgt.current)
    const refAz = evaluatePose(
      SECTION_POSES,
      useAppStore.getState().rawProgress,
      TRANSITION_ENDS,
    ).azimuth
    const pose = extractPose(
      [camPos.current.x, camPos.current.y, camPos.current.z],
      [camTgt.current.x, camTgt.current.y, camTgt.current.z],
      refAz,
    )
    copyPose(pose, current.current)
    drag.current.az = 0
    drag.current.pol = 0
  }

  // 模式切換（含初始）：輸入鎖定、限制範圍、初始/交接姿勢
  const mode = useAppStore((s) => s.mode)
  const firstRun = useRef(true)
  useEffect(() => {
    const controls = ref.current
    if (!controls) return
    controls.touches.three = ACTION.NONE
    setLimits(controls, mode === 'story')
    setInputLocked(controls, mode === 'story')

    if (firstRun.current) {
      firstRun.current = false
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
      if (mode === 'free') {
        void controls.setLookAt(...CAMERA_POSES.HOME, false)
      }
      // story：useFrame 首幀就會以 landing 姿勢 setLookAt，這裡不需動作
      return
    }
    if (mode === 'free') {
      // 終章「進入自由探索」：平滑飛回 HOME
      const token = ++transitionToken.current
      controls.smoothTime = TIMING.orbitSmoothTime
      void controls.setLookAt(...CAMERA_POSES.HOME, true).then(() => {
        if (token !== transitionToken.current) return
      })
    } else {
      //「重看導覽」：接回滾動軌道（scroll handler 會把 rawProgress 歸零）
      ++transitionToken.current
      syncCurrentFromControls()
    }
  }, [mode])

  // 章內微互動：滑鼠小幅拖曳旋轉（觸控裝置停用，單指手勢保留給滾動）
  useEffect(() => {
    if (coarse) return
    const el = gl.domElement
    let startX = 0
    let startY = 0
    let baseAz = 0
    let basePol = 0
    const onDown = (e: PointerEvent) => {
      const s = useAppStore.getState()
      if (s.mode !== 'story' || e.button !== 0) return
      startX = e.clientX
      startY = e.clientY
      baseAz = drag.current.az
      basePol = drag.current.pol
      drag.current.active = true
      drag.current.section = s.sectionIndex
    }
    const onMove = (e: PointerEvent) => {
      if (!drag.current.active) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      if (Math.abs(dx) + Math.abs(dy) < 5) return // 保留 tap 選穴
      drag.current.az = clamp(
        baseAz - (dx / window.innerWidth) * SCROLL.dragSense,
        -SCROLL.dragMaxAz,
        SCROLL.dragMaxAz,
      )
      drag.current.pol = clamp(
        basePol - (dy / window.innerHeight) * SCROLL.dragSense * 0.5,
        -SCROLL.dragMaxPol,
        SCROLL.dragMaxPol,
      )
    }
    const onUp = () => {
      drag.current.active = false
    }
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [gl, coarse])

  // story 滾動運鏡：阻尼姿勢追蹤 + dragOffset 疊加 + landing 微幅晃動
  useFrame(({ clock, size }, delta) => {
    const controls = ref.current
    if (!controls) return
    const s = useAppStore.getState()
    // story 選穴不飛相機（維持滾動視角），迴圈持續運轉
    if (s.mode !== 'story') return

    const target = evaluatePose(SECTION_POSES, s.rawProgress, TRANSITION_ENDS)
    const cur = current.current
    const k = 1 - Math.exp(-delta / SCROLL.poseDamp)
    cur.azimuth += (target.azimuth - cur.azimuth) * k
    cur.polar += (target.polar - cur.polar) * k
    cur.distance += (target.distance - cur.distance) * k
    cur.target[0] += (target.target[0] - cur.target[0]) * k
    cur.target[1] += (target.target[1] - cur.target[1]) * k
    cur.target[2] += (target.target[2] - cur.target[2]) * k

    // 拖曳 offset：滾動或換章時衰減歸零
    const d = drag.current
    if (!d.active && (Math.abs(s.scrollVelocity) > 120 || s.sectionIndex !== d.section)) {
      const dk = 1 - Math.exp(-delta / SCROLL.dragDecay)
      d.az -= d.az * dk
      d.pol -= d.pol * dk
    }

    // landing 停留時的緩慢晃動（幅度隨進度歸零，不累積圈數）
    const idle =
      s.rawProgress < 0.6 ? (1 - s.rawProgress / 0.6) * 0.07 * Math.sin(clock.elapsedTime * 0.22) : 0

    // 窄視口（手機直式）補償：拉遠並下移注視點，讓主體讓出下半屏給文案卡
    const narrow = size.width < 700
    const dist = cur.distance * (narrow ? 1.35 : 1)
    const yOff = narrow ? -0.1 : 0

    const az = cur.azimuth + d.az + idle
    const pol = clamp(cur.polar + d.pol, 0.06, Math.PI - 0.06)
    const sp = Math.sin(pol)
    const [tx, ty, tz] = cur.target
    controls.setLookAt(
      tx + dist * sp * Math.sin(az),
      ty + yOff + dist * Math.cos(pol),
      tz + dist * sp * Math.cos(az),
      tx, ty + yOff, tz,
      false,
    )
  })

  // 點穴聚焦 / 取消復位（僅自由探索：story 模式選穴不動相機，維持敘事視角）
  useEffect(
    () =>
      useAppStore.subscribe((s, prev) => {
        if (s.selectedPointId === prev.selectedPointId && s.selectedSide === prev.selectedSide)
          return
        if (s.mode === 'story') return
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
          controls.smoothTime = TIMING.orbitSmoothTime
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
