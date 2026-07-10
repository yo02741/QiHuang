/**
 * 資料驗證（無頭執行）：npm run validate:data
 * 驗證經絡/穴位/臟腑資料的完整性，並實際解析所有 anchor 確認落在合理範圍。
 */
import { MERIDIANS } from '../src/data/meridians'
import { ACUPOINTS, ACUPOINT_MAP } from '../src/data/acupoints'
import { ORGANS, ORGAN_MAP } from '../src/data/organs'
import { STORY_SECTIONS, TRANSITION_ENDS } from '../src/data/sections'
import { SYMPTOMS, SYMPTOM_MAP } from '../src/data/symptoms'
import { COMBOS } from '../src/data/combos'
import { PLAIN_NOTES } from '../src/data/plainNotes'
import { FLOW_ORDER } from '../src/data/flowClock'
import { resolveAnchor } from '../src/lib/anchors'
import { pointsByRegion } from '../src/lib/regions'
import { evaluatePose } from '../src/lib/cameraPath'

let failures = 0
const fail = (msg: string) => {
  failures++
  console.error(`✗ ${msg}`)
}

// ── 經絡 ──
if (MERIDIANS.length !== 14) fail(`經絡應為 14 條，實際 ${MERIDIANS.length}`)
const meridianIds = new Set(MERIDIANS.map((m) => m.id))
if (meridianIds.size !== MERIDIANS.length) fail('經絡 id 重複')
for (const m of MERIDIANS) {
  if (m.path.length < 4) fail(`${m.id} 路線 waypoints 少於 4 個`)
  for (const o of m.organIds) {
    if (!ORGAN_MAP.has(o)) fail(`${m.id} 引用不存在的臟腑 ${o}`)
  }
}

// ── 臟腑 ──
if (ORGANS.length !== 12) fail(`臟腑應為 12 個，實際 ${ORGANS.length}`)
for (const o of ORGANS) {
  if (!ORGAN_MAP.has(o.pairedWith)) fail(`${o.id} 表裡配對 ${o.pairedWith} 不存在`)
}

// ── 穴位 ──
if (ACUPOINTS.length !== 100) fail(`穴位應為 100 個，實際 ${ACUPOINTS.length}`)
const pointIds = new Set(ACUPOINTS.map((p) => p.id))
if (pointIds.size !== ACUPOINTS.length) fail('穴位 id 重複')
for (const p of ACUPOINTS) {
  if (!meridianIds.has(p.meridianId)) fail(`${p.id} 所屬經絡 ${p.meridianId} 不存在`)
  if (p.id !== p.code) fail(`${p.id} 的 id 與 code 不一致`)
  if (p.functions.length < 1) fail(`${p.id} 缺少主治功效`)
  for (const o of p.organIds) {
    if (!ORGAN_MAP.has(o)) fail(`${p.id} 引用不存在的臟腑 ${o}`)
  }
  // 白話解內容層（plainNotes.ts 合入）
  if (p.plain.length < 40) fail(`${p.id} 白話解過短（${p.plain.length} 字）`)
  if (p.symptoms.length < 1) fail(`${p.id} 缺少症狀標籤`)
  for (const s of p.symptoms) {
    if (!SYMPTOM_MAP.has(s)) fail(`${p.id} 症狀標籤 ${s} 不在詞彙表`)
  }
}
// 內容層無孤兒（plainNotes 的 key 都對應存在的穴位）
for (const id of Object.keys(PLAIN_NOTES)) {
  if (!ACUPOINT_MAP.has(id)) fail(`plainNotes 有多餘條目 ${id}（穴位不存在）`)
}

// ── 症狀詞彙覆蓋 ──
{
  const bySymptom = new Map<string, number>()
  for (const p of ACUPOINTS) {
    for (const s of p.symptoms) bySymptom.set(s, (bySymptom.get(s) ?? 0) + 1)
  }
  for (const s of SYMPTOMS) {
    const n = bySymptom.get(s.id) ?? 0
    if (n < 2) fail(`症狀「${s.name}」只有 ${n} 穴對應（至少 2）`)
  }
  console.log(
    '  症狀覆蓋：' + SYMPTOMS.map((s) => `${s.name}${bySymptom.get(s.id) ?? 0}`).join('、'),
  )
}

// ── 配穴組合 ──
{
  const comboIds = new Set(COMBOS.map((c) => c.id))
  if (comboIds.size !== COMBOS.length) fail('配穴組合 id 重複')
  for (const c of COMBOS) {
    if (c.pointIds.length < 2 || c.pointIds.length > 4)
      fail(`配穴「${c.name}」成員數 ${c.pointIds.length} 不在 2–4`)
    for (const id of c.pointIds) {
      if (!ACUPOINT_MAP.has(id)) fail(`配穴「${c.name}」引用不存在的穴位 ${id}`)
    }
    if (c.plain.length < 30) fail(`配穴「${c.name}」白話說明過短`)
  }
}

// ── 子午流注對映 ──
{
  if (FLOW_ORDER.length !== 12) fail(`流注時辰應為 12 槽，實際 ${FLOW_ORDER.length}`)
  const covered = new Set<number>()
  for (const s of FLOW_ORDER) {
    if (!meridianIds.has(s.meridianId)) fail(`流注引用不存在的經絡 ${s.meridianId}`)
    for (let h = s.startHour; h !== s.endHour; h = (h + 1) % 24) covered.add(h)
  }
  if (covered.size !== 24) fail(`流注時段未覆蓋 24 小時（實際 ${covered.size}）`)
}

