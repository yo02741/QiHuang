/**
 * 無頭視覺 smoke test（playwright-core，不用測試框架）。
 * 前置：npm run build（本腳本會自行啟動 vite preview）。
 *
 * 流程（滾動敘事版）：
 *   載入 → landing 截圖 → 逐章捲動（等 data-qh-section + 相機阻尼落定）
 *   → 選穴 focus + 滾動自動退出驗證 → 終章進自由探索 → 選經絡
 *   → ?az 四方位截圖（free 模式）→ 行動視口捲動 + 選穴抽屜
 *
 * 無頭 WebGL 旗標說明：Chromium 於 headless 環境需 SwiftShader 軟體算圖；
 * 若 angle/swiftshader 失效，備援旗標為 --use-gl=swiftshader。
 */
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'

const PORT = 4173
const BASE = `http://localhost:${PORT}`
const SHOT_DIR = new URL('../screenshots/', import.meta.url).pathname

/** 依序尋找可用的 Chromium：CI 預裝 → playwright cache → 系統 Chrome */
function findChrome() {
  for (const base of ['/opt/pw-browsers', `${homedir()}/.cache/ms-playwright`]) {
    if (!existsSync(base)) continue
    for (const dir of readdirSync(base).filter((d) => d.startsWith('chromium-')).sort().reverse()) {
      const p = `${base}/${dir}/chrome-linux/chrome`
      if (existsSync(p)) return p
    }
  }
  for (const p of ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']) {
    if (existsSync(p)) return p
  }
  return null
}
const chromePath = findChrome()
if (!chromePath) {
  console.error('找不到 Chromium（/opt/pw-browsers、~/.cache/ms-playwright 或系統 Chrome）')
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

/**
 * 防黑幀截圖：SwiftShader 偶發「合成器餓死」的整幀黑（PNG 壓縮後極小），
 * 以檔案大小啟發式偵測，黑幀就再等幀重拍（最多 3 次）。
 */
async function shoot(p, path, minBytes = 40000) {
  for (let attempt = 0; ; attempt++) {
    const buf = await p.screenshot({ path })
    if (buf.length >= minBytes || attempt >= 2) {
      if (buf.length < minBytes) console.warn(`⚠ ${path} 疑似黑幀（${buf.length}B），已保留最後一次`)
      return
    }
    await p.waitForTimeout(1200)
    await settleFrames(p, 40)
  }
}

/** 捲動到「第 index 章、章內進度 progress」（rawProgress = index + progress） */
async function scrollToSection(p, id, index, progress = 0.85) {
  await p.evaluate(
    ({ id, progress }) => {
      const el = document.querySelector(`#sec-${id}`)
      const rect = el.getBoundingClientRect()
      const top = rect.top + window.scrollY
      window.scrollTo({ top: top + progress * rect.height - window.innerHeight / 2 })
    },
    { id, progress },
  )
  await p.waitForSelector(`body[data-qh-section="${index}"]`, { timeout: 15000 })
  // 相機阻尼（λ≈0.22s）與穴位點亮動畫落定（牆鐘）＋ 合成新幀
  await p.waitForTimeout(1800)
  await settleFrames(p, 40)
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
  // 先完整跑一次「載入→選穴」把 shader cache 編熱，正式截圖走第二次載入
  await page.goto(`${BASE}/?az=0&shot`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('body[data-qh-ready="true"]', { timeout: 30000 })
  await page.evaluate(() => window.__QH_STORE.getState().actions.selectPoint('PC6', 'PC'))
  await settleFrames(page, 80, 180000)
  console.log('✓ 暖機完成（shader cache）')

  // ── 滾動敘事 ──
  await page.goto(`${BASE}/?shot`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('body[data-qh-ready="true"]', { timeout: 30000 })
  await page.waitForSelector('body[data-qh-mode="story"]', { timeout: 5000 })
  await page.waitForTimeout(2800) // 經絡線交錯淡入（牆鐘時間）
  await settleFrames(page, 60)
  await shoot(page, `${SHOT_DIR}01-landing.png`)
  console.log('✓ 01-landing.png')

  // 逐章捲動採樣（涵蓋正面/頭頂俯瞰/背面/足部四種鏡位）
  const stops = [
    ['face-front', 1],
    ['crown', 3],
    ['back', 8],
    ['foot', 12],
  ]
  for (const [id, index] of stops) {
    await scrollToSection(page, id, index)
    await shoot(page, `${SHOT_DIR}02-section-${id}.png`)
    console.log(`✓ 02-section-${id}.png`)
  }

  // 導覽 spotlight：胸章停駐時，右側面板應連動顯示最新點亮的穴位
  await scrollToSection(page, 'chest', 7)
  await page.waitForSelector('.qh-panel--tour', { timeout: 5000 })
  console.log('✓ 導覽 spotlight 面板連動出現')

  // 章內選穴 focus：選 PC6 內關 → 面板 + 透視 + 臟腑標籤；再滾動應自動退出
  await page.evaluate(() => window.__QH_STORE.getState().actions.selectPoint('PC6', 'PC'))
  await page.getByText('內關').first().waitFor({ timeout: 5000 })
  await page.getByText('PC6').first().waitFor({ timeout: 5000 })
  await page.locator('.qh-organ-label-name', { hasText: '心包' }).first().waitFor({ timeout: 5000 })
  console.log('✓ 臟腑名稱標籤浮現（心包）')
  await page.waitForTimeout(2200) // 鏡頭聚焦 + 身體淡出
  await settleFrames(page, 30)
  await shoot(page, `${SHOT_DIR}03-point-xray.png`)
  console.log('✓ 03-point-xray.png（面板含 內關/PC6）')

  await page.evaluate(() => window.scrollBy({ top: 300 }))
  await page.waitForFunction(
    () => window.__QH_STORE.getState().selectedPointId === null,
    undefined,
    { timeout: 5000 },
  )
  await page.waitForTimeout(1500) // 相機接回滾動軌道
  await settleFrames(page, 30)
  console.log('✓ focus 中滾動自動退出選穴，相機接回軌道')

  // 終章 → 自由探索：MeridianList 出現、鏡頭回 HOME
  await scrollToSection(page, 'finale', 13, 0.6)
  await page.getByRole('button', { name: '進入自由探索' }).click()
  await page.waitForSelector('body[data-qh-mode="free"]', { timeout: 5000 })
  await page.waitForTimeout(1600)
  await settleFrames(page, 30)
  await page.evaluate(() => window.__QH_STORE.getState().actions.selectMeridian('LU'))
  await page.waitForTimeout(900)
  await settleFrames(page, 30)
  await shoot(page, `${SHOT_DIR}04-free-meridian-lu.png`)
  console.log('✓ 04-free-meridian-lu.png（自由探索 + 肺經）')

  // Esc 復位
  await page.keyboard.press('Escape')
  await page.waitForTimeout(1200)
  await settleFrames(page, 30)

  //「重看導覽」：free → 回到滾動敘事頂部
  await page.getByRole('button', { name: '重看導覽' }).click()
  await page.waitForSelector('body[data-qh-mode="story"]', { timeout: 5000 })
  await page.waitForFunction(() => window.scrollY < 10, undefined, { timeout: 5000 })
  console.log('✓ 重看導覽 → 回到滾動敘事頂部')

  // 銅人四方位截圖（美術迭代迴圈用；?az 直進 free 模式）
  for (const az of [0, 90, 180, 270]) {
    await page.goto(`${BASE}/?az=${az}&shot`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('body[data-qh-ready="true"]', { timeout: 30000 })
    await settleFrames(page, 60)
    await shoot(page, `${SHOT_DIR}body-az${az}.png`)
    console.log(`✓ body-az${az}.png`)
  }
  await page.close()

  // ── 行動視口（390×844）── 底部文案卡 / 捲動 / 選穴抽屜
  // SwiftShader 下兩個 WebGL context 併行會互相餓死，故桌機分頁已先關
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  })
  mobile.on('pageerror', (e) => errors.push(`mobile pageerror: ${e.message}`))
  mobile.on('console', (m) => {
    if (m.type() === 'error') errors.push(`mobile console.error: ${m.text()}`)
  })
  await mobile.goto(`${BASE}/?shot`, { waitUntil: 'domcontentloaded' })
  await mobile.waitForSelector('body[data-qh-ready="true"]', { timeout: 30000 })
  await mobile.waitForTimeout(2800)
  await settleFrames(mobile, 60)
  await shoot(mobile, `${SHOT_DIR}05-mobile-landing.png`)
  console.log('✓ 05-mobile-landing.png')

  await scrollToSection(mobile, 'face-front', 1)
  await shoot(mobile, `${SHOT_DIR}06-mobile-section.png`)
  console.log('✓ 06-mobile-section.png')

  await scrollToSection(mobile, 'lower-limb', 11)
  await mobile.evaluate(() => window.__QH_STORE.getState().actions.selectPoint('ST36', 'ST'))
  await mobile.getByText('足三里').first().waitFor({ timeout: 5000 })
  await mobile.waitForTimeout(2200)
  await settleFrames(mobile, 30)
  await shoot(mobile, `${SHOT_DIR}07-mobile-panel.png`)
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
