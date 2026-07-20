import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { Experience } from '@/scene/Experience'
import { useIsCoarsePointer } from '@/hooks/useIsCoarsePointer'
import { Header } from '@/ui/Header'
import { ExplorePanel } from '@/ui/ExplorePanel'
import { PointPanel } from '@/ui/PointPanel'
import { Footer } from '@/ui/Footer'
import { StorySections } from '@/ui/StorySections'
import { StepNav } from '@/ui/StepNav'
import { ViewCompass } from '@/ui/ViewCompass'
import { LayerSwitcher } from '@/ui/LayerSwitcher'
import { FlowClock } from '@/ui/FlowClock'
import { QuizPanel } from '@/ui/QuizPanel'
import { SearchPalette } from '@/ui/SearchPalette'
import { useAppStore } from '@/store/useAppStore'
import { ACUPOINT_MAP } from '@/data/acupoints'
import { SECTION_INDEX } from '@/data/sections'

/** 依 quizActive 掛載/卸載 QuizPanel：每次進測驗都是全新一輪（首題 effect 觸發） */
function QuizGate() {
  const quizActive = useAppStore((s) => s.quizActive)
  return quizActive ? <QuizPanel /> : null
}

/**
 * 版型三層：fixed 全螢幕 canvas（底）→ 文流滾動軌道 StorySections（中，
 * 撐高頁面驅動敘事）→ fixed overlay UI（頂）。free 模式軌道卸載，
 * 頁面回到單屏，即原本的自由互動 app。
 */
export default function App() {
  const coarse = useIsCoarsePointer()
  // 效能自動降階：掉幀時降 dpr，回穩時升回
  const maxDpr = Math.min(window.devicePixelRatio, coarse ? 1.5 : 2)
  const [dpr, setDpr] = useState(maxDpr)
  // ?shot：無頭截圖模式。CDP 截圖可能在 buffer swap 後抓到清空的
  // canvas（偶發整幀黑），preserveDrawingBuffer 讓像素常駐可讀
  const shotMode = new URLSearchParams(window.location.search).has('shot')

  // Esc：選穴 → 配穴/症狀 → 經絡，逐層退出
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const {
        searchOpen, quizActive, selectedPointId, selectedMeridianId, selectedSymptomId, selectedComboId, actions,
      } = useAppStore.getState()
      if (searchOpen) actions.setSearchOpen(false)
      else if (quizActive) actions.endQuiz()
      else if (selectedPointId) actions.selectPoint(null)
      else if (selectedComboId) actions.selectCombo(null)
      else if (selectedSymptomId) actions.selectSymptom(null)
      else if (selectedMeridianId) actions.selectMeridian(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Deep link：?point=LI4 直達穴位（store boot 已切 free）；?sec=back 直達章節
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const pointId = params.get('point')?.toUpperCase()
    const secId = params.get('sec')
    if (pointId && ACUPOINT_MAP.has(pointId)) {
      const point = ACUPOINT_MAP.get(pointId)!
      // 稍候讓 CameraRig 掛載完成，再觸發選穴飛行
      const t = setTimeout(
        () => useAppStore.getState().actions.selectPoint(pointId, point.meridianId),
        600,
      )
      return () => clearTimeout(t)
    }
    if (secId && SECTION_INDEX.has(secId as never)) {
      // 等滾動軌道掛載與版面穩定後，捲到該章停駐段
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = document.querySelector(`#sec-${secId}`)
          if (!el) return
          const rect = el.getBoundingClientRect()
          window.scrollTo({ top: rect.top + window.scrollY + rect.height * 0.6 - window.innerHeight / 2 })
        })
      })
      return () => cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      <div className="qh-canvas">
        <Canvas
          dpr={dpr}
          gl={{
            antialias: false,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: shotMode,
          }}
          camera={{ fov: 42, near: 0.1, far: 30, position: [0, 1.35, 3.2] }}
        >
          <PerformanceMonitor
            onDecline={() => setDpr(1)}
            onIncline={() => setDpr(maxDpr)}
          >
            <Experience />
          </PerformanceMonitor>
        </Canvas>
      </div>
      <StorySections />
      <div className="qh-overlay">
        <Header />
        <ExplorePanel />
        <StepNav />
        <PointPanel />
        <ViewCompass />
        <LayerSwitcher />
        <FlowClock />
        <QuizGate />
        <SearchPalette />
        <Footer />
      </div>
    </>
  )
}
