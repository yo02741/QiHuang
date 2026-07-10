import type { RegionId } from '@/lib/regions'
import type { CameraPose } from '@/lib/cameraPath'

/**
 * ★ 滾動敘事章節：文案 + 相機姿勢 + 穴位點亮順序的單一來源。
 *
 * azimuth 為連續實數（累計圈數）：整條軌道單向環繞（正面 → 左側 → 頭頂
 * → 後腦 → 繞過右側看上肢 → 回正面看胸 → 半圈看背 → …），每段 ≤ π、
 * 方向一致，滾動時不會來回甩鏡頭。數值是調校起點，可用 ?debug 迭代。
 *
 * pointIds＝該部位全部穴位的點亮順序（validate-data.ts 斷言與
 * regionOf 推導一致且 67 穴全覆蓋）；labelIds＝浮現名稱標籤的子集
 * （穴位多的部位只標代表穴，避免標籤海）。
 * side＝雙側穴位的標籤顯示側（跟隨該章相機所在側）。
 */

export type SectionId = RegionId | 'landing' | 'finale'

export interface StorySection {
  id: SectionId
  title: string
  kicker: string      // 章節小標（如「第一章・面部」）
  body: string        // 2–4 句部位介紹
  pose: CameraPose
  pointIds: string[]  // 點亮順序；landing / finale 為空
  labelIds: string[]  // 顯示名稱標籤的子集（≤ 8）
  side: 'L' | 'R'     // 雙側穴標籤顯示側
}

const PI = Math.PI

