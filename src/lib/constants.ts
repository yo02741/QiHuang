/** 場景共用常數：顏色、renderOrder、鏡頭姿勢、時間參數 */

export const COLORS = {
  bg: '#0B0E12',
  bronze: '#B08D57',
  gold: '#E3B341',
  goldSoft: '#D9B36C',
  lacquer: '#14161A',
} as const

/** 透明排序依此表：舞台 → 臟腑 → 身體 → 經絡線 → 穴位標記 */
export const RENDER_ORDER = {
  stage: 0,
  organs: 1,
  body: 2,
  meridians: 3,
  markers: 4,
} as const

/** setLookAt 參數：[camX, camY, camZ, targetX, targetY, targetZ] */
export const CAMERA_POSES = {
  INTRO: [0, 2.1, 7.4, 0, 1.15, 0],
  HOME: [0, 1.35, 3.2, 0, 1.05, 0],
} as const

export const TIMING = {
  orbitSmoothTime: 0.55,
  bodyFade: 0.35, // easing.damp λ
} as const

/** 滾動敘事運鏡參數 */
export const SCROLL = {
  poseDamp: 0.22,     // 相機阻尼追蹤滾動姿勢的 λ（秒）——「類 lenis」手感的來源
  dragMaxAz: 0.35,    // 章內微互動拖曳的 azimuth 上限（rad）
  dragMaxPol: 0.15,   // polar 上限（rad）
  dragSense: 2.4,     // 拖曳靈敏度（rad / 畫面寬）
  dragDecay: 0.3,     // 放開/換章後 offset 衰減 λ（秒）
  focusExitPx: 80,    // focus 中累積滾動超過此值 → 自動退出選穴
} as const

/** tour：導覽 spotlight 的半透視（比點穴 xray 淺，保留銅身形體） */
export const BODY_OPACITY = { normal: 1.0, xray: 0.22, tour: 0.34, depthWriteThreshold: 0.6 } as const

/** 解剖分層各層目標透明度：剝開時外層淡成輪廓，露出內層 */
export const LAYER_OPACITY = {
  skinAtMuscle: 0.16, // 看肌肉時的銅身殘影
  skinAtSkeleton: 0.09, // 看骨架時的銅身殘影（更淡）
  muscleFull: 0.96, // 肌肉層本身
  muscleAtSkeleton: 0.2, // 看骨架時肌肉退成薄影
} as const

/** 經絡氣流循行動畫（子午流注自動播放） */
export const QIFLOW = {
  secondsPerMeridian: 2.6, // 一條經絡走完的秒數（12 經一輪約 31s）
  headRadius: 0.021,       // 彗頭球半徑（經 bloom 後為光點）
  trail: 7,                // 每側彗尾珠數
  tailStep: 0.04,          // 相鄰彗尾珠在參數 u 上的間距
} as const
