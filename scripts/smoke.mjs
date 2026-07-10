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
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { inflateSync } from 'node:zlib'

/**
 * 解 PNG 並取樣矩形區域的最大 RGB 亮度（黑幀偵測的 ground truth）。
 * 僅支援 8-bit RGB/RGBA 非交錯（CDP 截圖即此格式）。
 */
function pngRegionMax(buf, x0, y0, w, h) {
  let pos = 8
  let width = 0
  let height = 0
  let colorType = 6
  const idat = []
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('ascii', pos + 4, pos + 8)
    const data = buf.subarray(pos + 8, pos + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      colorType = data[9]
    } else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    pos += 12 + len
  }
  const ch = colorType === 6 ? 4 : 3
  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * ch
  const out = Buffer.alloc(height * stride)
  let rp = 0
  for (let y = 0; y < height; y++) {
    const f = raw[rp++]
    const o = y * stride
    for (let i = 0; i < stride; i++) {
      const cur = raw[rp + i]
      const a = i >= ch ? out[o + i - ch] : 0
      const b = y ? out[o - stride + i] : 0
      const c = i >= ch && y ? out[o - stride + i - ch] : 0
      let v = cur
      if (f === 1) v += a
      else if (f === 2) v += b
      else if (f === 3) v += (a + b) >> 1
      else if (f === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      out[o + i] = v & 0xff
    }
    rp += stride
  }
  let max = 0
  const x1 = Math.min(x0 + w, width)
  const y1 = Math.min(y0 + h, height)
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const o = y * stride + x * ch
      if (out[o] > max) max = out[o]
      if (out[o + 1] > max) max = out[o + 1]
      if (out[o + 2] > max) max = out[o + 2]
    }
  }
  return max
}

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
 * 防黑幀截圖：SwiftShader 下 CDP 的 surface 合成截圖有高機率漏掉
 * WebGL 圖層（canvas buffer 實際有內容）——改用 fromSurface:false
 * 從 renderer 直抓，繞過 surface 合成；檔案過小仍重拍當備援。
 */
