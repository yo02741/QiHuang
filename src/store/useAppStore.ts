import { create } from 'zustand'
import type { MeridianId } from '@/data/types'

export type Phase = 'intro' | 'entering' | 'explore'

interface AppState {
  phase: Phase
  selectedMeridianId: MeridianId | null // null = 顯示全部經絡
  selectedPointId: string | null        // 有值 ⇒ 透視模式
  hoveredPointId: string | null
  xray: boolean
  debug: boolean
  actions: {
    enter(): void
    enterDone(): void
    selectMeridian(id: MeridianId | null): void
    selectPoint(id: string | null, meridianId?: MeridianId): void
    hoverPoint(id: string | null): void
    reset(): void
  }
}

const debug = new URLSearchParams(window.location.search).has('debug')

export const useAppStore = create<AppState>()((set) => ({
  phase: 'intro',
  selectedMeridianId: null,
  selectedPointId: null,
  hoveredPointId: null,
  xray: false,
  debug,
  actions: {
    enter: () => set({ phase: 'entering' }),
    enterDone: () => set({ phase: 'explore' }),
    selectMeridian: (id) =>
      set({ selectedMeridianId: id, selectedPointId: null, xray: false }),
    selectPoint: (id, meridianId) =>
      set((s) => ({
        selectedPointId: id,
        xray: id !== null,
        selectedMeridianId: id !== null ? (meridianId ?? s.selectedMeridianId) : s.selectedMeridianId,
        hoveredPointId: null,
      })),
    hoverPoint: (id) => set({ hoveredPointId: id }),
    reset: () => set({ selectedPointId: null, xray: false, selectedMeridianId: null }),
  },
}))

// 供無頭 smoke test 以確定性方式驅動選擇（避免脆弱的 3D 座標點擊）
declare global {
  interface Window { __QH_STORE: typeof useAppStore }
}
window.__QH_STORE = useAppStore
