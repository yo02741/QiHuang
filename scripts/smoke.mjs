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

/**
 * 頂部版面幾何斷言：header 品牌/測驗鈕/導覽鈕/羅盤/循經鈕
 * 兩兩不得重疊、不得折行（高度異常）、不得超出視口。
 * （實機曾發生：手機 header 折行長高，壓到絕對定位的第二列元素）
 */
async function assertTopLayout(p, label) {
  const issues = await p.evaluate(() => {
    const sels = ['.qh-header-brand', '.qh-header-quiz', '.qh-header-story', '.qh-header-tools', '.qh-compass', '.qh-flow-play']
    const boxes = []
    for (const sel of sels) {
      const el = document.querySelector(sel)
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) continue // 隱藏中不檢查
      boxes.push({ sel, x: r.x, y: r.y, w: r.width, h: r.height })
    }
    const out = []
    for (const b of boxes) {
      if (b.h > 48) out.push(`${b.sel} 高 ${Math.round(b.h)}px（疑似折行）`)
      if (b.x < -1 || b.x + b.w > innerWidth + 1) out.push(`${b.sel} 超出視口寬`)
    }
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j]
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
        const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
        if (ox > 4 && oy > 4) out.push(`${a.sel} 與 ${b.sel} 重疊 ${Math.round(ox)}×${Math.round(oy)}px`)
      }
    }
    return out
  })
  if (issues.length) throw new Error(`${label} 頂部版面問題：${issues.join('；')}`)
  console.log(`✓ ${label} 頂部版面無重疊/折行`)
}

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
    acceptDownloads: true, // 成績卡下載事件斷言
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
  await assertTopLayout(page, '桌機')

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

  // 循經導引：氣彗星沿經絡循行、時辰鐘指針跟隨
  await page.getByRole('button', { name: /循經導引/ }).click()
  await page.waitForFunction(
    () => window.__QH_STORE.getState().qiFlowPlaying === true &&
          window.__QH_STORE.getState().flowMeridianId !== null,
    undefined,
    { timeout: 5000 },
  )
  await page.waitForTimeout(1600) // 讓氣彗星走一段
  await settleFrames(page, 40)
  await shoot(page, `${SHOT_DIR}11-qiflow.png`)
  console.log('✓ 11-qiflow.png（循經導引播放中）')
  await page.getByRole('button', { name: /暫停循經/ }).click()
  await page.waitForFunction(
    () => window.__QH_STORE.getState().qiFlowPlaying === false,
    undefined,
    { timeout: 5000 },
  )
  console.log('✓ 循經導引可暫停')

  //「/」開搜尋盤 → 輸入拼音 hegu → Enter → 直達合谷（面板 + 相機聚焦）
  await page.keyboard.press('/')
  await page.waitForSelector('.qh-search-input', { timeout: 4000 })
  // fill 會自行 focus 元素（開盤的 rAF focus 在無頭下可能還沒生效）
  await page.fill('.qh-search-input', 'hegu')
  await page.waitForSelector('.qh-search-hit', { timeout: 4000 })
  await page.focus('.qh-search-input')
  await page.keyboard.press('Enter')
  await page.waitForFunction(
    () => window.__QH_STORE.getState().selectedPointId === 'LI4',
    undefined,
    { timeout: 5000 },
  )
  await page.locator('.qh-panel-title', { hasText: '合谷' }).waitFor({ timeout: 5000 })
  await page.waitForTimeout(1500)
  await settleFrames(page, 30)
  await shoot(page, `${SHOT_DIR}11b-search-jump.png`)
  console.log('✓ 11b-search-jump.png（搜尋 hegu → Enter 直達合谷）')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(900)

  // 學習測驗：入口鈕 → 開始（銅人高亮目標穴）→ 四選一 → 作答回饋 → Esc 結束
  // noWaitAfter：入口鈕於 startQuiz 後即卸載，避免 Playwright 事後 detach 誤報
  await page.getByRole('button', { name: /穴位測驗/ }).click({ noWaitAfter: true })
  await page.waitForFunction(
    () => window.__QH_STORE.getState().quizActive === true &&
          window.__QH_STORE.getState().quizTargetId !== null,
    undefined,
    { timeout: 5000 },
  )
  await page.waitForSelector('.qh-quiz', { timeout: 5000 })
  const quizOpts = await page.locator('.qh-quiz-option').count()
  if (quizOpts !== 4) throw new Error(`測驗選項應為 4，實際 ${quizOpts}`)
  // 題型交錯：第 1 題（單數）固定為看穴猜名
  const q1Type = await page.locator('.qh-quiz').getAttribute('data-type')
  if (q1Type !== 'name') throw new Error(`第 1 題應為看穴猜名，實際 ${q1Type}`)
  await page.waitForTimeout(1800) // 鏡頭聚焦 + 標記脈動
  await settleFrames(page, 40)
  await shoot(page, `${SHOT_DIR}12-quiz.png`)
  console.log('✓ 12-quiz.png（學習測驗・看穴猜名）')
  await page.locator('.qh-quiz-option').first().click()
  await page.waitForSelector('.qh-quiz-feedback', { timeout: 5000 })
  await page.getByText('正解：').first().waitFor({ timeout: 5000 })
  console.log('✓ 測驗作答回饋與正解顯示')

  // 第 2 題（雙數）固定為依症選穴：出題不洩題（target=null）、作答後揭示
  await page.locator('.qh-quiz-btn.is-primary').click()
  await page.waitForSelector('.qh-quiz[data-type="symptom"]', { timeout: 5000 })
  const preTarget = await page.evaluate(() => window.__QH_STORE.getState().quizTargetId)
  if (preTarget !== null) throw new Error('依症選穴出題時 quizTargetId 應為 null（不洩題）')
  await settleFrames(page, 30)
  await shoot(page, `${SHOT_DIR}12b-quiz-symptom.png`)
  console.log('✓ 12b-quiz-symptom.png（依症選穴・出題不洩題）')
  await page.locator('.qh-quiz-option').first().click()
  await page.waitForSelector('.qh-quiz-feedback', { timeout: 5000 })
  await page.waitForFunction(
    () => window.__QH_STORE.getState().quizTargetId !== null,
    undefined,
    { timeout: 5000 },
  )
  await page.waitForTimeout(1800) // 揭示正解穴位的運鏡
  await settleFrames(page, 30)
  await shoot(page, `${SHOT_DIR}12c-quiz-reveal.png`)
  console.log('✓ 12c-quiz-reveal.png（作答後揭示正解穴位）')
  await page.keyboard.press('Escape')
  await page.waitForFunction(
    () => window.__QH_STORE.getState().quizActive === false,
    undefined,
    { timeout: 5000 },
  )
  console.log('✓ Esc 結束測驗')

  // 成績卡：快速完賽一輪 → canvas 合成卡（存檔看圖）→ 真實下載事件
  await page.getByRole('button', { name: /穴位測驗/ }).click({ noWaitAfter: true })
  await page.waitForSelector('.qh-quiz', { timeout: 5000 })
  for (let i = 0; i < 12; i++) {
    if (await page.locator('.qh-quiz-result').count()) break
    await page.locator('.qh-quiz-option').first().click()
    await page.waitForSelector('.qh-quiz-feedback', { timeout: 5000 })
    await page.locator('.qh-quiz-btn.is-primary').click()
    await page.waitForTimeout(250)
  }
  await page.waitForSelector('.qh-quiz-result', { timeout: 8000 })
  console.log('✓ 快速完賽 → 成績頁')
  const cardData = await page.evaluate(() =>
    window.__QH_CARD(8, 10, '頗有慧根，經穴瞭然於胸。'),
  )
  writeFileSync(`${SHOT_DIR}13-score-card.png`, Buffer.from(cardData.split(',')[1], 'base64'))
  console.log('✓ 13-score-card.png（成績卡合成）')
  const dlPromise = page.waitForEvent('download', { timeout: 10000 })
  await page.getByRole('button', { name: /儲存成績卡/ }).click()
  const dl = await dlPromise
  if (!/qihuang.*\.png/.test(dl.suggestedFilename())) {
    throw new Error(`成績卡下載檔名異常：${dl.suggestedFilename()}`)
  }
  console.log(`✓ 成績卡下載事件（${dl.suggestedFilename()}）`)
  await page.keyboard.press('Escape')
  await page.waitForFunction(
    () => window.__QH_STORE.getState().quizActive === false,
    undefined,
    { timeout: 5000 },
  )

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
  // isMobile+hasTouch：媒體環境成為 hover:none / pointer:coarse，
  // 才能驗證「hover 樣式只給滑鼠裝置」的媒體閘（黏性 hover 回歸防護）
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
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
  await mobile.waitForTimeout(900) // header 淡入完成再量測
  await assertTopLayout(mobile, '手機')
  await mobile.evaluate(() => window.__QH_STORE.getState().actions.selectSymptom('headache'))
  await mobile.getByText('相關穴位').first().waitFor({ timeout: 5000 })
  await mobile.waitForTimeout(1500)
  await settleFrames(mobile, 30)
  await shoot(mobile, `${SHOT_DIR}10-mobile-free.png`)
  console.log('✓ 10-mobile-free.png（手機自由探索・症狀反查）')

  // 循經導引在手機也要能觸發（時辰鐘於手機隱藏，按鈕獨立浮於左上）
  await mobile.evaluate(() => window.__QH_STORE.getState().actions.selectSymptom(null))
  const mFlowBtn = mobile.locator('.qh-flow-play')
  await mFlowBtn.waitFor({ state: 'visible', timeout: 5000 })
  await mFlowBtn.click() // 真實點擊：驗證手機可及且未被其他層擋住
  await mobile.waitForFunction(
    () => window.__QH_STORE.getState().qiFlowPlaying === true &&
          window.__QH_STORE.getState().flowMeridianId !== null,
    undefined,
    { timeout: 5000 },
  )
  await mobile.waitForTimeout(1500)
  await settleFrames(mobile, 40)
  await shoot(mobile, `${SHOT_DIR}11-mobile-qiflow.png`)
  console.log('✓ 11-mobile-qiflow.png（手機循經導引可觸發）')

  // 手機搜尋：第二列 ⌕ 鈕 → 輸入「風池」→ 點結果 → 選中 GB20
  await mobile.locator('.qh-search-btn').click()
  await mobile.waitForSelector('.qh-search-input', { timeout: 4000 })
  await mobile.fill('.qh-search-input', '風池')
  await mobile.locator('.qh-search-hit', { hasText: '風池' }).first().click()
  await mobile.waitForFunction(
    () => window.__QH_STORE.getState().selectedPointId === 'GB20',
    undefined,
    { timeout: 5000 },
  )
  console.log('✓ 手機搜尋 → 風池（GB20）')
  await mobile.keyboard.press('Escape')
  await mobile.waitForTimeout(600)

  // 手機學習測驗：入口鈕（Header，手機也要點得到）→ 開始 → 作答
  await mobile.getByRole('button', { name: /穴位測驗/ }).click({ noWaitAfter: true })
  await mobile.waitForFunction(
    () => window.__QH_STORE.getState().quizActive === true &&
          window.__QH_STORE.getState().quizTargetId !== null,
    undefined,
    { timeout: 5000 },
  )
  await mobile.waitForSelector('.qh-quiz', { timeout: 5000 })
  await mobile.waitForTimeout(1800)
  await settleFrames(mobile, 40)
  await shoot(mobile, `${SHOT_DIR}12-mobile-quiz.png`)
  console.log('✓ 12-mobile-quiz.png（手機學習測驗）')
  await mobile.locator('.qh-quiz-option').first().click()
  await mobile.waitForSelector('.qh-quiz-feedback', { timeout: 5000 })
  console.log('✓ 手機測驗作答回饋顯示')

  // 黏性 hover 回歸驗證（實機曾發生：下一題的選項殘留 hover 金框，像已選取）
  const hoverNone = await mobile.evaluate(() => matchMedia('(hover: none)').matches)
  if (!hoverNone) throw new Error('mobile 模擬應為 hover:none（isMobile/hasTouch 未生效）')
  await mobile.locator('.qh-quiz-btn.is-primary').click() // 下一題（點擊處常與選項區重疊）
  await mobile.waitForSelector('.qh-quiz[data-type="symptom"]', { timeout: 5000 })
  await mobile.waitForTimeout(400)
  const stickyGold = await mobile.evaluate(() => {
    for (const el of document.querySelectorAll('.qh-quiz-option')) {
      const c = getComputedStyle(el).borderColor
      if (c.includes('227') && c.includes('179')) return true // --gold #E3B341
    }
    return false
  })
  if (stickyGold) throw new Error('觸控裝置出現黏性 hover 金框（未作答選項帶 hover 樣式）')
  console.log('✓ 觸控無黏性 hover（新題選項無殘留金框）')
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
