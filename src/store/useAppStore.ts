import { create } from 'zustand'
import type { MeridianId, SymptomId } from '@/data/types'
import { STORY_SECTIONS, lightThreshold } from '@/data/sections'

export type Mode = 'story' | 'free'

/** 解剖分層：由外而內剝開——銅身（皮）→ 肌肉 → 骨架 */
export type AnatomyLayer = 'skin' | 'muscle' | 'skeleton'

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
  /** 手機步進導覽的站點索引（StepNav 監聽並執行動畫/瞬移） */
  tourStep: number
  selectedMeridianId: MeridianId | null // null = 顯示全部經絡
  selectedSymptomId: SymptomId | null   // 症狀反查（free 模式；與經絡/配穴互斥）
  selectedComboId: string | null        // 配穴組合（free 模式；與經絡/症狀互斥）
  selectedPointId: string | null        // 有值 ⇒ 透視模式 + 相機 focus
  selectedSide: 'L' | 'R'               // 鏡頭聚焦在被點選的那一側
  hoveredPointId: string | null
  hoveredSide: 'L' | 'R'                // tooltip 顯示在被 hover 的那一側
  xray: boolean
  anatomyLayer: AnatomyLayer            // 解剖分層（free 模式；skin=銅身、muscle=肌、skeleton=骨）
  qiFlowPlaying: boolean                // 經絡氣流循行動畫播放中（free 模式）
  flowMeridianId: MeridianId | null     // 當前循行到的經絡（QiFlow 場景低頻寫入）
  quizActive: boolean                   // 學習測驗模式進行中（free 模式）
  quizTargetId: string | null           // 本題要猜的穴位（銅人高亮+鏡頭聚焦，不觸發 xray）
  quizTargetSide: 'L' | 'R'
  searchOpen: boolean                   // 搜尋盤（command palette）開啟中
  debug: boolean
  actions: {
    /** StorySections 的 scroll handler 專用（rAF 節流後呼叫） */
    setScroll(rawProgress: number, velocity: number): void
    /** 手機步進導覽：跳到第 i 站（含 Header 回首頁 setTourStep(0)） */
    setTourStep(i: number): void
    enterFree(): void
    enterStory(): void
    selectMeridian(id: MeridianId | null): void
    selectSymptom(id: SymptomId | null): void
    selectCombo(id: string | null): void
    selectPoint(id: string | null, meridianId?: MeridianId, side?: 'L' | 'R'): void
    hoverPoint(id: string | null, side?: 'L' | 'R'): void
    /** 切換解剖分層（皮/肌/骨）；骨架層可視化骨度分寸 */
    setAnatomyLayer(layer: AnatomyLayer): void
    /** 切換經絡氣流循行動畫（起播時清空其他選取；QiFlow 場景推進 flowMeridianId） */
    toggleQiFlow(): void
    /** QiFlow 場景每換一條經絡時回寫（低頻，供時辰鐘/經絡線訂閱） */
    setFlowMeridian(id: MeridianId): void
    /** 進入學習測驗（清空其他選取與播放；題目由 QuizPanel 產生後 setQuizTarget） */
    startQuiz(): void
    /** QuizPanel 設定目前要高亮+聚焦的穴位；「依症選穴」題出題時傳 null
     *（銅人保持中性不洩題），作答後才揭示正解位置 */
    setQuizTarget(id: string | null, side?: 'L' | 'R'): void
    /** 結束測驗，回自由探索 */
    endQuiz(): void
    setSearchOpen(open: boolean): void
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
  tourStep: 0,
  selectedMeridianId: null,
  selectedSymptomId: null,
  selectedComboId: null,
  selectedPointId: null,
  selectedSide: 'L',
  hoveredPointId: null,
  hoveredSide: 'L',
  xray: false,
  anatomyLayer: 'skin',
  qiFlowPlaying: false,
  flowMeridianId: null,
  quizActive: false,
  quizTargetId: null,
  quizTargetSide: 'L',
  searchOpen: false,
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
    setTourStep: (i) => set({ tourStep: i }),
    enterFree: () => set({ mode: 'free' }),
    enterStory: () =>
      set({
        mode: 'story',
        selectedPointId: null,
        selectedMeridianId: null,
        selectedSymptomId: null,
        selectedComboId: null,
        xray: false,
        anatomyLayer: 'skin',
        qiFlowPlaying: false,
        quizActive: false,
        quizTargetId: null,
      }),
    // 經絡 / 症狀 / 配穴 三種瀏覽互斥（各自選取時清掉其他兩類與選穴，並停止循經播放）
    selectMeridian: (id) =>
      set({
        selectedMeridianId: id,
        selectedSymptomId: null,
        selectedComboId: null,
        selectedPointId: null,
        xray: false,
        qiFlowPlaying: false,
      }),
    selectSymptom: (id) =>
      set({
        selectedSymptomId: id,
        selectedMeridianId: null,
        selectedComboId: null,
        selectedPointId: null,
        xray: false,
        qiFlowPlaying: false,
      }),
    selectCombo: (id) =>
      set({
        selectedComboId: id,
        selectedMeridianId: null,
        selectedSymptomId: null,
        selectedPointId: null,
        xray: false,
        qiFlowPlaying: false,
      }),
    selectPoint: (id, meridianId, side = 'L') =>
      set((s) => ({
        selectedPointId: id,
        selectedSide: side,
        xray: id !== null,
        selectedMeridianId: id !== null ? (meridianId ?? s.selectedMeridianId) : s.selectedMeridianId,
        hoveredPointId: null,
        qiFlowPlaying: id !== null ? false : s.qiFlowPlaying,
      })),
    hoverPoint: (id, side = 'L') => set({ hoveredPointId: id, hoveredSide: side }),
    setAnatomyLayer: (layer) => set({ anatomyLayer: layer }),
    toggleQiFlow: () =>
      set((s) =>
        s.qiFlowPlaying
          ? { qiFlowPlaying: false }
          : {
              // 起播：清空手動選取，讓氣流獨占畫面（flowMeridianId 由 QiFlow 場景推進）
              qiFlowPlaying: true,
              selectedPointId: null,
              selectedMeridianId: null,
              selectedSymptomId: null,
              selectedComboId: null,
              xray: false,
            },
      ),
    setFlowMeridian: (id) => set({ flowMeridianId: id }),
    startQuiz: () =>
      set({
        quizActive: true,
        quizTargetId: null,
        selectedPointId: null,
        selectedMeridianId: null,
        selectedSymptomId: null,
        selectedComboId: null,
        xray: false,
        qiFlowPlaying: false,
      }),
    setQuizTarget: (id, side = 'L') => set({ quizTargetId: id, quizTargetSide: side }),
    endQuiz: () => set({ quizActive: false, quizTargetId: null }),
    setSearchOpen: (open) => set({ searchOpen: open }),
    reset: () =>
      set({
        selectedPointId: null,
        xray: false,
        anatomyLayer: 'skin',
        selectedMeridianId: null,
        selectedSymptomId: null,
        selectedComboId: null,
        qiFlowPlaying: false,
      }),
  },
}))

// 供無頭 smoke test 以確定性方式驅動選擇（避免脆弱的 3D 座標點擊）
declare global {
  interface Window { __QH_STORE: typeof useAppStore }
}
window.__QH_STORE = useAppStore
