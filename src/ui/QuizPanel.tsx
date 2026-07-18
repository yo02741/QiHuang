import { useEffect, useState } from 'react'
import { ACUPOINTS, ACUPOINT_MAP } from '@/data/acupoints'
import { MERIDIAN_MAP } from '@/data/meridians'
import { SYMPTOMS } from '@/data/symptoms'
import { useAppStore } from '@/store/useAppStore'
import { shareOrDownloadCard } from '@/lib/scoreCard'
import type { CardResult } from '@/lib/scoreCard'
import type { Side } from '@/lib/anchors'
import type { SymptomId } from '@/data/types'

/**
 * 學習測驗：一輪 10 題、兩種題型交錯（單數題/雙數題），計分後顯示成績。
 *
 * 看穴猜名（type 'name'）：銅人亮一穴+鏡頭聚焦，四選一猜穴名；
 *   誘答優先同經——考「定位」而非經絡辨識。
 * 依症選穴（type 'symptom'）：給一個日常症狀，四選一選最常用的穴位；
 *   出題時銅人保持中性（target=null 不洩題），作答後才亮出正解位置
 *   並運鏡飛過去——答完立刻在身體上看到「原來在這」。
 *
 * 題目在此產生（Math.random），僅把「要高亮的穴位」寫入 store。
 */

const TOTAL = 10

type QuestionType = 'name' | 'symptom'

interface Option {
  id: string
  name: string
}
interface Question {
  type: QuestionType
  correctId: string
  side: Side
  options: Option[]
  /** type 'symptom' 才有：題面顯示的症狀名 */
  symptomName?: string
}

const shuffle = <T,>(a: T[]): T[] => {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]

/** 目標穴的展示側：雙側經隨機取一側 */
function sideOf(pointId: string): Side {
  const meridian = MERIDIAN_MAP.get(ACUPOINT_MAP.get(pointId)!.meridianId)!
  return meridian.bilateral && Math.random() < 0.5 ? 'R' : 'L'
}

/** 組四個選項：正解 + 誘答候選（依序取用、名稱不得重複） */
function buildOptions(correctId: string, candidates: { id: string; name: string }[]): Option[] {
  const correctName = ACUPOINT_MAP.get(correctId)!.name
  const usedNames = new Set([correctName])
  const distractors: string[] = []
  for (const c of candidates) {
    if (distractors.length >= 3) break
    if (usedNames.has(c.name)) continue
    usedNames.add(c.name)
    distractors.push(c.id)
  }
  return shuffle([correctId, ...distractors]).map((id) => ({
    id,
    name: ACUPOINT_MAP.get(id)!.name,
  }))
}

/** 看穴猜名：隨機目標穴，誘答優先同經（定位相近、鑑別度高） */
function makeNameQuestion(): Question {
  const target = pick(ACUPOINTS)
  const sameMeridian = shuffle(
    ACUPOINTS.filter((p) => p.meridianId === target.meridianId && p.id !== target.id),
  )
  const others = shuffle(ACUPOINTS.filter((p) => p.meridianId !== target.meridianId))
  return {
    type: 'name',
    correctId: target.id,
    side: sideOf(target.id),
    options: buildOptions(target.id, [...sameMeridian, ...others]),
  }
}

/** 依症選穴：隨機症狀 → 正解為其對應穴之一；誘答一律「不含該症狀」以免多重正解 */
function makeSymptomQuestion(): Question {
  const symptom = pick(SYMPTOMS)
  const matching = ACUPOINTS.filter((p) => p.symptoms.includes(symptom.id as SymptomId))
  const target = pick(matching)
  const nonMatching = shuffle(ACUPOINTS.filter((p) => !p.symptoms.includes(symptom.id as SymptomId)))
  return {
    type: 'symptom',
    correctId: target.id,
    side: sideOf(target.id),
    options: buildOptions(target.id, nonMatching),
    symptomName: symptom.name,
  }
}

/** 題型交錯：單數題看穴猜名、雙數題依症選穴（確定性混合，也利於自動驗證） */
const makeQuestion = (round: number): Question =>
  round % 2 === 0 ? makeNameQuestion() : makeSymptomQuestion()

function grade(score: number): string {
  if (score >= 9) return '神乎其技，可為明堂之師。'
  if (score >= 7) return '頗有慧根，經穴瞭然於胸。'
  if (score >= 5) return '漸入佳境，再接再厲。'
  return '勤能補拙，循經再走一遭。'
}