const cdpSessions = new WeakMap()
async function shoot(p, path) {
  let cdp = cdpSessions.get(p)
  if (!cdp) {
    cdp = await p.context().newCDPSession(p)
    cdpSessions.set(p, cdp)
  }
  const vp = p.viewportSize()
  // 3D 主體區域（畫面中央偏上）：黑幀時只剩 DOM/背景色（亮度 ≲ 20），
  // 正常場景有金塵/銅身高光（≳ 60）
  const rx = Math.round(vp.width * 0.28)
  const ry = Math.round(vp.height * 0.16)
  const rw = Math.round(vp.width * 0.44)
  const rh = Math.round(vp.height * 0.4)
  for (let attempt = 0; ; attempt++) {
    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: false,
    })
    const buf = Buffer.from(data, 'base64')
    writeFileSync(path, buf)
    const lum = pngRegionMax(buf, rx, ry, rw, rh)
    if (lum >= 28 || attempt >= 6) {
      if (lum < 28) console.warn(`⚠ ${path} 疑似黑幀（3D 區亮度 ${lum}），已保留最後一次`)
      return
    }
    await p.waitForTimeout(900)
    await settleFrames(p, 30)
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

  // 逐章捲動採樣（涵蓋正面/頭頂俯瞰/上下肢斜角/背面/足部鏡位）
  const stops = [
    ['face-front', 1],
    ['crown', 3],
    ['upper-limb', 6],
    ['back', 8],
    ['lower-limb', 11],
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

  // 章內選穴 focus：選 PC6 內關 → 面板（含白話解）+ 透視 + 臟腑標籤；再滾動應自動退出
  await page.evaluate(() => window.__QH_STORE.getState().actions.selectPoint('PC6', 'PC'))
  await page.getByText('內關').first().waitFor({ timeout: 5000 })
  await page.getByText('PC6').first().waitFor({ timeout: 5000 })
  await page.getByText('白話解').first().waitFor({ timeout: 5000 })
  await page.getByText('暈車').first().waitFor({ timeout: 5000 })
  console.log('✓ 白話解區塊顯示（內關含「暈車」情境）')
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

  // 症狀反查：選「頭痛」→ 面板列相關穴位、銅人點亮穴位群
  await page.evaluate(() => window.__QH_STORE.getState().actions.selectSymptom('headache'))
  await page.getByText('症狀反查・頭面').first().waitFor({ timeout: 5000 })
  await page.getByText('風池').first().waitFor({ timeout: 5000 })
  await page.waitForTimeout(900)
  await settleFrames(page, 30)
  await shoot(page, `${SHOT_DIR}05-symptom-headache.png`)
  console.log('✓ 05-symptom-headache.png（症狀反查・頭痛）')

  // 配穴組合：選「四關」→ 面板顯示組合說明與成員
  await page.evaluate(() => window.__QH_STORE.getState().actions.selectCombo('siguan'))
  await page.locator('.qh-panel-title', { hasText: '四關' }).waitFor({ timeout: 5000 })
  await page.getByText('為何搭配').first().waitFor({ timeout: 5000 })
  await page.waitForTimeout(900)
  await settleFrames(page, 30)
  await shoot(page, `${SHOT_DIR}06-combo-siguan.png`)
  console.log('✓ 06-combo-siguan.png（配穴・四關）')

  // 子午流注時辰鐘（free 模式常駐）
  await page.waitForSelector('.qh-flowclock', { timeout: 5000 })
  console.log('✓ 子午流注時辰鐘存在')
  await page.keyboard.press('Escape') // 清配穴

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
  // Deep link：?point=LI4 直達合谷（free 模式 + 面板 + 白話解）
  await page.goto(`${BASE}/?point=LI4&shot`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('body[data-qh-ready="true"]', { timeout: 30000 })
  await page.waitForSelector('body[data-qh-mode="free"]', { timeout: 5000 })
  await page.getByText('合谷').first().waitFor({ timeout: 10000 })
  await page.getByText('面口合谷收').first().waitFor({ timeout: 5000 })
  console.log('✓ Deep link ?point=LI4 直達合谷（含白話解）')
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
  // 手機步進導覽：landing 疊層 + 開始導覽鈕
  await mobile.getByRole('button', { name: /開始導覽/ }).waitFor({ timeout: 5000 })
  await shoot(mobile, `${SHOT_DIR}07-mobile-landing.png`)
  console.log('✓ 07-mobile-landing.png（步進 landing 疊層）')

  //「開始導覽」→ 第一穴（面部章第一穴 攢竹 BL2 成為 spotlight）
  await mobile.getByRole('button', { name: /開始導覽/ }).click()
  await mobile.waitForFunction(
    () => window.__QH_STORE.getState().spotlightPointId === 'BL2',
    undefined,
    { timeout: 10000 },
  )
  await mobile.waitForSelector('.qh-panel--tour.is-collapsed', { timeout: 5000 })
  await mobile.waitForTimeout(1800)
  await settleFrames(mobile, 40)
  await shoot(mobile, `${SHOT_DIR}08-mobile-section.png`)
  console.log('✓ 08-mobile-section.png（開始導覽 → 攢竹 + 迷你卡）')

  //「下一穴」步進
  await mobile.locator('.qh-stepnav-next').click()
  await mobile.waitForFunction(
    () => window.__QH_STORE.getState().spotlightPointId === 'BL1',
    undefined,
    { timeout: 8000 },
  )
  console.log('✓ 下一穴步進（攢竹 → 睛明）')

  // 章節選單跳轉 → 下肢章第一穴
  await mobile.selectOption('.qh-stepnav-select', 'lower-limb')
  await mobile.waitForSelector('body[data-qh-section="11"]', { timeout: 10000 })
  await mobile.waitForFunction(
    () => window.__QH_STORE.getState().spotlightPointId === 'GB31',
    undefined,
    { timeout: 8000 },
  )
  await mobile.waitForTimeout(1800)
  await settleFrames(mobile, 40)
  console.log('✓ 章節選單跳轉（下肢・風市）')

  await mobile.evaluate(() => window.__QH_STORE.getState().actions.selectPoint('ST36', 'ST'))
  await mobile.locator('.qh-panel-title', { hasText: '足三里' }).waitFor({ timeout: 5000 })
  await mobile.waitForSelector('.qh-panel.is-collapsed', { timeout: 5000 })
  await mobile.waitForTimeout(2200)
  await settleFrames(mobile, 30)
  await shoot(mobile, `${SHOT_DIR}09-mobile-panel.png`)
  console.log('✓ 09-mobile-panel.png（迷你卡收合・足三里）')

  // 點迷你卡 → 展開完整詳情（白話解全文可見）
  await mobile.locator('.qh-panel').click()
  await mobile.waitForSelector('.qh-panel.is-expanded', { timeout: 5000 })
  await mobile.getByText('白話解').first().waitFor({ timeout: 5000 })
  await mobile.waitForTimeout(600)
  await shoot(mobile, `${SHOT_DIR}09b-mobile-expanded.png`)
  console.log('✓ 09b-mobile-expanded.png（展開詳情・白話解）')
  await mobile.locator('.qh-panel-handle').click()
  await mobile.waitForSelector('.qh-panel.is-collapsed', { timeout: 5000 })
  console.log('✓ 把手條收回迷你卡')

  // 左上 logo 回首頁：跳回 landing（步進第 0 站，直達不繞章）
  await mobile.locator('.qh-header-brand').click()
  await mobile.getByRole('button', { name: /開始導覽/ }).waitFor({ timeout: 5000 })
  console.log('✓ logo 回首頁（landing 疊層重現）')

  // 手機自由探索：探索 chip bar + 症狀反查 + 抽屜同框不重疊
  await mobile.evaluate(() => {
    const s = window.__QH_STORE.getState()
    s.actions.selectPoint(null)
    s.actions.enterFree()
  })
  await mobile.waitForSelector('body[data-qh-mode="free"]', { timeout: 5000 })
  await mobile.evaluate(() => window.__QH_STORE.getState().actions.selectSymptom('headache'))
  await mobile.getByText('相關穴位').first().waitFor({ timeout: 5000 })
  await mobile.waitForTimeout(1500)
  await settleFrames(mobile, 30)
  await shoot(mobile, `${SHOT_DIR}10-mobile-free.png`)
  console.log('✓ 10-mobile-free.png（手機自由探索・症狀反查）')
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
