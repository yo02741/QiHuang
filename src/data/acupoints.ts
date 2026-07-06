import type { Acupoint } from './types'

/**
 * 67 個代表性穴位（每經 3–6 穴）。
 * location 為「示意」教育描述；anchor 為銅人身上的藝術示意位置。
 * 本資料僅供教育與文化展示用途，非醫療建議。
 */
export const ACUPOINTS: Acupoint[] = [
  // ── 手太陰肺經 LU ──
  {
    id: 'LU1', meridianId: 'LU', name: '中府', pinyin: 'Zhōngfǔ', code: 'LU1',
    anchor: { kind: 'torso', y: 1.32, az: 0.55 },
    location: '前胸外上方，鎖骨下窩外側，第一肋間隙處（示意）。',
    functions: ['止咳平喘', '清瀉肺熱', '健脾補氣'],
    organIds: ['lung', 'spleen'],
  },
  {
    id: 'LU5', meridianId: 'LU', name: '尺澤', pinyin: 'Chǐzé', code: 'LU5',
    anchor: { kind: 'limb', segment: 'forearm', t: 0.04, angle: 2.4 },
    location: '肘橫紋中，肱二頭肌腱橈側凹陷處。',
    functions: ['清肺瀉熱', '止咳平喘', '通絡止痛'],
    organIds: ['lung'],
  },
  {
    id: 'LU7', meridianId: 'LU', name: '列缺', pinyin: 'Lièquē', code: 'LU7',
    anchor: { kind: 'limb', segment: 'forearm', t: 0.85, angle: 2.2 },
    location: '橈骨莖突上方，腕橫紋上一寸半。',
    functions: ['宣肺疏風', '通調任脈', '治頭項強痛'],
    organIds: ['lung', 'largeIntestine'],
  },
  {
    id: 'LU9', meridianId: 'LU', name: '太淵', pinyin: 'Tàiyuān', code: 'LU9',
    anchor: { kind: 'limb', segment: 'forearm', t: 0.97, angle: 2.4 },
    location: '腕掌側橫紋橈側，橈動脈搏動處。',
    functions: ['補肺益氣', '通脈止咳', '脈會太淵'],
    organIds: ['lung'],
  },
  {
    id: 'LU11', meridianId: 'LU', name: '少商', pinyin: 'Shàoshāng', code: 'LU11',
    anchor: { kind: 'limb', segment: 'hand', t: 0.95, angle: 2.6 },
    location: '拇指橈側，指甲角旁約一分處。',
    functions: ['清熱利咽', '開竅醒神', '急救要穴'],
    organIds: ['lung'],
  },

  // ── 手陽明大腸經 LI ──
  {
    id: 'LI1', meridianId: 'LI', name: '商陽', pinyin: 'Shāngyáng', code: 'LI1',
    anchor: { kind: 'limb', segment: 'hand', t: 0.95, angle: 0.8 },
    location: '食指橈側，指甲角旁約一分處。',
    functions: ['清熱消腫', '開竅醒神', '利咽'],
    organIds: ['largeIntestine'],
  },
  {
    id: 'LI4', meridianId: 'LI', name: '合谷', pinyin: 'Hégǔ', code: 'LI4',
    anchor: { kind: 'limb', segment: 'hand', t: 0.3, angle: 0.6 },
    location: '手背第一、二掌骨之間，第二掌骨橈側中點。',
    functions: ['疏風解表', '鎮痛開竅', '頭面諸疾之要穴', '孕婦慎用'],
    organIds: ['largeIntestine', 'lung'],
  },
  {
    id: 'LI10', meridianId: 'LI', name: '手三里', pinyin: 'Shǒusānlǐ', code: 'LI10',
    anchor: { kind: 'limb', segment: 'forearm', t: 0.25, angle: 0.4 },
    location: '前臂背面橈側，曲池穴下二寸。',
    functions: ['通經活絡', '消腫止痛', '調理腸胃'],
    organIds: ['largeIntestine', 'stomach'],
  },
  {
    id: 'LI11', meridianId: 'LI', name: '曲池', pinyin: 'Qūchí', code: 'LI11',
    anchor: { kind: 'limb', segment: 'forearm', t: 0.03, angle: 0.3 },
    location: '屈肘成直角，肘橫紋外側端凹陷處。',
    functions: ['清熱解表', '調和氣血', '祛風止癢'],
    organIds: ['largeIntestine'],
  },
  {
    id: 'LI20', meridianId: 'LI', name: '迎香', pinyin: 'Yíngxiāng', code: 'LI20',
    anchor: { kind: 'head', polar: 1.62, az: 0.22 },
    location: '鼻翼外緣中點旁，鼻唇溝中。',
    functions: ['宣通鼻竅', '疏散風熱', '治鼻塞鼻炎'],
    organIds: ['largeIntestine', 'lung'],
  },

  // ── 足陽明胃經 ST ──
  {
    id: 'ST1', meridianId: 'ST', name: '承泣', pinyin: 'Chéngqì', code: 'ST1',
    anchor: { kind: 'head', polar: 1.38, az: 0.3 },
    location: '目正視，瞳孔直下，眼球與眶下緣之間。',
    functions: ['明目止淚', '疏風清熱'],
    organIds: ['stomach'],
  },
  {
    id: 'ST25', meridianId: 'ST', name: '天樞', pinyin: 'Tiānshū', code: 'ST25',
    anchor: { kind: 'torso', y: 1.02, az: 0.42 },
    location: '腹部，肚臍旁開二寸。',
    functions: ['調理腸胃', '理氣消滯', '大腸募穴'],
    organIds: ['largeIntestine', 'stomach'],
  },
  {
    id: 'ST36', meridianId: 'ST', name: '足三里', pinyin: 'Zúsānlǐ', code: 'ST36',
    anchor: { kind: 'limb', segment: 'calf', t: 0.2, angle: 0.9 },
    location: '小腿前外側，犢鼻穴下三寸，脛骨前緣外一橫指。',
    functions: ['健脾和胃', '扶正培元', '強壯保健要穴'],
    organIds: ['stomach', 'spleen'],
  },
  {
    id: 'ST40', meridianId: 'ST', name: '豐隆', pinyin: 'Fēnglóng', code: 'ST40',
    anchor: { kind: 'limb', segment: 'calf', t: 0.55, angle: 0.75 },
    location: '小腿前外側，外踝尖上八寸，脛骨前緣外二橫指。',
    functions: ['祛濕化痰', '和胃降逆', '化痰要穴'],
    organIds: ['stomach', 'spleen'],
  },
  {
    id: 'ST44', meridianId: 'ST', name: '內庭', pinyin: 'Nèitíng', code: 'ST44',
    anchor: { kind: 'limb', segment: 'foot', t: 0.85, angle: 1.3 },
    location: '足背第二、三趾間，趾蹼緣後方赤白肉際處。',
    functions: ['清胃瀉火', '理氣止痛', '治牙痛咽痛'],
    organIds: ['stomach'],
  },

  // ── 足太陰脾經 SP ──
  {
    id: 'SP1', meridianId: 'SP', name: '隱白', pinyin: 'Yǐnbái', code: 'SP1',
    anchor: { kind: 'limb', segment: 'foot', t: 0.92, angle: 2.5 },
    location: '足大趾內側，趾甲角旁約一分處。',
    functions: ['健脾統血', '益氣攝血', '寧神'],
    organIds: ['spleen'],
  },
  {
    id: 'SP6', meridianId: 'SP', name: '三陰交', pinyin: 'Sānyīnjiāo', code: 'SP6',
    anchor: { kind: 'limb', segment: 'calf', t: 0.85, angle: 2.9 },
    location: '小腿內側，內踝尖上三寸，脛骨內側緣後方。',
    functions: ['肝脾腎三經交會', '健脾益血', '調肝補腎', '孕婦禁針'],
    organIds: ['spleen', 'liver', 'kidney'],
  },
  {
    id: 'SP9', meridianId: 'SP', name: '陰陵泉', pinyin: 'Yīnlíngquán', code: 'SP9',
    anchor: { kind: 'limb', segment: 'calf', t: 0.12, angle: 2.9 },
    location: '小腿內側，脛骨內側髁下緣凹陷處。',
    functions: ['健脾利濕', '通利小便', '消水腫'],
    organIds: ['spleen', 'bladder'],
  },
  {
    id: 'SP10', meridianId: 'SP', name: '血海', pinyin: 'Xuèhǎi', code: 'SP10',
    anchor: { kind: 'limb', segment: 'thigh', t: 0.85, angle: 2.3 },
    location: '大腿內側，髕骨內上緣上二寸。',
    functions: ['調經統血', '健脾化濕', '治皮膚搔癢'],
    organIds: ['spleen', 'liver'],
  },
  {
    id: 'SP21', meridianId: 'SP', name: '大包', pinyin: 'Dàbāo', code: 'SP21',
    anchor: { kind: 'torso', y: 1.24, az: 1.15 },
    location: '側胸部，腋中線上，第六肋間隙處。',
    functions: ['脾之大絡', '統絡陰陽諸絡', '寬胸利脅'],
    organIds: ['spleen'],
  },

  // ── 手少陰心經 HT ──
  {
    id: 'HT1', meridianId: 'HT', name: '極泉', pinyin: 'Jíquán', code: 'HT1',
    anchor: { kind: 'point', pos: [0.165, 1.335, 0.005] },
    location: '腋窩正中，腋動脈搏動處。',
    functions: ['寬胸寧神', '通絡止痛'],
    organIds: ['heart'],
  },
  {
    id: 'HT3', meridianId: 'HT', name: '少海', pinyin: 'Shàohǎi', code: 'HT3',
    anchor: { kind: 'limb', segment: 'forearm', t: 0.04, angle: 3.5 },
    location: '屈肘，肘橫紋內側端與肱骨內上髁連線的中點。',
    functions: ['寧心安神', '通絡止痛'],
    organIds: ['heart'],
  },
  {
    id: 'HT7', meridianId: 'HT', name: '神門', pinyin: 'Shénmén', code: 'HT7',
    anchor: { kind: 'limb', segment: 'forearm', t: 0.97, angle: 3.5 },
    location: '腕橫紋尺側端，尺側腕屈肌腱橈側凹陷處。',
    functions: ['寧心安神', '清心熱', '治失眠健忘'],
    organIds: ['heart'],
  },
  {
    id: 'HT9', meridianId: 'HT', name: '少衝', pinyin: 'Shàochōng', code: 'HT9',
    anchor: { kind: 'limb', segment: 'hand', t: 0.93, angle: 3.4 },
    location: '小指橈側，指甲角旁約一分處。',
    functions: ['開竅醒神', '清熱熄風', '急救要穴'],
    organIds: ['heart'],
  },

  // ── 手太陽小腸經 SI ──
  {
    id: 'SI1', meridianId: 'SI', name: '少澤', pinyin: 'Shàozé', code: 'SI1',
    anchor: { kind: 'limb', segment: 'hand', t: 0.93, angle: -0.8 },
    location: '小指尺側，指甲角旁約一分處。',
    functions: ['清熱利咽', '通乳開竅'],
    organIds: ['smallIntestine', 'heart'],
  },
  {
    id: 'SI3', meridianId: 'SI', name: '後溪', pinyin: 'Hòuxī', code: 'SI3',
    anchor: { kind: 'limb', segment: 'hand', t: 0.5, angle: -0.9 },
    location: '微握拳，第五掌指關節後尺側，橫紋頭赤白肉際處。',
    functions: ['通督脈', '清心安神', '舒筋活絡'],
    organIds: ['smallIntestine'],
  },
  {
    id: 'SI11', meridianId: 'SI', name: '天宗', pinyin: 'Tiānzōng', code: 'SI11',
    anchor: { kind: 'torso', y: 1.31, az: 2.45 },
    location: '肩胛部，肩胛岡下窩中央凹陷處。',
    functions: ['舒筋活絡', '理氣消腫', '治肩背痠痛'],
    organIds: ['smallIntestine'],
  },
  {
    id: 'SI19', meridianId: 'SI', name: '聽宮', pinyin: 'Tīnggōng', code: 'SI19',
    anchor: { kind: 'head', polar: 1.5, az: 1.1 },
    location: '耳屏前，下頜骨髁狀突後方，張口時呈凹陷處。',
    functions: ['聰耳開竅', '治耳鳴耳聾'],
    organIds: ['smallIntestine', 'heart'],
  },

  // ── 足太陽膀胱經 BL ──
  {
    id: 'BL1', meridianId: 'BL', name: '睛明', pinyin: 'Jīngmíng', code: 'BL1',
    anchor: { kind: 'head', polar: 1.35, az: 0.12 },
    location: '目內眥角稍上方凹陷處。',
    functions: ['明目退翳', '疏風清熱', '目疾要穴'],
    organIds: ['bladder'],
  },
  {
    id: 'BL13', meridianId: 'BL', name: '肺俞', pinyin: 'Fèishù', code: 'BL13',
    anchor: { kind: 'torso', y: 1.33, az: 2.95 },
    location: '背部，第三胸椎棘突下，旁開一寸半。',
    functions: ['肺之背俞穴', '宣肺解表', '止咳平喘'],
    organIds: ['lung', 'bladder'],
  },
  {
    id: 'BL23', meridianId: 'BL', name: '腎俞', pinyin: 'Shènshù', code: 'BL23',
    anchor: { kind: 'torso', y: 1.05, az: 2.95 },
    location: '腰部，第二腰椎棘突下，旁開一寸半。',
    functions: ['腎之背俞穴', '滋陰壯陽', '強腰健骨'],
    organIds: ['kidney', 'bladder'],
  },
  {
    id: 'BL40', meridianId: 'BL', name: '委中', pinyin: 'Wěizhōng', code: 'BL40',
    anchor: { kind: 'limb', segment: 'thigh', t: 0.97, angle: -1.5 },
    location: '膝後膕橫紋中點。',
    functions: ['腰背委中求', '舒筋通絡', '涼血解毒'],
    organIds: ['bladder'],
  },
  {
    id: 'BL60', meridianId: 'BL', name: '崑崙', pinyin: 'Kūnlún', code: 'BL60',
    anchor: { kind: 'limb', segment: 'calf', t: 0.94, angle: -0.7 },
    location: '外踝尖與跟腱之間凹陷處。',
    functions: ['舒筋活絡', '清頭明目', '治項強腰痛'],
    organIds: ['bladder'],
  },
  {
    id: 'BL67', meridianId: 'BL', name: '至陰', pinyin: 'Zhìyīn', code: 'BL67',
    anchor: { kind: 'limb', segment: 'foot', t: 0.9, angle: 0.4 },
    location: '足小趾外側，趾甲角旁約一分處。',
    functions: ['矯正胎位要穴', '清頭明目'],
    organIds: ['bladder', 'kidney'],
  },

  // ── 足少陰腎經 KI ──
  {
    id: 'KI1', meridianId: 'KI', name: '湧泉', pinyin: 'Yǒngquán', code: 'KI1',
    anchor: { kind: 'limb', segment: 'foot', t: 0.35, angle: -1.6 },
    location: '足底前三分之一凹陷處（蜷足時）。',
    functions: ['滋陰降火', '醒神開竅', '引火歸元'],
    organIds: ['kidney'],
  },
  {
    id: 'KI3', meridianId: 'KI', name: '太溪', pinyin: 'Tàixī', code: 'KI3',
    anchor: { kind: 'limb', segment: 'calf', t: 0.94, angle: 3.2 },
    location: '內踝尖與跟腱之間凹陷處。',
    functions: ['腎經原穴', '滋補腎陰', '壯陽強腰'],
    organIds: ['kidney'],
  },
  {
    id: 'KI7', meridianId: 'KI', name: '復溜', pinyin: 'Fùliū', code: 'KI7',
    anchor: { kind: 'limb', segment: 'calf', t: 0.8, angle: 3.2 },
    location: '小腿內側，太溪穴直上二寸。',
    functions: ['補腎利水', '調節汗液', '治水腫盜汗'],
    organIds: ['kidney'],
  },
  {
    id: 'KI27', meridianId: 'KI', name: '俞府', pinyin: 'Shùfǔ', code: 'KI27',
    anchor: { kind: 'torso', y: 1.385, az: 0.22 },
    location: '胸部，鎖骨下緣，前正中線旁開二寸。',
    functions: ['止咳平喘', '和胃降逆'],
    organIds: ['kidney', 'lung'],
  },

  // ── 手厥陰心包經 PC ──
  {
    id: 'PC3', meridianId: 'PC', name: '曲澤', pinyin: 'Qūzé', code: 'PC3',
    anchor: { kind: 'limb', segment: 'forearm', t: 0.04, angle: 3.0 },
    location: '肘橫紋中，肱二頭肌腱尺側緣。',
    functions: ['清心鎮痛', '和胃降逆'],
    organIds: ['pericardium', 'heart'],
  },
  {
    id: 'PC6', meridianId: 'PC', name: '內關', pinyin: 'Nèiguān', code: 'PC6',
    anchor: { kind: 'limb', segment: 'forearm', t: 0.75, angle: 3.0 },
    location: '前臂掌側，腕橫紋上二寸，兩筋之間。',
    functions: ['寧心安神', '和胃止嘔', '寬胸理氣', '心胸胃之要穴'],
    organIds: ['pericardium', 'heart', 'stomach'],
  },
  {
    id: 'PC8', meridianId: 'PC', name: '勞宮', pinyin: 'Láogōng', code: 'PC8',
    anchor: { kind: 'limb', segment: 'hand', t: 0.45, angle: 3.1 },
    location: '掌心橫紋中，握拳時中指尖所指處。',
    functions: ['清心瀉火', '開竅醒神', '治口瘡心煩'],
    organIds: ['pericardium', 'heart'],
  },
  {
    id: 'PC9', meridianId: 'PC', name: '中衝', pinyin: 'Zhōngchōng', code: 'PC9',
    anchor: { kind: 'limb', segment: 'hand', t: 0.97, angle: 2.9 },
    location: '中指尖端中央。',
    functions: ['開竅醒神', '清熱', '中暑昏迷急救'],
    organIds: ['pericardium', 'heart'],
  },

  // ── 手少陽三焦經 TE ──
  {
    id: 'TE1', meridianId: 'TE', name: '關衝', pinyin: 'Guānchōng', code: 'TE1',
    anchor: { kind: 'limb', segment: 'hand', t: 0.93, angle: 0.2 },
    location: '無名指尺側，指甲角旁約一分處。',
    functions: ['清熱開竅', '利咽解暑'],
    organIds: ['sanjiao'],
  },
  {
    id: 'TE5', meridianId: 'TE', name: '外關', pinyin: 'Wàiguān', code: 'TE5',
    anchor: { kind: 'limb', segment: 'forearm', t: 0.75, angle: 0.0 },
    location: '前臂背側，腕背橫紋上二寸，兩骨之間（與內關相對）。',
    functions: ['疏風清熱', '通經活絡', '治偏頭痛耳鳴'],
    organIds: ['sanjiao'],
  },
  {
    id: 'TE6', meridianId: 'TE', name: '支溝', pinyin: 'Zhīgōu', code: 'TE6',
    anchor: { kind: 'limb', segment: 'forearm', t: 0.65, angle: 0.0 },
    location: '前臂背側，腕背橫紋上三寸，兩骨之間。',
    functions: ['清熱通便', '理氣止痛', '便祕要穴'],
    organIds: ['sanjiao', 'largeIntestine'],
  },
  {
    id: 'TE17', meridianId: 'TE', name: '翳風', pinyin: 'Yìfēng', code: 'TE17',
    anchor: { kind: 'head', polar: 1.7, az: 1.55 },
    location: '耳垂後方，乳突與下頜角之間凹陷處。',
    functions: ['聰耳通竅', '祛風通絡', '治耳鳴面癱'],
    organIds: ['sanjiao', 'gallbladder'],
  },
  {
    id: 'TE23', meridianId: 'TE', name: '絲竹空', pinyin: 'Sīzhúkōng', code: 'TE23',
    anchor: { kind: 'head', polar: 1.28, az: 0.72 },
    location: '眉梢外側凹陷處。',
    functions: ['明目止痛', '治偏頭痛'],
    organIds: ['sanjiao'],
  },

  // ── 足少陽膽經 GB ──
  {
    id: 'GB1', meridianId: 'GB', name: '瞳子髎', pinyin: 'Tóngzǐliáo', code: 'GB1',
    anchor: { kind: 'head', polar: 1.38, az: 0.55 },
    location: '目外眥旁約半寸，眶外緣凹陷處。',
    functions: ['明目退翳', '疏風清熱'],
    organIds: ['gallbladder'],
  },
  {
    id: 'GB20', meridianId: 'GB', name: '風池', pinyin: 'Fēngchí', code: 'GB20',
    anchor: { kind: 'head', polar: 2.2, az: 2.35 },
    location: '枕骨之下，胸鎖乳突肌與斜方肌上端之間凹陷處。',
    functions: ['祛風要穴', '疏風清熱', '醒腦明目'],
    organIds: ['gallbladder', 'liver'],
  },
  {
    id: 'GB21', meridianId: 'GB', name: '肩井', pinyin: 'Jiānjǐng', code: 'GB21',
    anchor: { kind: 'point', pos: [0.13, 1.435, -0.015] },
    location: '肩上，大椎穴與肩峰端連線的中點。',
    functions: ['通經活絡', '治肩背痠痛', '孕婦慎用'],
    organIds: ['gallbladder'],
  },
  {
    id: 'GB30', meridianId: 'GB', name: '環跳', pinyin: 'Huántiào', code: 'GB30',
    anchor: { kind: 'torso', y: 0.9, az: 1.75 },
    location: '臀外側，股骨大轉子最凸點與骶管裂孔連線的外三分之一處。',
    functions: ['祛風化濕', '強健腰腿', '治坐骨神經痛'],
    organIds: ['gallbladder', 'bladder'],
  },
  {
    id: 'GB34', meridianId: 'GB', name: '陽陵泉', pinyin: 'Yánglíngquán', code: 'GB34',
    anchor: { kind: 'limb', segment: 'calf', t: 0.12, angle: 0.35 },
    location: '小腿外側，腓骨小頭前下方凹陷處。',
    functions: ['筋會陽陵', '舒筋壯筋', '清利肝膽'],
    organIds: ['gallbladder', 'liver'],
  },
  {
    id: 'GB41', meridianId: 'GB', name: '足臨泣', pinyin: 'Zúlínqì', code: 'GB41',
    anchor: { kind: 'limb', segment: 'foot', t: 0.65, angle: 0.7 },
    location: '足背，第四、五蹠骨結合部前方凹陷處。',
    functions: ['疏肝利脅', '通經活絡', '治偏頭痛'],
    organIds: ['gallbladder'],
  },

  // ── 足厥陰肝經 LR ──
  {
    id: 'LR1', meridianId: 'LR', name: '大敦', pinyin: 'Dàdūn', code: 'LR1',
    anchor: { kind: 'limb', segment: 'foot', t: 0.93, angle: 2.3 },
    location: '足大趾外側（靠第二趾側），趾甲角旁約一分處。',
    functions: ['疏肝理氣', '調經止崩'],
    organIds: ['liver'],
  },
  {
    id: 'LR2', meridianId: 'LR', name: '行間', pinyin: 'Xíngjiān', code: 'LR2',
    anchor: { kind: 'limb', segment: 'foot', t: 0.75, angle: 2.1 },
    location: '足背，第一、二趾間，趾蹼緣後方赤白肉際處。',
    functions: ['清肝瀉火', '治頭痛目赤口苦'],
    organIds: ['liver'],
  },
  {
    id: 'LR3', meridianId: 'LR', name: '太衝', pinyin: 'Tàichōng', code: 'LR3',
    anchor: { kind: 'limb', segment: 'foot', t: 0.5, angle: 2.0 },
    location: '足背，第一、二蹠骨結合部前方凹陷處。',
    functions: ['肝經原穴', '平肝熄風', '疏肝解鬱', '與合谷合稱「四關」'],
    organIds: ['liver'],
  },
  {
    id: 'LR14', meridianId: 'LR', name: '期門', pinyin: 'Qīmén', code: 'LR14',
    anchor: { kind: 'torso', y: 1.18, az: 0.55 },
    location: '胸部，乳頭直下，第六肋間隙處。',
    functions: ['肝之募穴', '疏肝健脾', '理氣活血'],
    organIds: ['liver', 'spleen'],
  },

  // ── 任脈 CV ──
  {
    id: 'CV4', meridianId: 'CV', name: '關元', pinyin: 'Guānyuán', code: 'CV4',
    anchor: { kind: 'torso', y: 0.94, az: 0 },
    location: '下腹部，前正中線上，臍下三寸。',
    functions: ['培元固本', '補益下焦', '保健要穴', '小腸募穴'],
    organIds: ['kidney', 'smallIntestine', 'bladder'],
  },
  {
    id: 'CV6', meridianId: 'CV', name: '氣海', pinyin: 'Qìhǎi', code: 'CV6',
    anchor: { kind: 'torso', y: 0.975, az: 0 },
    location: '下腹部，前正中線上，臍下一寸半。',
    functions: ['益氣助陽', '調經固經', '治氣虛乏力'],
    organIds: ['kidney'],
  },
  {
    id: 'CV12', meridianId: 'CV', name: '中脘', pinyin: 'Zhōngwǎn', code: 'CV12',
    anchor: { kind: 'torso', y: 1.13, az: 0 },
    location: '上腹部，前正中線上，臍上四寸。',
    functions: ['胃之募穴・腑會', '和胃健脾', '降逆利水'],
    organIds: ['stomach', 'spleen'],
  },
  {
    id: 'CV17', meridianId: 'CV', name: '膻中', pinyin: 'Dànzhōng', code: 'CV17',
    anchor: { kind: 'torso', y: 1.25, az: 0 },
    location: '胸部，前正中線上，兩乳頭連線的中點。',
    functions: ['氣會膻中・心包募穴', '寬胸理氣', '寧心'],
    organIds: ['pericardium', 'lung', 'heart'],
  },
  {
    id: 'CV23', meridianId: 'CV', name: '廉泉', pinyin: 'Liánquán', code: 'CV23',
    anchor: { kind: 'torso', y: 1.455, az: 0 },
    location: '頸前部，前正中線上，喉結上方，舌骨上緣凹陷處。',
    functions: ['利喉舒舌', '治吞嚥困難舌強'],
    organIds: ['heart'],
  },

  // ── 督脈 GV ──
  {
    id: 'GV4', meridianId: 'GV', name: '命門', pinyin: 'Mìngmén', code: 'GV4',
    anchor: { kind: 'torso', y: 1.02, az: 3.14 },
    location: '腰部，後正中線上，第二腰椎棘突下（與臍相對）。',
    functions: ['培元補腎', '固精壯陽', '治腰痛畏寒'],
    organIds: ['kidney'],
  },
  {
    id: 'GV14', meridianId: 'GV', name: '大椎', pinyin: 'Dàzhuī', code: 'GV14',
    anchor: { kind: 'torso', y: 1.42, az: 3.12 },
    location: '後正中線上，第七頸椎棘突下凹陷處。',
    functions: ['諸陽之會', '解表清熱', '振奮陽氣'],
    organIds: ['lung'],
  },
  {
    id: 'GV16', meridianId: 'GV', name: '風府', pinyin: 'Fēngfǔ', code: 'GV16',
    anchor: { kind: 'head', polar: 2.3, az: 3.05 },
    location: '後髮際正中直上一寸，枕外隆凸直下凹陷處。',
    functions: ['祛風清神', '治頭痛眩暈項強'],
    organIds: [],
  },
  {
    id: 'GV20', meridianId: 'GV', name: '百會', pinyin: 'Bǎihuì', code: 'GV20',
    anchor: { kind: 'head', polar: 0.08, az: 0.5 },
    location: '頭頂正中線與兩耳尖連線的交點。',
    functions: ['升陽舉陷', '醒腦開竅', '安神定志'],
    organIds: ['heart'],
  },
  {
    id: 'GV26', meridianId: 'GV', name: '人中（水溝）', pinyin: 'Rénzhōng', code: 'GV26',
    anchor: { kind: 'head', polar: 2.25, az: 0.08 },
    location: '人中溝上三分之一與中三分之一交點處。',
    functions: ['急救要穴', '醒神開竅', '治昏迷暈厥'],
    organIds: ['heart'],
  },
]

export const ACUPOINT_MAP = new Map(ACUPOINTS.map((p) => [p.id, p]))
