/**
 * 沉浸音景：全程 Web Audio 程式生成，零音檔、零依賴。
 *
 * 撥弦 = Karplus-Strong 物理模型（短噪聲爆發 → 延遲線回授 + 低通阻尼），
 * 音高走五聲音階（宮商角徵羽），低音區緩慢隨機撥奏如古琴自語；
 * 底下墊一層極低音量的「風聲」（濾波噪聲 + 慢速起伏）。
 * 互動音效（選穴/答對答錯/循經換經）為同一把「琴」的短句。
 *
 * 瀏覽器 autoplay 政策：AudioContext 只在使用者手勢中建立/恢復；
 * 開關記憶於 localStorage，重載後於首次手勢自動恢復。
 */

const STORAGE_KEY = 'qh-sound'

/** 五聲音階（宮 D 調），低音區兩個八度 */
const PENTATONIC = [146.83, 164.81, 185.0, 220.0, 246.94, 293.66, 329.63, 369.99, 440.0]

type Listener = () => void

class Soundscape {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private windGain: GainNode | null = null
  private bedTimer: number | null = null
  private listeners = new Set<Listener>()
  private _on = false
  /** 已排程的音符數（smoke 斷言用） */
  noteCount = 0

  get on() {
    return this._on
  }
  get contextState() {
    return this.ctx?.state ?? 'none'
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  private emit() {
    for (const fn of this.listeners) fn()
  }

  /** 於使用者手勢中呼叫 */
  toggle(): void {
    if (this._on) {
      this._on = false
      localStorage.setItem(STORAGE_KEY, '0')
      this.stopBed()
      if (this.master && this.ctx) {
        this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15)
      }
    } else {
      this._on = true
      localStorage.setItem(STORAGE_KEY, '1')
      this.ensureContext()
      if (this.master && this.ctx) {
        this.master.gain.setTargetAtTime(0.9, this.ctx.currentTime, 0.4)
      }
      this.startBed()
    }
    this.emit()
  }

  /** 開機時恢復偏好（不建 AudioContext；等首次手勢） */
  restorePreference(): void {
    if (localStorage.getItem(STORAGE_KEY) !== '1') return
    this._on = true
    this.emit()
    const arm = () => {
      if (!this._on) return
      this.ensureContext()
      this.startBed()
    }
    // 任一手勢即點火（once：不長駐監聽）
    window.addEventListener('pointerdown', arm, { once: true })
    window.addEventListener('keydown', arm, { once: true })
  }

  private ensureContext(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.9
      this.master.connect(this.ctx.destination)
      this.buildWind()
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  /** 風聲底噪：循環濾波噪聲 + 慢速 LFO 起伏 */
  private buildWind(): void {
    const ctx = this.ctx!
    const len = ctx.sampleRate * 4
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < len; i++) {
      // 一階低通過的白噪聲（偏粉紅）
      last = last * 0.965 + (Math.random() * 2 - 1) * 0.035
      data[i] = last * 8
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 320
    this.windGain = ctx.createGain()
    this.windGain.gain.value = 0.012
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.05
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.006
    lfo.connect(lfoGain).connect(this.windGain.gain)
    src.connect(lp).connect(this.windGain).connect(this.master!)
    src.start()
    lfo.start()
  }

  /**
   * Karplus-Strong 撥弦：噪聲爆發灌入「延遲(1/f) → 低通 → 增益」回授圈。
   * damp 越低音色越悶（古琴按音感），sustain 控制衰減長短。
   */
  pluck(freq: number, opts: { gain?: number; damp?: number; sustain?: number; when?: number } = {}): void {
    if (!this._on || !this.ctx || !this.master) return
    const ctx = this.ctx
    const { gain = 0.5, damp = 2600, sustain = 0.992, when = 0 } = opts
    const t0 = ctx.currentTime + when
    const life = 5 // 秒後拆線

    const burst = ctx.createBufferSource()
    const blen = Math.max(2, Math.round(ctx.sampleRate / freq))
    const bbuf = ctx.createBuffer(1, blen, ctx.sampleRate)
    const bdata = bbuf.getChannelData(0)
    for (let i = 0; i < blen; i++) bdata[i] = Math.random() * 2 - 1
    burst.buffer = bbuf

    const delay = ctx.createDelay(0.1)
    delay.delayTime.value = 1 / freq
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = damp
    const fb = ctx.createGain()
    fb.gain.value = sustain

    const out = ctx.createGain()
    out.gain.setValueAtTime(gain, t0)
    out.gain.exponentialRampToValueAtTime(0.001, t0 + life)

    burst.connect(delay)
    delay.connect(lp).connect(fb).connect(delay) // 回授圈
    delay.connect(out).connect(this.master)
    burst.start(t0)

    this.noteCount++
    window.setTimeout(() => {
      try {
        burst.disconnect()
        delay.disconnect()
        lp.disconnect()
        fb.disconnect()
        out.disconnect()
      } catch { /* already gone */ }
    }, (when + life) * 1000 + 100)
  }

  /** 環境底奏：3–8 秒隨機撥一音，偶爾疊五度 */
  private startBed(): void {
    if (this.bedTimer !== null) return
    const step = () => {
      if (!this._on) return
      const note = PENTATONIC[Math.floor(Math.random() * 5)] / 2 // 低八度
      this.pluck(note, { gain: 0.28, damp: 1900, sustain: 0.994 })
      if (Math.random() < 0.3) {
        this.pluck(note * 1.5, { gain: 0.14, damp: 1700, sustain: 0.993, when: 0.35 })
      }
      this.bedTimer = window.setTimeout(step, 3000 + Math.random() * 5000)
    }
    this.bedTimer = window.setTimeout(step, 800)
  }
  private stopBed(): void {
    if (this.bedTimer !== null) {
      clearTimeout(this.bedTimer)
      this.bedTimer = null
    }
  }

  // ── 互動短句（皆過 this._on 閘） ──
  cueSelect(): void {
    const n = PENTATONIC[4 + Math.floor(Math.random() * 4)]
    this.pluck(n, { gain: 0.4, damp: 3200, sustain: 0.99 })
  }
  cueCorrect(): void {
    this.pluck(PENTATONIC[5], { gain: 0.42, damp: 3000, sustain: 0.99 })
    this.pluck(PENTATONIC[8], { gain: 0.34, damp: 3200, sustain: 0.99, when: 0.16 })
  }
  cueWrong(): void {
    this.pluck(PENTATONIC[0] / 2, { gain: 0.4, damp: 1100, sustain: 0.987 })
  }
  cueFlow(): void {
    this.pluck(PENTATONIC[2], { gain: 0.22, damp: 2200, sustain: 0.992 })
  }
}

export const soundscape = new Soundscape()

// 供無頭 smoke test 斷言（音訊不可見，狀態外露）
declare global {
  interface Window {
    __QH_SOUND: { on: () => boolean; ctx: () => string; notes: () => number }
  }
}
window.__QH_SOUND = {
  on: () => soundscape.on,
  ctx: () => soundscape.contextState,
  notes: () => soundscape.noteCount,
}