// ── anchor 解析範圍檢查 ──
const checkResolved = (label: string, anchor: Parameters<typeof resolveAnchor>[0]) => {
  for (const side of ['L', 'R'] as const) {
    const { position: pos, normal } = resolveAnchor(anchor, side)
    if (!Number.isFinite(pos.x + pos.y + pos.z)) fail(`${label} (${side}) 座標非有限數`)
    if (Math.abs(pos.x) > 0.5) fail(`${label} (${side}) |x|=${pos.x.toFixed(3)} 超出 0.5`)
    if (pos.y < 0 || pos.y > 1.75) fail(`${label} (${side}) y=${pos.y.toFixed(3)} 超出 [0,1.75]`)
    if (Math.abs(pos.z) > 0.4) fail(`${label} (${side}) |z|=${pos.z.toFixed(3)} 超出 0.4`)
    if (Math.abs(normal.length() - 1) > 1e-3) fail(`${label} (${side}) 法線未正規化`)
  }
}

for (const m of MERIDIANS) {
  m.path.forEach((a, i) => checkResolved(`${m.id}.path[${i}]`, a))
}
for (const p of ACUPOINTS) {
  checkResolved(p.id, p.anchor)
}

// ── 統計 ──
const perMeridian = new Map<string, number>()
for (const p of ACUPOINTS) {
  perMeridian.set(p.meridianId, (perMeridian.get(p.meridianId) ?? 0) + 1)
}
for (const m of MERIDIANS) {
  const n = perMeridian.get(m.id) ?? 0
  if (n < 5 || n > 12) fail(`${m.id} 穴位數 ${n} 不在 5–12 範圍`)
}

// ── 滾動敘事章節（sections × regions × cameraPath）──
{
  // 部位推導全覆蓋（regionOf 對 point 型 anchor 未列 override 會 throw）
  let derived: Map<string, string[]>
  try {
    derived = pointsByRegion(ACUPOINTS)
  } catch (e) {
    derived = new Map()
    fail(String(e instanceof Error ? e.message : e))
  }

  const sectionIds = new Set(STORY_SECTIONS.map((s) => s.id))
  if (sectionIds.size !== STORY_SECTIONS.length) fail('section id 重複')

  // 各 section 的 pointIds 必須與部位推導完全一致（雙向）
  const claimed = new Set<string>()
  for (const s of STORY_SECTIONS) {
    for (const id of s.pointIds) {
      if (claimed.has(id)) fail(`${id} 被多個 section 收錄`)
      claimed.add(id)
      const region = derived.get(s.id as string)
      if (!region?.includes(id)) fail(`${s.id} 收錄了 ${id}，但部位推導不屬於此區`)
    }
  }
  for (const p of ACUPOINTS) {
    if (!claimed.has(p.id)) fail(`${p.id} 未被任何 section 收錄`)
  }

  // 相機軌道：數值有限、azimuth 單調不減、polar/distance 合理
  let prevAz = -Infinity
  for (const s of STORY_SECTIONS) {
    const { target, azimuth, polar, distance } = s.pose
    if (![...target, azimuth, polar, distance].every(Number.isFinite))
      fail(`${s.id} pose 含非有限數`)
    if (azimuth < prevAz) fail(`${s.id} azimuth ${azimuth.toFixed(2)} 回頭（前值 ${prevAz.toFixed(2)}），軌道應單調`)
    prevAz = azimuth
    if (polar <= 0 || polar >= Math.PI) fail(`${s.id} polar ${polar} 超出 (0, π)`)
    if (distance <= 0.3 || distance > 10) fail(`${s.id} distance ${distance} 超出 (0.3, 10]`)
  }

  // evaluatePose 全程掃描：任意進度都能算出有限姿勢（含每章自訂過渡比例）
  const poses = STORY_SECTIONS.map((s) => s.pose)
  for (let r = 0; r <= (STORY_SECTIONS.length - 1) * 8; r++) {
    const p = evaluatePose(poses, r / 8, TRANSITION_ENDS)
    if (![...p.target, p.azimuth, p.polar, p.distance].every(Number.isFinite)) {
      fail(`evaluatePose(${(r / 8).toFixed(3)}) 產出非有限數`)
      break
    }
  }
}

if (failures) {
  console.error(`\n✗ 資料驗證失敗：${failures} 個問題`)
  process.exit(1)
}
const bodySections = STORY_SECTIONS.filter((s) => s.pointIds.length > 0)
console.log(
  `✓ 資料驗證通過：${MERIDIANS.length} 經絡、${ACUPOINTS.length} 穴位、${ORGANS.length} 臟腑；` +
    `所有 anchor（左右側）解析皆落在合理範圍；` +
    `${STORY_SECTIONS.length} 個敘事章節（${bodySections.length} 個部位章）完整收錄 ${ACUPOINTS.length} 穴`,
)
console.log(
  '  章節分佈：' +
    bodySections.map((s) => `${s.title.replace(/・.*/, '')}${s.pointIds.length}`).join('、'),
)
