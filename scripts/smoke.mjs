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

/** 等到 R3F 再產出 n 幀新畫面（保證 shader 編譯完成且畫面已合成） */
async function settleFrames(p, n = 30, timeout = 90000) {
  const start = await p.evaluate(() => Number(document.body.dataset.qhFrames ?? 0))
  await p.waitForFunction(
    (target) => Number(document.body.dataset.qhFrames ?? 0) >= target,
    start + n,
    { timeout },
  )
}

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

  // deviceScaleFactor 1：SwiftShader 軟體算圖下 bloom 很吃像素量
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`)
  })

  // 暖機：SwiftShader 首次載入的 shader 冷編譯會餓死合成器（黑幀數十秒）；
  // 先完整跑一次「載入→進入」把 shader cache 編熱，正式截圖走第二次載入
  await page.goto(`${BASE}/?az=0`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('body[data-qh-ready="true"]', { timeout: 30000 })
  await page.evaluate(() => window.__QH_STORE.getState().actions.selectPoint('PC6', 'PC'))
  await settleFrames(page, 80, 180000)
  console.log('✓ 暖機完成（shader cache）')

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('body[data-qh-ready="true"]', { timeout: 30000 })
  await settleFrames(page, 60)
  await page.screenshot({ path: `${SHOT_DIR}01-intro.png` })
  console.log('✓ 01-intro.png')

  // 進入：點真實按鈕 → 等 phase=explore（鏡頭飛入完成）
  await page.getByRole('button', { name: '進入' }).click()
  await page.waitForSelector('body[data-qh-phase="explore"]', { timeout: 45000 })
  await page.waitForTimeout(2800) // 經絡線交錯淡入（牆鐘時間）
  await settleFrames(page, 60)
  await page.screenshot({ path: `${SHOT_DIR}02-explore.png` })
  console.log('✓ 02-explore.png')

  // 銅人四方位截圖（美術迭代迴圈用）
  for (const az of [0, 90, 180, 270]) {
    await page.goto(`${BASE}/?az=${az}`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('body[data-qh-ready="true"]', { timeout: 30000 })
    await settleFrames(page, 60)
    await page.screenshot({ path: `${SHOT_DIR}body-az${az}.png` })
    console.log(`✓ body-az${az}.png`)
  }

  // 選經絡 / 選穴（以 store 驅動，避免脆弱的 3D 座標點擊）
  // 沿用已進入的頁面，避免重載後 SwiftShader 重新編譯 shader 的黑幀
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('body[data-qh-ready="true"]', { timeout: 30000 })
  await page.getByRole('button', { name: '進入' }).click()
  await page.waitForSelector('body[data-qh-phase="explore"]', { timeout: 45000 })
  await page.waitForTimeout(2800)
  await settleFrames(page, 60)
  await page.evaluate(() => window.__QH_STORE.getState().actions.selectMeridian('LU'))
  await page.waitForTimeout(900)
  await settleFrames(page, 30)
  await page.screenshot({ path: `${SHOT_DIR}03-meridian-lu.png` })
  console.log('✓ 03-meridian-lu.png')

  // 選 PC6 內關：面板應顯示穴名/代碼，身體透視、心包區發光
  await page.evaluate(() => window.__QH_STORE.getState().actions.selectPoint('PC6', 'PC'))
  await page.getByText('內關').first().waitFor({ timeout: 5000 })
  await page.getByText('PC6').first().waitFor({ timeout: 5000 })
  await page.waitForTimeout(2200) // 鏡頭聚焦 + 身體淡出
  await settleFrames(page, 30)
  await page.screenshot({ path: `${SHOT_DIR}04-point-xray.png` })
  console.log('✓ 04-point-xray.png（面板含 內關/PC6）')

  // Esc 復位
  await page.keyboard.press('Escape')
  await page.waitForTimeout(1600)
  await settleFrames(page, 30)
  await page.screenshot({ path: `${SHOT_DIR}05-reset.png` })
  console.log('✓ 05-reset.png')

  // ── 行動視口（390×844）── chip bar / 底部抽屜
  // 先關桌機分頁：SwiftShader 下兩個 WebGL context 併行會互相餓死
  await page.close()
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  })
  mobile.on('pageerror', (e) => errors.push(`mobile pageerror: ${e.message}`))
  mobile.on('console', (m) => {
    if (m.type() === 'error') errors.push(`mobile console.error: ${m.text()}`)
  })
  await mobile.goto(BASE, { waitUntil: 'domcontentloaded' })
  await mobile.waitForSelector('body[data-qh-ready="true"]', { timeout: 30000 })
  await mobile.getByRole('button', { name: '進入' }).click()
  await mobile.waitForSelector('body[data-qh-phase="explore"]', { timeout: 45000 })
  await mobile.waitForTimeout(2800)
  await settleFrames(mobile, 60)
  await mobile.screenshot({ path: `${SHOT_DIR}06-mobile-explore.png` })
  console.log('✓ 06-mobile-explore.png')

  await mobile.evaluate(() => window.__QH_STORE.getState().actions.selectPoint('ST36', 'ST'))
  await mobile.getByText('足三里').first().waitFor({ timeout: 5000 })
  await mobile.waitForTimeout(2200)
  await settleFrames(mobile, 30)
  await mobile.screenshot({ path: `${SHOT_DIR}07-mobile-panel.png` })
  console.log('✓ 07-mobile-panel.png（抽屜含 足三里）')
  await mobile.close()

  if (errors.length) {
    console.error(`✗ 偵測到 ${errors.length} 筆 console/page 錯誤：`)
    for (const e of errors) console.error('  ' + e)
    process.exitCode = 1
  } else {
    console.log('✓ 無 console 錯誤')
  }
} catch (err) {
  console.error('✗ smoke 失敗：', err)
  if (errors.length) {
    console.error(`（另收集到 ${errors.length} 筆 console/page 錯誤）`)
    for (const e of errors) console.error('  ' + e)
  }
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
  killPreview()
  // 保證退出：不讓任何殘留 handle 掛住程序
  process.exit(process.exitCode ?? 0)
}
