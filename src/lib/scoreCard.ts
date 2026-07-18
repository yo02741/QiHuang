import { captureSnapshot } from './snapshot'

/**
 * 成績卡：2D canvas 合成 1080×1350（IG 4:5）PNG——
 * 水墨底 + 鎏金「岐黃」+ 銅人快照與大分數並排（附硃印）+
 * 下方 2×5 作答明細（✓✗ 徽章 + 每題內容）。
 * 手機優先走系統分享（navigator.share 帶檔案），否則下載。
 */

export interface CardResult {
  ok: boolean
  /** 一行明細：看穴猜名「穴名・代碼」；依症選穴「症狀 → 穴名」 */
  text: string
}

const W = 1080
const H = 1350
const GOLD = '#E3B341'
const INK = '#E8E3D5'
const DIM = '#9B9484'
const GOOD = '#3FA47A'
const BAD = '#E0453A'
const WUXING = [GOOD, BAD, '#D9A441', '#DDD6C7', '#2F5DA8'] // 木火土金水

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** 超寬就截尾加省略號（明細列防爆版） */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1)
  return `${t}…`
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export async function makeScoreCard(
  score: number,
  total: number,
  grade: string,
  results: CardResult[] = [],
): Promise<string> {
  await document.fonts.ready // 確保 Noto 字型可用於 canvas

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // 底：墨黑 + 中央金暈
  ctx.fillStyle = '#0B0E12'
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W / 2, 540, 60, W / 2, 540, 760)
  glow.addColorStop(0, 'rgba(227,179,65,0.13)')
  glow.addColorStop(1, 'rgba(227,179,65,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // 標題「岐黃」金字 + 副標
  const title = ctx.createLinearGradient(0, 80, 0, 220)
  title.addColorStop(0, '#F4E3B2')
  title.addColorStop(0.55, GOLD)
  title.addColorStop(1, '#8A6A24')
  ctx.fillStyle = title
  ctx.font = '700 130px "Noto Serif TC", serif'
  ctx.textAlign = 'center'
  ctx.fillText('岐 黃', W / 2, 196)
  ctx.fillStyle = DIM
  ctx.font = '400 30px "Noto Sans TC", sans-serif'
  ctx.fillText('循 經 取 穴 ・ 銅 人 明 堂', W / 2, 254)

  // ── 中段左：銅人快照（金框直式圓角窗）；抓不到就畫裝飾圓環
  const fx = 84
  const fy = 300
  const fw = 400
  const fh = 510
  ctx.save()
  roundRect(ctx, fx, fy, fw, fh, 22)
  ctx.clip()
  const snap = captureSnapshot()
  if (snap) {
    try {
      const img = await loadImage(snap)
      // cover-fit 置中裁切
      const s = Math.max(fw / img.width, fh / img.height)
      const dw = img.width * s
      const dh = img.height * s
      ctx.drawImage(img, fx + (fw - dw) / 2, fy + (fh - dh) / 2, dw, dh)
    } catch {
      ctx.fillStyle = '#10131A'
      ctx.fillRect(fx, fy, fw, fh)
    }
  } else {
    ctx.fillStyle = '#10131A'
    ctx.fillRect(fx, fy, fw, fh)
    ctx.strokeStyle = 'rgba(227,179,65,0.5)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(fx + fw / 2, fy + fh / 2, 110, 0, Math.PI * 2)
    ctx.stroke()
  }
  // 窗內下緣壓暗，避免快照亮部搶戲
  const shade = ctx.createLinearGradient(0, fy + fh - 120, 0, fy + fh)
  shade.addColorStop(0, 'rgba(11,14,18,0)')
  shade.addColorStop(1, 'rgba(11,14,18,0.8)')
  ctx.fillStyle = shade
  ctx.fillRect(fx, fy, fw, fh)
  ctx.restore()
  ctx.strokeStyle = 'rgba(227,179,65,0.45)'
  ctx.lineWidth = 2.5
  roundRect(ctx, fx, fy, fw, fh, 22)
  ctx.stroke()

  // ── 中段右：測驗成績（窗右緣與卡右緣的置中軸）
  const rx = (fx + fw + (W - 84)) / 2
  ctx.textAlign = 'center'
  ctx.fillStyle = DIM
  ctx.font = '400 28px "Noto Sans TC", sans-serif'
  ctx.fillText('穴 位 測 驗 成 績', rx, 396)
  ctx.fillStyle = GOLD
  ctx.font = '700 160px "Noto Serif TC", serif'
  ctx.fillText(String(score), rx - 62, 560)
  ctx.fillStyle = DIM
  ctx.font = '700 56px "Noto Serif TC", serif'
  ctx.fillText(`/ ${total}`, rx + 104, 556)
  ctx.fillStyle = INK
  ctx.font = '400 32px "Noto Serif TC", serif'
  ctx.fillText(grade, rx, 640, 440)

  // 五行點
  WUXING.forEach((c, i) => {
    ctx.fillStyle = c
    ctx.beginPath()
    ctx.arc(rx + (i - 2) * 38, 698, 7, 0, Math.PI * 2)
    ctx.fill()
  })

  // 硃印「明堂」壓底，右欄與快照下緣齊平
  const sy = 734
  ctx.fillStyle = 'rgba(168,54,44,0.92)'
  roundRect(ctx, rx - 33, sy, 66, 66, 8)
  ctx.fill()
  ctx.fillStyle = '#F3E4CE'
  ctx.font = '700 26px "Noto Serif TC", serif'
  ctx.fillText('明', rx, sy + 29)
  ctx.fillText('堂', rx, sy + 58)

  // ── 下段：作答明細（2 欄 × 5 列，✓✗ 徽章 + 題目內容）
  if (results.length > 0) {
    ctx.strokeStyle = 'rgba(227,179,65,0.28)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(120, 866)
    ctx.lineTo(W / 2 - 128, 866)
    ctx.moveTo(W / 2 + 128, 866)
    ctx.lineTo(W - 120, 866)
    ctx.stroke()
    ctx.fillStyle = DIM
    ctx.font = '400 26px "Noto Sans TC", sans-serif'
    ctx.fillText('作 答 結 果', W / 2, 875)

    ctx.textBaseline = 'middle'
    results.slice(0, 10).forEach((r, i) => {
      const col = Math.floor(i / 5)
      const y = 934 + (i % 5) * 62
      const bx = col === 0 ? 170 : 610 // 徽章圓心
      // 題號
      ctx.fillStyle = DIM
      ctx.font = '400 20px "Noto Sans TC", sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(String(i + 1), bx - 32, y + 1)
      // ✓✗ 徽章
      ctx.beginPath()
      ctx.arc(bx, y, 17, 0, Math.PI * 2)
      ctx.fillStyle = r.ok ? 'rgba(63,164,122,0.16)' : 'rgba(224,69,58,0.14)'
      ctx.fill()
      ctx.strokeStyle = r.ok ? GOOD : BAD
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.fillStyle = r.ok ? '#7FD6AC' : '#F0857B'
      ctx.font = '700 20px "Noto Sans TC", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(r.ok ? '✓' : '✗', bx, y + 1)
      // 明細文字
      ctx.fillStyle = INK
      ctx.font = '400 30px "Noto Sans TC", sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(fitText(ctx, r.text, 306), bx + 34, y + 1)
    })
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'center'
  }

  // 網址
  ctx.fillStyle = DIM
  ctx.font = '400 26px "Noto Sans TC", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('yo02741.github.io/QiHuang', W / 2, 1298)

  return canvas.toDataURL('image/png')
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',')
  const mime = head.match(/:(.*?);/)?.[1] ?? 'image/png'
  const bin = atob(body)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/** 手機可分享就走系統分享面板，否則直接下載 PNG */
export async function shareOrDownloadCard(
  score: number,
  total: number,
  grade: string,
  results: CardResult[] = [],
): Promise<void> {
  const dataUrl = await makeScoreCard(score, total, grade, results)
  const blob = dataUrlToBlob(dataUrl)
  const file = new File([blob], 'qihuang-score.png', { type: 'image/png' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: '岐黃 QiHuang 穴位測驗' })
      return
    } catch {
      // 使用者取消分享 → 落回下載
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'qihuang-score.png'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

// 供無頭 smoke test 產卡存檔看圖
declare global {
  interface Window {
    __QH_CARD: (score: number, total: number, grade: string, results?: CardResult[]) => Promise<string>
  }
}
window.__QH_CARD = makeScoreCard
