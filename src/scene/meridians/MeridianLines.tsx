import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { easing } from 'maath'
import type { Line2 } from 'three/addons/lines/Line2.js'
import type { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { useMeridianCurves, type MeridianCurve } from './useMeridianCurves'
import { useAppStore } from '@/store/useAppStore'
import { RENDER_ORDER } from '@/lib/constants'

/**
 * 經絡線：drei <Line>（Line2 fat lines，任何距離等寬）。
 * 每條經絡疊兩層 — 常駐實線 + 選中時的發光虛線（dashOffset 動畫做「氣流動」），
 * 以顯示切換取代 dashed 屬性切換，避免材質重編譯。
 */

const BOOST_ACTIVE = 2.6 // 選中色分量 >1 → bloom 拾取

function MeridianLine({ curve }: { curve: MeridianCurve }) {
  const solidRef = useRef<Line2>(null)
  const dashedRef = useRef<Line2>(null)

  useFrame((_, delta) => {
    const { selectedMeridianId } = useAppStore.getState()
    const active = selectedMeridianId === curve.meridianId
    const anySelected = selectedMeridianId !== null

    const solid = solidRef.current
    const dashed = dashedRef.current
    if (!solid || !dashed) return

    // 常駐實線：無選擇 0.85；他經被選中時退到 0.12
    const solidMat = solid.material as LineMaterial
    const solidTarget = active ? 0 : anySelected ? 0.12 : 0.85
    easing.damp(solidMat, 'opacity', solidTarget, 0.25, delta)
    solid.visible = solidMat.opacity > 0.01
    solidMat.linewidth = active || !anySelected ? 2.2 : 1.2

    // 發光虛線：僅選中經絡顯示，dashOffset 流動
    const dashedMat = dashed.material as LineMaterial
    easing.damp(dashedMat, 'opacity', active ? 1 : 0, 0.25, delta)
    dashed.visible = dashedMat.opacity > 0.01
    if (active) dashedMat.dashOffset -= 0.35 * delta
  })

  return (
    <>
      <Line
        ref={solidRef}
        points={curve.points}
        color={curve.color}
        lineWidth={2.2}
        transparent
        opacity={0.85}
        toneMapped={false}
        renderOrder={RENDER_ORDER.meridians}
        depthWrite={false}
      />
      <Line
        ref={dashedRef}
        points={curve.points}
        color={curve.color.clone().multiplyScalar(BOOST_ACTIVE)}
        lineWidth={2.6}
        transparent
        opacity={0}
        toneMapped={false}
        dashed
        dashScale={12}
        dashSize={0.55}
        gapSize={0.45}
        renderOrder={RENDER_ORDER.meridians}
        depthWrite={false}
      />
    </>
  )
}

export function MeridianLines() {
  const curves = useMeridianCurves()
  return (
    <group>
      {curves.map((c) => (
        <MeridianLine key={`${c.meridianId}-${c.side}`} curve={c} />
      ))}
    </group>
  )
}
