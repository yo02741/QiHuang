import { captureSnapshot } from './snapshot'

/**
 * 成績卡：2D canvas 合成 1080×1350（IG 4:5）PNG——
 * 水墨底 + 鎏金「岐黃」+ 銅人快照（WebGL 當幀）+ 大分數 + 評語 + 五行點綴。
 * 手機優先走系統分享（navigator.share 帶檔案），否則下載。
 */

const W = 1080
const H = 1350
const GOLD = '#E3B341'
const INK = '#E8E3D5'
const DIM = '#9B9484'
const WUXING = ['#3FA47A', '#E0453A', '#D9A441', '#DDD6C7', '#2F5DA8'] // 木火土金水

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export async function makeScoreCard(score: number, total: number, grade: string): Promise<string> {
  await document.fonts.ready // 確保 Noto 字型可用於 canvas

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // 底：墨黑 + 中央金暈 + 四角壓暗
  ctx.fillStyle = '#0B0E12'
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W / 2, 620, 60, W / 2, 620, 720)
  glow.addColorStop(0, 'rgba(227,179,65,0.14)')
  glow.addColorStop(1, 'rgba(227,179,65,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // 標題「岐黃」金字 + 副標
  const title = ctx.createLinearGradient(0, 90, 0, 250)
  title.addColorStop(0, '#F4E3B2')
  title.addColorStop(0.55, GOLD)
  title.addColorStop(1, '#8A6A24')
  ctx.fillStyle = title
  ctx.font = '700 150px "Noto Serif TC", serif'
  ctx.textAlign = 'center'
  ctx.fillText('岐 黃', W / 2, 226)
  ctx.fillStyle = DIM
  ctx.font = '400 34px "Noto Sans TC", sans-serif'
  ctx.fillText('循 經 取 穴 ・ 銅 人 明 堂', W / 2, 292)

  // 銅人快照（金框圓角窗）；抓不到就畫裝飾圓環
  const snap = captureSnapshot()
  const fx = W / 2 - 300
  const fy = 340
  const fw = 600
  const fh = 480
  ctx.save()
  roundRect(ctx, fx, fy, fw, fh, 22)
  ctx.clip()
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
    ctx.arc(W / 2, fy + fh / 2, 150, 0, Math.PI * 2)
    ctx.stroke()
  }
  // 窗內下緣壓暗，讓後續文字浮起
  const shade = ctx.createLinearGradient(0, fy + fh - 140, 0, fy + fh)
  shade.addColorStop(0, 'rgba(11,14,18,0)')
  shade.addColorStop(1, 'rgba(11,14,18,0.8)')
  ctx.fillStyle = shade
  ctx.fillRect(fx, fy, fw, fh)
  ctx.restore()
  ctx.strokeStyle = 'rgba(227,179,65,0.45)'
  ctx.lineWidth = 2.5
  roundRect(ctx, fx, fy, fw, fh, 22)
  ctx.stroke()

  // 分數
  ctx.fillStyle = DIM
  ctx.font = '400 30px "Noto Sans TC", sans-serif'
  ctx.fillText('穴 位 測 驗 成 績', W / 2, 918)
  ctx.fillStyle = GOLD
  ctx.font = '700 190px "Noto Serif TC", serif'
  ctx.fillText(String(score), W / 2 - 68, 1102)
  ctx.fillStyle = DIM
  ctx.font = '700 64px "Noto Serif TC", serif'
  ctx.fillText(`/ ${total}`, W / 2 + 118, 1098)
  ctx.fillStyle = INK
  ctx.font = '400 40px "Noto Serif TC", serif'
  ctx.fillText(grade, W / 2, 1178)

  // 五行點 + 網址
  const dotY = 1238
  WUXING.forEach((c, i) => {
    ctx.fillStyle = c
    ctx.beginPath()
    ctx.arc(W / 2 + (i - 2) * 38, dotY, 7, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.fillStyle = DIM
  ctx.font = '400 26px "Noto Sans TC", sans-serif'
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
export async function shareOrDownloadCard(score: number, total: number, grade: string): Promise<void> {
  const dataUrl = await makeScoreCard(score, total, grade)
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
    __QH_CARD: (score: number, total: number, grade: string) => Promise<string>
  }
}
window.__QH_CARD = makeScoreCard