export const STORY_SECTIONS: StorySection[] = [
  {
    id: 'landing',
    title: '岐黃',
    kicker: '3D 針灸銅人',
    body:
      '北宋天聖年間，醫官王惟一鑄成兩具針灸銅人，體表刻穴、內置臟腑，' +
      '成為千年來醫者習針的標準。這裡以 3D 重現這尊小金人——' +
      '循著十四經絡，從頭到足，走一遍人體的山川孔穴。往下捲動，開始旅程。',
    pose: { target: [0, 1.05, 0], azimuth: -0.3, polar: 1.42, distance: 4.6 },
    pointIds: [],
    labelIds: [],
    side: 'L',
  },
  {
    id: 'face-front',
    title: '面部・正面',
    kicker: '第一章',
    body:
      '面為五官之會，經氣上注於此。睛明、承泣護目，迎香通鼻竅，' +
      '人中則是昏厥急救的要穴——面上的每一竅，都有專穴看守。',
    pose: { target: [0, 1.56, 0.01], azimuth: 0, polar: 1.45, distance: 0.95 },
    pointIds: ['BL1', 'ST1', 'GB1', 'LI20', 'GV26'],
    labelIds: ['BL1', 'ST1', 'GB1', 'LI20', 'GV26'],
    side: 'L',
  },
  {
    id: 'face-side',
    title: '面部・側面',
    kicker: '第二章',
    body:
      '側面沿著眉梢到耳周，是少陽經氣行走的地帶。絲竹空治偏頭痛，' +
      '聽宮、翳風開耳竅——耳鳴、面癱的調理都在這一線。',
    pose: { target: [0, 1.56, 0.01], azimuth: 0.5 * PI, polar: 1.45, distance: 0.95 },
    pointIds: ['TE23', 'SI19', 'TE17'],
    labelIds: ['TE23', 'SI19', 'TE17'],
    side: 'L',
  },
  {
    id: 'crown',
    title: '頭頂',
    kicker: '第三章',
    body:
      '頭為諸陽之會，正中線與兩耳尖連線的交點便是百會——' +
      '一穴繫百脈，升陽舉陷、醒腦開竅，是全身最高處的樞紐。',
    pose: { target: [0, 1.66, 0.01], azimuth: 0.8 * PI, polar: 0.28, distance: 0.85 },
    pointIds: ['GV20'],
    labelIds: ['GV20'],
    side: 'L',
  },
  {
    id: 'occiput',
    title: '後腦',
    kicker: '第四章',
    body:
      '枕下是風邪出入的門戶，故穴名多帶「風」字：風府居正中，' +
      '風池分列兩旁。頭痛、眩暈、項強，都先從這兩處下手。',
    pose: { target: [0, 1.56, -0.02], azimuth: PI, polar: 1.25, distance: 0.75 },
    pointIds: ['GV16', 'GB20'],
    labelIds: ['GV16', 'GB20'],
    side: 'L',
  },
  {
    id: 'neck',
    title: '頸項',
    kicker: '第五章',
    body:
      '頸項承上啟下：後有諸陽之會大椎，肩上有肩井，喉前有利咽的廉泉。' +
      '伏案久坐的痠緊，多半繞不開這幾穴。',
    pose: { target: [0, 1.42, 0], azimuth: 1.25 * PI, polar: 1.3, distance: 0.95 },
    pointIds: ['GV14', 'GB21', 'CV23'],
    labelIds: ['GV14', 'GB21', 'CV23'],
    side: 'L',
  },
  {
    id: 'upper-limb',
    title: '上肢',
    kicker: '第六章',
    body:
      '手三陰、手三陽六條經絡在臂上交會，從腋窩的極泉一路走到指尖的井穴。' +
      '肘有曲池，腕有內關、神門，虎口的合谷更是頭面諸疾的第一要穴——' +
      '一條手臂，就是半部針灸學。',
    pose: { target: [-0.28, 1.05, 0.02], azimuth: 1.55 * PI, polar: 1.5, distance: 1.15 },
    pointIds: [
      'HT1', 'LI11', 'LU5', 'HT3', 'PC3', 'LI10', 'TE6', 'TE5', 'PC6', 'LU7',
      'LU9', 'HT7', 'LI4', 'PC8', 'SI3', 'TE1', 'HT9', 'SI1', 'LU11', 'LI1', 'PC9',
    ],
    labelIds: ['LI11', 'PC6', 'HT7', 'LU9', 'LI4', 'PC8'],
    side: 'R',
  },
  {
    id: 'chest',
    title: '胸部',
    kicker: '第七章',
    body:
      '胸中藏心肺，穴多主氣：兩乳之間的膻中為「氣會」，寬胸理氣；' +
      '鎖骨下的中府、俞府調肺止咳，脅下的期門疏肝。胸悶氣鬱，從這裡開解。',
    pose: { target: [0, 1.26, 0.02], azimuth: 2 * PI, polar: 1.4, distance: 1.1 },
    pointIds: ['KI27', 'LU1', 'CV17', 'LR14', 'SP21'],
    labelIds: ['KI27', 'LU1', 'CV17', 'LR14', 'SP21'],
    side: 'L',
  },
  {
    id: 'back',
    title: '背部',
    kicker: '第八章',
    body:
      '背為陽，五臟六腑的「背俞穴」沿膀胱經兩行排列，如肺俞應肺；' +
      '肩胛上的天宗則管肩背痠痛。按背知臟腑，是中醫獨到的診療思路。',
    pose: { target: [0, 1.2, -0.02], azimuth: 3 * PI, polar: 1.4, distance: 1.2 },
    pointIds: ['BL13', 'SI11'],
    labelIds: ['BL13', 'SI11'],
    side: 'L',
  },
  {
    id: 'abdomen',
    title: '腹部',
    kicker: '第九章',
    body:
      '腹居中焦，任脈縱貫正中：中脘和胃，氣海、關元培元固本，' +
      '臍旁的天樞調理腸腑。古人養生重「丹田」，說的正是臍下這一片。',
    pose: { target: [0, 1.03, 0.03], azimuth: 4 * PI, polar: 1.45, distance: 1.0 },
    pointIds: ['CV12', 'ST25', 'CV6', 'CV4'],
    labelIds: ['CV12', 'ST25', 'CV6', 'CV4'],
    side: 'L',
  },
  {
    id: 'lumbar',
    title: '腰臀',
    kicker: '第十章',
    body:
      '腰為腎之府。後正中的命門與兩旁的腎俞是補腎強腰的核心，' +
      '臀外側的環跳則主下肢——坐骨神經痛的針灸首選。',
    pose: { target: [0, 0.98, -0.02], azimuth: 5 * PI, polar: 1.45, distance: 1.1 },
    pointIds: ['GV4', 'BL23', 'GB30'],
    labelIds: ['GV4', 'BL23', 'GB30'],
    side: 'L',
  },
  {
    id: 'lower-limb',
    title: '下肢',
    kicker: '第十一章',
    body:
      '足三陰、足三陽行於腿上。膝下的足三里是天下第一保健穴，' +
      '內踝上的三陰交一穴通肝脾腎三經，膕窩委中專治腰背——' +
      '「肚腹三里留，腰背委中求」，針灸歌訣傳唱的就是這裡。',
    pose: { target: [0, 0.5, 0], azimuth: 5.5 * PI, polar: 1.35, distance: 1.5 },
    pointIds: ['SP10', 'BL40', 'GB34', 'SP9', 'ST36', 'ST40', 'SP6', 'KI7', 'KI3', 'BL60'],
    labelIds: ['ST36', 'SP6', 'GB34', 'BL40', 'KI3', 'SP10'],
    side: 'R',
  },
  {
    id: 'foot',
    title: '足部',
    kicker: '第十二章',
    body:
      '諸經之井起於四末。足背的太衝平肝熄風，與合谷合稱「四關」；' +
      '足底的湧泉是腎經起點，引火歸元。旅程至此，經氣已從頭走到足。',
    pose: { target: [0, 0.09, 0.03], azimuth: 6 * PI, polar: 0.95, distance: 0.85 },
    pointIds: ['LR3', 'LR2', 'ST44', 'GB41', 'LR1', 'SP1', 'BL67', 'KI1'],
    labelIds: ['LR3', 'ST44', 'GB41', 'SP1', 'KI1'],
    side: 'L',
  },
  {
    id: 'finale',
    title: '自由探索',
    kicker: '終章',
    body:
      '十二處走完，銅人交還給你。拖曳旋轉、捲動縮放，點選任何穴位' +
      '透視它對應的臟腑，或從經絡選單循一條經絡走完全程。',
    pose: { target: [0, 1.05, 0], azimuth: 6 * PI, polar: 1.48, distance: 3.2 },
    pointIds: [],
    labelIds: [],
    side: 'L',
  },
]

export const SECTION_POSES: CameraPose[] = STORY_SECTIONS.map((s) => s.pose)

export const SECTION_INDEX = new Map(STORY_SECTIONS.map((s, i) => [s.id, i]))
