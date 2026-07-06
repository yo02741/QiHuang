import { useMemo } from 'react'
import { CatmullRomCurve3, Color, Vector3 } from 'three'
import { MERIDIANS } from '@/data/meridians'
import { resolveAnchor, type Side } from '@/lib/anchors'
import type { MeridianId } from '@/data/types'

export interface MeridianCurve {
  meridianId: MeridianId
  side: Side
  points: Vector3[]
  color: Color
}

const LINE_OUT = 0.008 // 線稍微浮出體表

/** 全部經絡曲線（雙側鏡射，12×2 + 任督 = 26 條），資料靜態故只算一次 */
export function useMeridianCurves(): MeridianCurve[] {
  return useMemo(() => {
    const curves: MeridianCurve[] = []
    for (const m of MERIDIANS) {
      const sides: Side[] = m.bilateral ? ['L', 'R'] : ['L']
      for (const side of sides) {
        const waypoints = m.path.map(
          (a) => resolveAnchor({ ...a, out: LINE_OUT } as typeof a, side).position,
        )
        const curve = new CatmullRomCurve3(waypoints, false, 'centripetal', 0.5)
        curves.push({
          meridianId: m.id,
          side,
          points: curve.getPoints(96),
          color: new Color(m.color),
        })
      }
    }
    return curves
  }, [])
}
