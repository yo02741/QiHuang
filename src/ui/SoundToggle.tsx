import { useEffect, useSyncExternalStore } from 'react'
import { soundscape } from '@/lib/soundscape'
import { useAppStore } from '@/store/useAppStore'

/**
 * 音景開關（header 工具列）。同時是互動音效的接線點：
 * 選穴→高音撥弦；循經換經/導覽換穴→輕撥。測驗對錯音效由 QuizPanel 直呼。
 */
export function SoundToggle() {
  const on = useSyncExternalStore(
    (cb) => soundscape.subscribe(cb),
    () => soundscape.on,
  )

  useEffect(() => {
    soundscape.restorePreference()
    return useAppStore.subscribe((s, prev) => {
      if (s.selectedPointId && s.selectedPointId !== prev.selectedPointId) {
        soundscape.cueSelect()
      } else if (s.qiFlowPlaying && s.flowMeridianId !== prev.flowMeridianId) {
        soundscape.cueFlow()
      } else if (
        s.mode === 'story' &&
        s.spotlightPointId &&
        s.spotlightPointId !== prev.spotlightPointId
      ) {
        soundscape.cueFlow()
      }
    })
  }, [])

  return (
    <button
      type="button"
      className={`qh-sound ${on ? 'is-on' : ''}`}
      onClick={() => soundscape.toggle()}
      aria-pressed={on}
      aria-label="音景開關"
      title={on ? '關閉音景' : '開啟音景（程式生成的古琴底音）'}
    >
      ♪
    </button>
  )
}
