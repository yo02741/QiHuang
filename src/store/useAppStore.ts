import { create } from 'zustand'
import type { MeridianId } from '@/data/types'

export type Phase = 'intro' | 'entering' | 'explore'

interface AppState {
  phase: Phase
  selectedMeridianId: MeridianId | null // null = 顯示全部經絡
  selectedPointId: string | null        // 有值 ⇒ 透視模式
  selectedSide: 'L' | 'R'               // 鏡頭聚焦在被點選的那一側
  hoveredPointId: string | null
  hoveredSide: 'L' | 'R'                // tooltip 顯示在被 hover 的那一側
  xray: boolean
  debug: boolean
  actions: {
    enter(): void
    enterDone(): void
    selectMeridian(id: MeridianId | null): void
    selectPoint(id: string | null, meridianId?: MeridianId, side?: 'L' | 'R'): void
    hoverPoint(id: string | null, side?: 'L' | 'R'): void
    reset(): void
  }
}

const params = new URLSearchParams(window.location.search)
const debug = params.has('debug')
// ?az / ?debug（smoke 截圖與調校）直接跳過開場
const skipIntro = debug || params.has('az')

export const useAppStore = create<AppState>()((set) => ({
  phase: skipIntro ? 'explore' : 'intro',
  selectedMeridianId: null,
  selectedPointId: null,
  selectedSide: 'L',
  hoveredPointId: null,
  hoveredSide: 'L',
  xray: false,
  debug,
  actions: {
    enter: () => set({ phase: 'entering' }),
    enterDone: () => set({ phase: 'explore' }),
    selectMeridian: (id) =>
      set({ selectedMeridianId: id, selectedPointId: null, xray: false }),
    selectPoint: (id, meridianId, side = 'L') =>
      set((s) => ({
        selectedPointId: id,
        selectedSide: side,
        xray: id !== null,
        selectedMeridianId: id !== null ? (meridianId ?? s.selectedMeridianId) : s.selectedMeridianId,
        hoveredPointId: null,
      })),
    hoverPoint: (id, side = 'L') => set({ hoveredPointId: id, hoveredSide: side }),
    reset: () => set({ selectedPointId: null, xray: false, selectedMeridianId: null }),
  },
}))

// 供無頭 smoke test 以確定性方式驅動選擇（避免脆弱的 3D 座標點擊）
declare global {
  interface Window { __QH_STORE: typeof useAppStore }
}
window.__QH_STORE = useAppStore
