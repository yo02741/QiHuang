import type { SymptomId } from './types'

/**
 * 症狀反查的受控詞彙：以日常語彙分組，供 ExplorePanel 選單與
 * PointPanel 症狀 chips 使用。validate-data.ts 斷言每穴標籤 ⊆ 此表、
 * 每個症狀至少對應 2 穴。內容為教育示意，非醫療建議。
 */

export interface Symptom {
  id: SymptomId
  name: string   // 顯示名（日常語彙）
  group: string  // 選單分組
}

export const SYMPTOMS: Symptom[] = [
  // 頭面
  { id: 'headache', name: '頭痛', group: '頭面' },
  { id: 'dizziness', name: '頭暈', group: '頭面' },
  { id: 'eye-strain', name: '眼睛痠澀', group: '頭面' },
  { id: 'nasal', name: '鼻塞過敏', group: '頭面' },
  { id: 'sore-throat', name: '咽喉不適', group: '頭面' },
  { id: 'oral', name: '牙痛口瘡', group: '頭面' },
  { id: 'tinnitus', name: '耳鳴', group: '頭面' },
  // 身痛
  { id: 'neck-shoulder', name: '肩頸痠痛', group: '身痛' },
  { id: 'back-pain', name: '腰背痠痛', group: '身痛' },
  { id: 'knee-leg', name: '膝腿痠軟', group: '身痛' },
  // 呼吸
  { id: 'cold-flu', name: '感冒風寒', group: '呼吸' },
  { id: 'cough', name: '咳嗽氣喘', group: '呼吸' },
  // 腸胃
  { id: 'stomach', name: '胃脹胃痛', group: '腸胃' },
  { id: 'constipation', name: '便祕', group: '腸胃' },
  { id: 'diarrhea', name: '腹瀉', group: '腸胃' },
  { id: 'nausea', name: '噁心想吐', group: '腸胃' },
  // 身心
  { id: 'insomnia', name: '失眠', group: '身心' },
  { id: 'stress', name: '壓力焦慮', group: '身心' },
  { id: 'palpitation', name: '心悸胸悶', group: '身心' },
  { id: 'fatigue', name: '疲勞乏力', group: '身心' },
  // 其他
  { id: 'menstrual', name: '經期不適', group: '其他' },
  { id: 'swelling', name: '水腫', group: '其他' },
  { id: 'faint', name: '昏厥急救', group: '其他' },
]

export const SYMPTOM_MAP = new Map(SYMPTOMS.map((s) => [s.id, s]))
