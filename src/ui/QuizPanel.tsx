import { useEffect, useState } from 'react'
import { ACUPOINTS, ACUPOINT_MAP } from '@/data/acupoints'
import { MERIDIAN_MAP } from '@/data/meridians'
import { useAppStore } from '@/store/useAppStore'
import type { Side } from '@/lib/anchors'

/**
 * 學習測驗（看穴猜名）：銅人身上亮一個穴位、鏡頭聚焦，四選一猜穴名。
 * 一輪 10 題，計分，結束顯示成績。
 * 題目在此產生（Math.random），僅把「要猜的穴位」寫入 store 供場景高亮/聚焦。
 */

const TOTAL = 10

interface Option {
  id: string
  name: string
}
interface Question {
  correctId: string
  side: Side
  options: Option[]
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

/** 產生一題：隨機目標穴 + 3 個誘答（優先同經，確保穴名相異） */
function makeQuestion(): Question {
  const target = pick(ACUPOINTS)
  const meridian = MERIDIAN_MAP.get(target.meridianId)!
  const side: Side = meridian.bilateral && Math.random() < 0.5 ? 'R' : 'L'

  const usedNames = new Set([target.name])
  const distractors: string[] = []
  // 同經誘答優先（定位相近、較有鑑別度）
  const sameMeridian = shuffle(
    ACUPOINTS.filter((p) => p.meridianId === target.meridianId && p.name !== target.name),
  )
  const others = shuffle(ACUPOINTS.filter((p) => p.meridianId !== target.meridianId))
  for (const p of [...sameMeridian, ...others]) {
    if (distractors.length >= 3) break
    if (usedNames.has(p.name)) continue
    usedNames.add(p.name)
    distractors.push(p.id)
  }
  const options = shuffle([target.id, ...distractors]).map((id) => ({
    id,
    name: ACUPOINT_MAP.get(id)!.name,
  }))
  return { correctId: target.id, side, options }
}

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

  const newQuestion = () => {
    const nq = makeQuestion()
    setQ(nq)
    setAnswered(null)
    setQuizTarget(nq.correctId, nq.side)
  }

  // 首題（元件於 quizActive 時掛載）
  useEffect(() => {
    newQuestion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const answer = (id: string) => {
    if (answered || !q) return
    setAnswered(id)
    if (id === q.correctId) setScore((s) => s + 1)
  }
  const next = () => {
    if (round + 1 >= TOTAL) {
      setFinished(true)
      return
    }
    setRound((r) => r + 1)
    newQuestion()
  }
  const restart = () => {
    setScore(0)
    setRound(0)
    setFinished(false)
    newQuestion()
  }

  if (finished) {
    return (
      <div className="qh-quiz" role="dialog" aria-label="測驗結果">
        <div className="qh-quiz-result">
          <p className="qh-quiz-result-label">測驗完成</p>
          <p className="qh-quiz-result-score">
            <b>{score}</b> <span>/ {TOTAL}</span>
          </p>
          <p className="qh-quiz-result-grade">{grade(score)}</p>
          <div className="qh-quiz-actions">
            <button type="button" className="qh-quiz-btn is-primary" onClick={restart}>
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
    <div className="qh-quiz" role="dialog" aria-label="穴位測驗">
      <div className="qh-quiz-head">
        <span className="qh-quiz-progress">第 {round + 1} / {TOTAL} 題</span>
        <span className="qh-quiz-score">得分 {score}</span>
        <button type="button" className="qh-quiz-quit" onClick={endQuiz} aria-label="結束測驗">
          ×
        </button>
      </div>

      <p className="qh-quiz-question">銅人身上發亮的是哪個穴位？</p>

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
