import { useAppStore } from '@/store/useAppStore'

export function Footer() {
  const phase = useAppStore((s) => s.phase)
  return (
    <footer className={`qh-footer ${phase === 'explore' ? 'is-visible' : ''}`}>
      本站內容僅供教育與文化展示用途，非醫療建議；穴位與經絡位置為藝術示意。
    </footer>
  )
}
