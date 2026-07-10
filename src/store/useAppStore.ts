import { create } from 'zustand'
import type { MeridianId, SymptomId } from '@/data/types'
import { STORY_SECTIONS, lightThreshold } from '@/data/sections'

export type Mode = 'story' | 'free'

/** 滾動進度 → 當前章「最新點亮」的穴位（導覽 spotlight，連動詳情面板） */
function spotlightAt(rawProgress: number): string | null {
  const si = Math.floor(rawProgress)
  const section = STORY_SECTIONS[si]
  if (!section || section.pointIds.length === 0) return null
  const p = rawProgress - si
  for (let i = section.pointIds.length - 1; i >= 0; i--) {
    if (p >= lightThreshold(si, i, section.pointIds.length)) return section.pointIds[i]
  }
  return null
}

interface AppState {
  /** story = 滾動敘事（預設）；free = 自由探索（原 orbit 互動） */
  mode: Mode
  /** 當前章節索引（floor(rawProgress)，只在跨章時變動，供 React 訂閱） */
  sectionIndex: number
  /** 連續滾動進度 0..N-1（高頻 transient；元件請勿訂閱，useFrame 以 getState() 讀） */
  rawProgress: number
  /** 滾動速度 px/s（transient，微互動衰減與 focus 退出判定用） */
  scrollVelocity: number
  /** 當前章最新點亮的穴位（導覽 spotlight）；選穴時面板以 selectedPointId 優先 */
  spotlightPointId: string | null
  selectedMeridianId: MeridianId | null // null = 顯示全部經絡
  selectedSymptomId: SymptomId | null   // 症狀反查（free 模式；與經絡/配穴互斥）
  selectedComboId: string | null        // 配穴組合（free 模式；與經絡/症狀互斥）
  selectedPointId: string | null        // 有值 ⇒ 透視模式 + 相機 focus
  selectedSide: 'L' | 'R'               // 鏡頭聚焦在被點選的那一側
  hoveredPointId: string | null
  hoveredSide: 'L' | 'R'                // tooltip 顯示在被 hover 的那一側
  xray: boolean
  debug: boolean
  actions: {
    /** StorySections 的 scroll handler 專用（rAF 節流後呼叫） */
    setScroll(rawProgress: number, velocity: number): void
    enterFree(): void
    enterStory(): void
    selectMeridian(id: MeridianId | null): void
    selectSymptom(id: SymptomId | null): void
    selectCombo(id: string | null): void
    selectPoint(id: string | null, meridianId?: MeridianId, side?: 'L' | 'R'): void
    hoverPoint(id: string | null, side?: 'L' | 'R'): void
    reset(): void
  }
}

const params = new URLSearchParams(window.location.search)
const debug = params.has('debug')
// ?az / ?debug（smoke 截圖與調校）與 ?point=（深連結）直接進自由探索
const skipStory = debug || params.has('az') || params.has('point')

export const useAppStore = create<AppState>()((set) => ({
  mode: skipStory ? 'free' : 'story',
  sectionIndex: 0,
  rawProgress: 0,
  scrollVelocity: 0,
  spotlightPointId: null,
  selectedMeridianId: null,
  selectedSymptomId: null,
  selectedComboId: null,
  selectedPointId: null,
  selectedSide: 'L',
  hoveredPointId: null,
  hoveredSide: 'L',
  xray: false,
  debug,
  actions: {
    setScroll: (rawProgress, velocity) =>
      set((s) => {
        const sectionIndex = Math.floor(rawProgress)
        const spotlightPointId = spotlightAt(rawProgress)
        const patch: Partial<AppState> = { rawProgress, scrollVelocity: velocity }
        if (sectionIndex !== s.sectionIndex) patch.sectionIndex = sectionIndex
        if (spotlightPointId !== s.spotlightPointId) patch.spotlightPointId = spotlightPointId
        return patch
      }),
    enterFree: () => set({ mode: 'free' }),
    enterStory: () =>
      set({
        mode: 'story',
        selectedPointId: null,
        selectedMeridianId: null,
        selectedSymptomId: null,
        selectedComboId: null,
        xray: false,
      }),
    // 經絡 / 症狀 / 配穴 三種瀏覽互斥（各自選取時清掉其他兩類與選穴）
    selectMeridian: (id) =>
      set({
        selectedMeridianId: id,
        selectedSymptomId: null,
        selectedComboId: null,
        selectedPointId: null,
        xray: false,
      }),
    selectSymptom: (id) =>
      set({
        selectedSymptomId: id,
        selectedMeridianId: null,
        selectedComboId: null,
        selectedPointId: null,
        xray: false,
      }),
    selectCombo: (id) =>
      set({
        selectedComboId: id,
        selectedMeridianId: null,
        selectedSymptomId: null,
        selectedPointId: null,
        xray: false,
      }),
    selectPoint: (id, meridianId, side = 'L') =>
      set((s) => ({
        selectedPointId: id,
        selectedSide: side,
        xray: id !== null,
        selectedMeridianId: id !== null ? (meridianId ?? s.selectedMeridianId) : s.selectedMeridianId,
        hoveredPointId: null,
      })),
    hoverPoint: (id, side = 'L') => set({ hoveredPointId: id, hoveredSide: side }),
    reset: () =>
      set({
        selectedPointId: null,
        xray: false,
        selectedMeridianId: null,
        selectedSymptomId: null,
        selectedComboId: null,
      }),
  },
}))

// 供無頭 smoke test 以確定性方式驅動選擇（避免脆弱的 3D 座標點擊）
declare global {
  interface Window { __QH_STORE: typeof useAppStore }
}
window.__QH_STORE = useAppStore
