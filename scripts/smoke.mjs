/**
 * 無頭視覺 smoke test（playwright-core，不用測試框架）。
 * 前置：npm run build（本腳本會自行啟動 vite preview）。
 *
 * 無頭 WebGL 旗標說明：Chromium 於 headless 環境需 SwiftShader 軟體算圖；
 * 若 angle/swiftshader 失效，備援旗標為 --use-gl=swiftshader。
 */
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { globSync } from 'node:fs'
import { mkdirSync } from 'node:fs'

const PORT = 4173
const BASE = `http://localhost:${PORT}`
const SHOT_DIR = new URL('../screenshots/', import.meta.url).pathname

// 以 glob 解析預裝 Chromium 路徑，免除 playwright 版本↔瀏覽器 build 對映問題
const [chromePath] = globSync('/opt/pw-browsers/chromium-*/chrome-linux/chrome')
if (!chromePath) {
  console.error('找不到預裝 Chromium（/opt/pw-browsers/chromium-*）')
  process.exit(1)
}

// detached + 整個 process group 一起殺：npm → vite 孫程序若殘留，
// 會佔住 4173 埠並讓本程序的 stdio pipe 無法關閉
const preview = spawn('npm', ['run', 'preview'], { stdio: 'ignore', detached: true })
const killPreview = () => {
  try { process.kill(-preview.pid, 'SIGTERM') } catch { /* already dead */ }
}
process.on('exit', killPreview)

async function waitForServer(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE)
      if (res.ok) return
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('preview server 未在時限內啟動')
}

const errors = []
let browser
try {
  await waitForServer()
  mkdirSync(SHOT_DIR, { recursive: true })

  browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--hide-scrollbars',
    ],
  })

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`)
  })

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('body[data-qh-ready="true"]', { timeout: 30000 })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${SHOT_DIR}01-stage.png` })
  console.log('✓ 01-stage.png')

  // 銅人四方位截圖（美術迭代迴圈用）
  for (const az of [0, 90, 180, 270]) {
    await page.goto(`${BASE}/?az=${az}`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('body[data-qh-ready="true"]', { timeout: 15000 })
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${SHOT_DIR}02-body-az${az}.png` })
    console.log(`✓ 02-body-az${az}.png`)
  }

  // 選經絡 / 選穴（以 store 驅動，避免脆弱的 3D 座標點擊）
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('body[data-qh-ready="true"]', { timeout: 15000 })
  await page.evaluate(() => window.__QH_STORE.getState().actions.selectMeridian('LU'))
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${SHOT_DIR}03-meridian-lu.png` })
  console.log('✓ 03-meridian-lu.png')

  await page.evaluate(() => window.__QH_STORE.getState().actions.selectPoint('LI4', 'LI'))
  await page.waitForTimeout(1800)
  await page.screenshot({ path: `${SHOT_DIR}04-point-xray.png` })
  console.log('✓ 04-point-xray.png')

  // ---- 後續里程碑會在此擴充：進入 → 面板斷言 → 復位 ----

  if (errors.length) {
    console.error(`✗ 偵測到 ${errors.length} 筆 console/page 錯誤：`)
    for (const e of errors) console.error('  ' + e)
    process.exitCode = 1
  } else {
    console.log('✓ 無 console 錯誤')
  }
} catch (err) {
  console.error('✗ smoke 失敗：', err)
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
  killPreview()
  // 保證退出：不讓任何殘留 handle 掛住程序
  process.exit(process.exitCode ?? 0)
}