export function QuizPanel() {
  const { setQuizTarget, endQuiz } = useAppStore((s) => s.actions)
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [q, setQ] = useState<Question | null>(null)
  const [answered, setAnswered] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  // 每題作答紀錄：結果頁 ✓✗ 標記列 + 成績卡作答明細
  const [results, setResults] = useState<CardResult[]>([])

  const newQuestion = (r: number) => {
    const nq = makeQuestion(r)
    setQ(nq)
    setAnswered(null)
    // 看穴猜名：立即亮穴聚焦；依症選穴：保持中性，作答後才揭示
    setQuizTarget(nq.type === 'name' ? nq.correctId : null, nq.side)
  }

  // 首題（元件於 quizActive 時掛載）
  useEffect(() => {
    newQuestion(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const answer = (id: string) => {
    if (answered || !q) return
    setAnswered(id)
    const ok = id === q.correctId
    if (ok) setScore((s) => s + 1)
    const correct = ACUPOINT_MAP.get(q.correctId)!
    setResults((r) => [
      ...r,
      {
        ok,
        // 卡片明細：依症選穴呈現「症狀 → 穴名」，看穴猜名呈現「穴名・代碼」
        text:
          q.type === 'symptom'
            ? `${q.symptomName} → ${correct.name}`
            : `${correct.name}・${correct.code}`,
      },
    ])
    // 依症選穴：揭示正解位置（亮穴 + 鏡頭飛過去）
    if (q.type === 'symptom') setQuizTarget(q.correctId, q.side)
  }
  const next = () => {
    if (round + 1 >= TOTAL) {
      setFinished(true)
      // 清掉目標 → 鏡頭飛回全身 HOME 視角，成績卡快照才是完整銅人
      setQuizTarget(null)
      return
    }
    setRound(round + 1)
    newQuestion(round + 1)
  }
  const restart = () => {
    setScore(0)
    setRound(0)
    setFinished(false)
    setResults([])
    newQuestion(0)
  }

  if (finished) {
    return (
      <div className="qh-quiz" role="dialog" aria-label="測驗結果">
        <div className="qh-quiz-result">
          <p className="qh-quiz-result-label">測驗完成</p>
          <p className="qh-quiz-result-score">
            <b>{score}</b> <span>/ {TOTAL}</span>
          </p>
          <div className="qh-quiz-result-marks" aria-label="每題作答結果">
            {results.map((r, i) => (
              <span key={i} className={r.ok ? 'is-ok' : 'is-no'} title={r.text}>
                {r.ok ? '✓' : '✗'}
              </span>
            ))}
          </div>
          <p className="qh-quiz-result-grade">{grade(score)}</p>
          <div className="qh-quiz-actions">
            <button
              type="button"
              className="qh-quiz-btn is-primary"
              onClick={() => void shareOrDownloadCard(score, TOTAL, grade(score), results)}
            >
              ⬇ 儲存成績卡
            </button>
            <button type="button" className="qh-quiz-btn" onClick={restart}>
              再測一次
            </button>
            <button type="button" className="qh-quiz-btn" onClick={endQuiz}>
              結束
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!q) return null
  const correct = ACUPOINT_MAP.get(q.correctId)!
  const correctMeridian = MERIDIAN_MAP.get(correct.meridianId)!

  return (
    <div className="qh-quiz" role="dialog" aria-label="穴位測驗" data-type={q.type}>
      <div className="qh-quiz-head">
        <span className="qh-quiz-progress">第 {round + 1} / {TOTAL} 題</span>
        <span className="qh-quiz-type">{q.type === 'name' ? '看穴猜名' : '依症選穴'}</span>
        <span className="qh-quiz-score">得分 {score}</span>
        <button type="button" className="qh-quiz-quit" onClick={endQuiz} aria-label="結束測驗">
          ×
        </button>
      </div>

      {q.type === 'name' ? (
        <p className="qh-quiz-question">銅人身上發亮的是哪個穴位？</p>
      ) : (
        <p className="qh-quiz-question">
          <b className="qh-quiz-symptom">「{q.symptomName}」</b>
          時，最常取下列哪個穴位？
        </p>
      )}

      <div className="qh-quiz-options">
        {q.options.map((o) => {
          let state = ''
          if (answered) {
            if (o.id === q.correctId) state = 'is-correct'
            else if (o.id === answered) state = 'is-wrong'
            else state = 'is-muted'
          }
          return (
            <button
              key={o.id}
              type="button"
              className={`qh-quiz-option ${state}`}
              disabled={answered !== null}
              onClick={() => answer(o.id)}
            >
              {o.name}
            </button>
          )
        })}
      </div>

      {answered && (
        <div className="qh-quiz-feedback">
          <p className={answered === q.correctId ? 'is-correct' : 'is-wrong'}>
            {answered === q.correctId ? '✓ 答對了' : '✗ 答錯了'}
            <span className="qh-quiz-answer">
              正解：{correct.name}（{correct.code}）・{correctMeridian.shortName}
              {q.type === 'symptom' && '　↑ 銅人身上亮起處'}
            </span>
          </p>
          <button type="button" className="qh-quiz-btn is-primary" onClick={next}>
            {round + 1 >= TOTAL ? '看成績 →' : '下一題 →'}
          </button>
        </div>
      )}
    </div>
  )
}
