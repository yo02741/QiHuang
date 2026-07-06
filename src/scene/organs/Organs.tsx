import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { easing } from 'maath'
import type { Mesh } from 'three'
import { ORGAN_COLORS, ORGAN_PARTS } from './organGeometry'
import { makeOrganGlowMaterial } from './OrganGlowMaterial'
import { useAppStore } from '@/store/useAppStore'
import { ACUPOINT_MAP } from '@/data/acupoints'
import { RENDER_ORDER } from '@/lib/constants'

/**
 * 臟腑：透視（xray）時浮現；被選穴位對應的臟腑高亮發光，
 * 其餘微光；三焦為抽象腔區，強度上限較低。
 */
export function Organs() {
  const parts = useMemo(
    () =>
      ORGAN_PARTS.map((p) => ({
        ...p,
        geo: p.geometry(),
        mat: makeOrganGlowMaterial(ORGAN_COLORS[p.organId]),
        mesh: null as Mesh | null,
      })),
    [],
  )

  useFrame((_, delta) => {
    const { xray, selectedPointId } = useAppStore.getState()
    const targetOrganIds = selectedPointId
      ? (ACUPOINT_MAP.get(selectedPointId)?.organIds ?? [])
      : []

    for (const p of parts) {
      const highlighted = xray && targetOrganIds.includes(p.organId)
      // 三焦/心包是包覆型薄殼，非高亮時完全隱藏以免畫面渾濁
      const isShell = p.organId === 'sanjiao' || p.organId === 'pericardium'
      const ceiling = p.organId === 'sanjiao' ? 1.2 : 2.5
      const targetIntensity = highlighted ? ceiling : xray && !isShell ? 0.28 : 0
      const targetOpacity = highlighted ? 0.9 : xray && !isShell ? 0.18 : 0

      easing.damp(p.mat.uniforms.uIntensity, 'value', targetIntensity, 0.3, delta)
      easing.damp(p.mat.uniforms.uOpacity, 'value', targetOpacity, 0.3, delta)
      // 完全隱形時跳過 draw call
      if (p.mesh) p.mesh.visible = (p.mat.uniforms.uOpacity.value as number) > 0.005
    }
  })

  return (
    <group>
      {parts.map((p, i) => (
        <mesh
          key={`${p.organId}-${i}`}
          ref={(m) => {
            p.mesh = m
          }}
          geometry={p.geo}
          material={p.mat}
          position={p.position}
          rotation={p.rotation ?? [0, 0, 0]}
          scale={p.scale ?? [1, 1, 1]}
          renderOrder={RENDER_ORDER.organs}
          frustumCulled={false}
        />
      ))}
    </group>
  )
}
