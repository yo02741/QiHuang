/**
 * 資料驗證（無頭執行）：npm run validate:data
 * 驗證經絡/穴位/臟腑資料的完整性，並實際解析所有 anchor 確認落在合理範圍。
 */
import { MERIDIANS } from '../src/data/meridians'
import { ACUPOINTS } from '../src/data/acupoints'
import { ORGANS, ORGAN_MAP } from '../src/data/organs'
import { resolveAnchor } from '../src/lib/anchors'

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
if (ACUPOINTS.length !== 67) fail(`穴位應為 67 個，實際 ${ACUPOINTS.length}`)
const pointIds = new Set(ACUPOINTS.map((p) => p.id))
if (pointIds.size !== ACUPOINTS.length) fail('穴位 id 重複')
for (const p of ACUPOINTS) {
  if (!meridianIds.has(p.meridianId)) fail(`${p.id} 所屬經絡 ${p.meridianId} 不存在`)
  if (p.id !== p.code) fail(`${p.id} 的 id 與 code 不一致`)
  if (p.functions.length < 1) fail(`${p.id} 缺少主治功效`)
  for (const o of p.organIds) {
    if (!ORGAN_MAP.has(o)) fail(`${p.id} 引用不存在的臟腑 ${o}`)
  }
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
  if (n < 3 || n > 6) fail(`${m.id} 穴位數 ${n} 不在 3–6 範圍`)
}

if (failures) {
  console.error(`\n✗ 資料驗證失敗：${failures} 個問題`)
  process.exit(1)
}
console.log(
  `✓ 資料驗證通過：${MERIDIANS.length} 經絡、${ACUPOINTS.length} 穴位、${ORGANS.length} 臟腑；` +
    `所有 anchor（左右側）解析皆落在合理範圍`,
)
