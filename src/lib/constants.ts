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
