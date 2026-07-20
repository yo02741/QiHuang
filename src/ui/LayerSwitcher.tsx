import { useAppStore, type AnatomyLayer } from '@/store/useAppStore'

/**
 * 解剖分層切換（自由探索）：銅身 → 肌肉 → 骨骼，由外而內剝開。
 * 骨架與銅身共用骨架定義，故切到骨骼時，依骨度分寸定位的穴位
 * 正落在對應骨頭上——選一穴即見「腕上二寸」標在橈尺骨間。
 */
const LAYERS: { id: AnatomyLayer; label: string }[] = [
  { id: 'skin', label: '銅身' },
  { id: 'muscle', label: '肌肉' },
  { id: 'skeleton', label: '骨骼' },
]

export function LayerSwitcher() {
  const mode = useAppStore((s) => s.mode)
  const quizActive = useAppStore((s) => s.quizActive)
  const layer = useAppStore((s) => s.anatomyLayer)
  const { setAnatomyLayer } = useAppStore((s) => s.actions)

  if (mode !== 'free' || quizActive) return null

  return (
    <div className="qh-layers" role="group" aria-label="解剖分層">
      <div className="qh-layers-seg">
        {LAYERS.map((l) => (
          <button
            key={l.id}
            type="button"
            className={`qh-layer ${layer === l.id ? 'is-active' : ''}`}
            onClick={() => setAnatomyLayer(l.id)}
          >
            {l.label}
          </button>
        ))}
      </div>
      {layer === 'skeleton' && (
        <span className="qh-layers-hint">穴位依骨度分寸定位——選一穴看它標在骨上</span>
      )}
    </div>
  )
}
