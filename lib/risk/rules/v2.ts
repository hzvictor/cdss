/**
 * Rule library v2 — expanded from v1's 15 entries to ~150 covering 14 organ
 * systems / categories. ID format: `CAT-NNN` where CAT is a 3-letter category
 * code and NNN is sequence within the category (severity prefix not embedded
 * to keep IDs stable across severity reclassification).
 *
 * Categories (CTCAE-aligned naming):
 *   HEM  — Hematologic / 血液系统
 *   CAR  — Cardiovascular / 心血管
 *   RES  — Respiratory / 呼吸系统
 *   GAS  — Gastrointestinal / 消化系统
 *   NEU  — Neurologic / 神经系统
 *   DER  — Dermatologic / 皮肤
 *   REN  — Renal / 肾脏
 *   HEP  — Hepatic / 肝脏
 *   END  — Endocrine / 内分泌
 *   GEN  — Genitourinary & Reproductive / 泌尿生殖
 *   PSY  — Psychiatric / 精神
 *   PAI  — Pain / 疼痛
 *   CON  — Constitutional / 全身症状
 *   INF  — Infection / 感染
 *   MET  — Metabolic / 代谢电解质
 *   BCS  — Breast Cancer Specific / 乳腺癌专属（淋巴水肿、内分泌治疗副作用、
 *          HER2 / 蒽环类心毒性、术后伤口、骨密度、复发监测等）
 *
 * ⚠ Demo rules. Production deployment must replace with CTCAE v5.0 + CSCO
 *   breast-cancer survivorship guideline entries reviewed by an oncologist.
 */

import type { RuleDef } from "./v1";

export const RULE_VERSION = "v2";

const HEM: RuleDef[] = [
  { id: "HEM-001", name: "粒缺伴发热", description: "化疗后中性粒细胞绝对值 <0.5×10⁹/L 且体温≥38.3°C，是肿瘤急症。", keywords: ["发热", "高烧", "白细胞低", "中性粒细胞", "化疗后发烧", "粒缺"], severity: "high", adviceTemplate: "立即就医，按粒缺伴发热处理；先经验性抗生素，避免延误。" },
  { id: "HEM-002", name: "重度贫血", description: "血红蛋白 <70 g/L，伴明显乏力、心悸、活动后气促。", keywords: ["头晕", "心慌", "面色苍白", "重度贫血", "血红蛋白低"], severity: "high", adviceTemplate: "立即就医评估输血指征，避免剧烈活动。" },
  { id: "HEM-003", name: "重度血小板减少", description: "PLT <20×10⁹/L 或伴自发性出血。", keywords: ["血小板低", "皮下出血", "瘀斑", "牙龈出血", "鼻出血"], severity: "high", adviceTemplate: "立即就医评估输注血小板；避免按压、热敷、剧烈运动。" },
  { id: "HEM-004", name: "中度白细胞减少", description: "WBC 1.0-1.9×10⁹/L 或 ANC 0.5-0.9×10⁹/L，无发热。", keywords: ["白细胞下降", "粒细胞少", "免疫力低"], severity: "medium", adviceTemplate: "联系医疗团队评估升白方案，避免人群聚集。" },
  { id: "HEM-005", name: "中度贫血", description: "Hgb 80-99 g/L，伴轻中度乏力。", keywords: ["疲乏", "面色不好", "贫血"], severity: "medium", adviceTemplate: "联系团队复查血常规，可能需要补铁/促红素。" },
  { id: "HEM-006", name: "深静脉血栓征象", description: "下肢不对称肿胀、皮温升高、压痛，提示 DVT 风险。", keywords: ["腿肿", "小腿痛", "压痛", "单侧肿"], severity: "high", adviceTemplate: "立即就医行下肢血管超声，避免按摩。" },
  { id: "HEM-007", name: "可疑肺栓塞", description: "突发胸痛、气促、心动过速、咯血。", keywords: ["突然胸痛", "咯血", "气促", "心慌胸闷"], severity: "high", adviceTemplate: "立即拨打 120，行 CTPA 排查肺栓塞。" },
  { id: "HEM-008", name: "凝血功能异常", description: "INR 显著升高或 D-dimer 异常伴出血倾向。", keywords: ["凝血", "止血困难"], severity: "medium", adviceTemplate: "联系团队复查凝血四项。" },
  { id: "HEM-009", name: "轻度白细胞下降", description: "WBC 2.0-3.9×10⁹/L，无症状。", keywords: ["白细胞略低"], severity: "low", adviceTemplate: "继续观察并定期复查血常规。" },
  { id: "HEM-010", name: "轻度贫血", description: "Hgb 100-119 g/L，可耐受。", keywords: ["稍微乏力"], severity: "low", adviceTemplate: "继续观察并保证营养摄入。" },
];

const CAR: RuleDef[] = [
  { id: "CAR-001", name: "急性胸痛", description: "持续性或压榨性胸痛，可能为急性冠脉事件或药物心脏毒性表现。", keywords: ["胸痛", "心绞痛", "胸口痛", "心前区"], severity: "high", adviceTemplate: "立即就医行心电图与心肌酶检查，避免延误。" },
  { id: "CAR-002", name: "急性心衰征象", description: "突发呼吸困难、不能平卧、双下肢水肿急剧加重。", keywords: ["呼吸困难", "不能平卧", "水肿加重", "夜间憋醒"], severity: "high", adviceTemplate: "立即拨打 120 并就诊心内科。" },
  { id: "CAR-003", name: "晕厥/接近晕厥", description: "短暂意识丧失或眼前发黑，可能为心律失常或低灌注。", keywords: ["晕倒", "黑朦", "眼前一黑", "晕厥"], severity: "high", adviceTemplate: "立即就医行心电图与动态心电监测。" },
  { id: "CAR-004", name: "心悸伴心动过速", description: "持续性心悸，心率 >120 次/分，伴胸闷或乏力。", keywords: ["心慌", "心跳快", "心悸", "心率快"], severity: "medium", adviceTemplate: "联系团队评估心电图，必要时 24 小时动态。" },
  { id: "CAR-005", name: "高血压急症征象", description: "血压 >180/110 mmHg 伴头痛、视物模糊。", keywords: ["血压高", "头痛", "高血压", "180"], severity: "high", adviceTemplate: "立即就医监测血压并降压治疗。" },
  { id: "CAR-006", name: "蒽环类心毒性可疑", description: "用阿霉素/表阿霉素后出现新发心悸、活动耐量下降。", keywords: ["阿霉素", "表阿霉素", "活动后气短"], severity: "medium", adviceTemplate: "联系团队评估心脏超声 LVEF。" },
  { id: "CAR-007", name: "曲妥珠单抗心毒性", description: "HER2 治疗中出现 LVEF 下降或心悸。", keywords: ["赫赛汀", "曲妥珠", "靶向心慌"], severity: "medium", adviceTemplate: "联系团队评估是否暂停治疗 + 心超复查。" },
  { id: "CAR-008", name: "下肢水肿（轻）", description: "踝部轻度水肿，凹陷性，活动后明显。", keywords: ["脚肿", "踝部肿"], severity: "low", adviceTemplate: "继续观察并抬高下肢，监测 24h 尿量。" },
  { id: "CAR-009", name: "血压轻度升高", description: "收缩压 140-159 mmHg 或舒张压 90-99 mmHg。", keywords: ["血压有点高"], severity: "low", adviceTemplate: "继续观察并多次测量，记录血压日记。" },
  { id: "CAR-010", name: "偶发心悸", description: "偶发心悸数秒，无伴随症状。", keywords: ["偶尔心慌"], severity: "low", adviceTemplate: "继续观察并避免咖啡因/浓茶。" },
];

const RES: RuleDef[] = [
  { id: "RES-001", name: "急性呼吸困难", description: "突发气促、不能完成日常活动，可能为肺栓塞、肺炎或药物性肺炎。", keywords: ["呼吸困难", "喘不上气", "气短", "呼吸急促"], severity: "high", adviceTemplate: "立即就医，必要时拨打 120。" },
  { id: "RES-002", name: "咯血", description: "痰中带血或大量咯血。", keywords: ["咯血", "痰中带血", "咳血"], severity: "high", adviceTemplate: "立即就医行胸部 CT。" },
  { id: "RES-003", name: "免疫治疗相关肺炎", description: "PD-1/PD-L1 治疗后新发干咳、气促，伴影像间质改变。", keywords: ["免疫治疗", "PD-1", "干咳", "免疫肺炎"], severity: "high", adviceTemplate: "立即联系团队，可能需要激素冲击。" },
  { id: "RES-004", name: "持续干咳", description: "干咳超过 1 周，无明显诱因。", keywords: ["干咳", "咳嗽不停"], severity: "medium", adviceTemplate: "联系团队评估胸片排除肺部感染。" },
  { id: "RES-005", name: "活动后气促", description: "近期活动耐量下降，爬一层楼气短。", keywords: ["稍微动就喘", "活动气促"], severity: "medium", adviceTemplate: "联系团队评估心肺功能。" },
  { id: "RES-006", name: "上呼吸道感染征象", description: "鼻塞、流涕、咽痛伴低热。", keywords: ["感冒", "流涕", "咽痛", "嗓子疼"], severity: "medium", adviceTemplate: "联系团队，免疫低下时易进展为肺炎。" },
  { id: "RES-007", name: "夜间咳嗽", description: "夜间频发咳嗽影响睡眠，无发热。", keywords: ["夜咳", "晚上咳"], severity: "low", adviceTemplate: "继续观察，可垫高枕头，记录持续天数。" },
  { id: "RES-008", name: "轻度咽部不适", description: "晨起咽干、轻微异物感。", keywords: ["嗓子不舒服", "咽干"], severity: "low", adviceTemplate: "继续观察并保持饮水。" },
  { id: "RES-009", name: "鼻塞流涕", description: "单纯鼻部症状，无发热。", keywords: ["鼻塞", "流鼻涕"], severity: "low", adviceTemplate: "继续观察。" },
  { id: "RES-010", name: "持续低氧（自测）", description: "脉氧 <94% 持续存在。", keywords: ["脉氧低", "血氧低", "94"], severity: "high", adviceTemplate: "立即就医评估缺氧原因。" },
];

const GAS: RuleDef[] = [
  { id: "GAS-001", name: "持续呕吐 / 不能进食", description: "化疗后 48 小时仍剧烈呕吐，存在脱水与电解质紊乱风险。", keywords: ["持续呕吐", "吐不停", "不能进食", "水都喝不下"], severity: "medium", adviceTemplate: "24-48 小时内联系医疗团队，必要时静脉补液。" },
  { id: "GAS-002", name: "顽固性恶心", description: "止吐药无效，每日恶心持续。", keywords: ["恶心想吐", "吃啥吐啥"], severity: "medium", adviceTemplate: "联系团队调整止吐方案。" },
  { id: "GAS-003", name: "重度腹泻", description: "每日 7 次以上稀便，提示药物相关性肠炎。", keywords: ["拉肚子很多次", "严重腹泻", "10 次", "稀水样便"], severity: "high", adviceTemplate: "立即就医补液，警惕电解质紊乱。" },
  { id: "GAS-004", name: "中度腹泻", description: "每日 4-6 次稀便，持续 2 天以上。", keywords: ["腹泻", "稀便", "拉肚子"], severity: "medium", adviceTemplate: "联系医疗团队评估止泻方案与电解质监测。" },
  { id: "GAS-005", name: "轻度腹泻", description: "每日 1-3 次稀便。", keywords: ["大便稀", "次数稍多"], severity: "low", adviceTemplate: "继续观察并补充电解质。" },
  { id: "GAS-006", name: "便血/黑便", description: "鲜血便、黑便或大便潜血强阳性。", keywords: ["便血", "黑便", "拉血"], severity: "high", adviceTemplate: "立即就医排查消化道出血。" },
  { id: "GAS-007", name: "急腹症", description: "突发剧烈腹痛伴板状腹或反跳痛。", keywords: ["剧烈腹痛", "肚子疼", "板状腹"], severity: "high", adviceTemplate: "立即就医排查穿孔或梗阻。" },
  { id: "GAS-008", name: "口腔黏膜炎", description: "广泛口腔黏膜溃疡影响进食。", keywords: ["口腔溃疡", "嘴里长疮", "黏膜溃烂", "口痛"], severity: "medium", adviceTemplate: "联系医疗团队，使用医生建议的漱口水方案。" },
  { id: "GAS-009", name: "便秘加重", description: "排便次数 <3 次/周，伴腹胀。", keywords: ["便秘", "拉不出"], severity: "medium", adviceTemplate: "联系团队评估，化疗止吐药常致便秘。" },
  { id: "GAS-010", name: "胃灼热/反酸", description: "频繁烧心、反流。", keywords: ["反酸", "烧心"], severity: "low", adviceTemplate: "继续观察，避免空腹饮咖啡浓茶。" },
  { id: "GAS-011", name: "食欲减退", description: "持续 1 周以上明显食欲下降。", keywords: ["不想吃", "没胃口", "食欲差"], severity: "medium", adviceTemplate: "联系团队评估营养状态，必要时营养支持。" },
  { id: "GAS-012", name: "腹胀", description: "餐后腹胀明显，伴排气减少。", keywords: ["肚子胀", "腹胀"], severity: "low", adviceTemplate: "继续观察并少量多餐。" },
  { id: "GAS-013", name: "轻度恶心", description: "未影响进食的轻度恶心。", keywords: ["有点恶心", "胃不舒服"], severity: "low", adviceTemplate: "继续观察，少食多餐避免油腻。" },
  { id: "GAS-014", name: "肝区疼痛", description: "右上腹持续胀痛或叩击痛。", keywords: ["右上腹痛", "肝区不适"], severity: "medium", adviceTemplate: "联系团队复查肝功能与影像。" },
  { id: "GAS-015", name: "吞咽困难", description: "吞咽时疼痛或食物滞留感。", keywords: ["吞不下", "咽痛", "吞咽困难"], severity: "medium", adviceTemplate: "联系团队评估食管黏膜炎。" },
];

const NEU: RuleDef[] = [
  { id: "NEU-001", name: "急性神经事件可疑", description: "突发剧烈头痛、视物模糊、意识改变、抽搐。", keywords: ["剧烈头痛", "视物模糊", "意识模糊", "晕厥", "抽搐"], severity: "high", adviceTemplate: "立即拨打 120 或前往最近的急诊。" },
  { id: "NEU-002", name: "周围神经病变", description: "紫杉类等药物可致手足麻木、刺痛，加重影响治疗。", keywords: ["手足麻木", "手脚麻", "神经痛", "刺痛", "针刺感"], severity: "medium", adviceTemplate: "联系医疗团队评估剂量调整方案，避免极端温度。" },
  { id: "NEU-003", name: "重度神经病变", description: "影响日常活动（持物困难、步态不稳）的麻木刺痛。", keywords: ["手抖拿不住", "走路不稳", "麻得厉害"], severity: "high", adviceTemplate: "立即联系团队评估剂量调整或暂停。" },
  { id: "NEU-004", name: "中枢神经感染征象", description: "颈强直、剧烈头痛、畏光、高热。", keywords: ["脖子硬", "颈部强直", "畏光"], severity: "high", adviceTemplate: "立即就医排查脑膜炎/脑炎。" },
  { id: "NEU-005", name: "持续头痛", description: "新发或加重头痛超过 3 天，止痛药无效。", keywords: ["头疼", "头痛"], severity: "medium", adviceTemplate: "联系团队评估是否需要影像。" },
  { id: "NEU-006", name: "头晕/眩晕", description: "持续头晕影响行走，可能为药物或脱水。", keywords: ["头晕", "晕乎乎"], severity: "medium", adviceTemplate: "联系团队评估血压、电解质。" },
  { id: "NEU-007", name: "认知减退", description: "近期记忆力下降、注意力难集中（俗称 chemo brain）。", keywords: ["记不住事", "注意力差", "脑雾"], severity: "low", adviceTemplate: "继续观察并记录，多发生于化疗后。" },
  { id: "NEU-008", name: "睡眠紊乱", description: "频繁失眠或早醒。", keywords: ["失眠", "睡不着", "早醒"], severity: "medium", adviceTemplate: "联系团队评估，避免自购安眠药。" },
  { id: "NEU-009", name: "耳鸣", description: "持续耳鸣可能为铂类耳毒性。", keywords: ["耳鸣", "耳朵嗡嗡"], severity: "medium", adviceTemplate: "联系团队，必要时听力测定。" },
  { id: "NEU-010", name: "听力下降", description: "明显听力减退。", keywords: ["听不清", "耳背"], severity: "high", adviceTemplate: "立即联系团队，铂类耳毒性需立即评估。" },
  { id: "NEU-011", name: "视力变化", description: "新发视物模糊、复视、视野缺损。", keywords: ["看东西模糊", "复视", "看不清"], severity: "high", adviceTemplate: "立即联系团队眼科会诊。" },
  { id: "NEU-012", name: "面部麻木", description: "单侧面部感觉异常。", keywords: ["脸麻", "嘴麻"], severity: "high", adviceTemplate: "立即就医排查脑血管事件。" },
];

const DER: RuleDef[] = [
  { id: "DER-001", name: "Stevens-Johnson征象", description: "广泛皮疹伴黏膜糜烂、发热、剥脱倾向。", keywords: ["皮肤起水疱", "黏膜溃烂", "皮疹大片", "起泡脱皮"], severity: "high", adviceTemplate: "立即就医，警惕重症皮肤反应。" },
  { id: "DER-002", name: "手足综合征 G3", description: "手足红肿、水疱、疼痛影响日常生活（卡培他滨等所致）。", keywords: ["手脚红肿", "手足综合征", "卡培他滨"], severity: "high", adviceTemplate: "立即联系团队评估暂停或减量。" },
  { id: "DER-003", name: "手足综合征 G1-2", description: "手足红斑、轻度脱皮，不影响功能。", keywords: ["手脚发红", "手脱皮"], severity: "medium", adviceTemplate: "联系团队，使用尿素霜，避免高温。" },
  { id: "DER-004", name: "广泛痤疮样皮疹", description: "EGFR 抑制剂引起的躯干面部红色丘疹。", keywords: ["痤疮", "EGFR 皮疹", "脸上长痘"], severity: "medium", adviceTemplate: "联系团队评估，必要时局部抗生素。" },
  { id: "DER-005", name: "瘙痒（重度）", description: "广泛瘙痒影响睡眠。", keywords: ["皮肤痒", "全身痒", "瘙痒"], severity: "medium", adviceTemplate: "联系团队评估抗组胺方案。" },
  { id: "DER-006", name: "局部皮疹（轻）", description: "小范围皮疹无瘙痒、水泡或全身症状。", keywords: ["皮疹", "起疹子", "皮肤红"], severity: "low", adviceTemplate: "继续观察并记录皮疹范围与程度，避免抓挠。" },
  { id: "DER-007", name: "脱发", description: "化疗常见副作用，多为可逆。", keywords: ["脱发", "掉头发", "头发掉"], severity: "low", adviceTemplate: "继续观察并记录，可使用棉质头巾或假发。" },
  { id: "DER-008", name: "皮肤干燥", description: "广泛干燥脱屑，伴瘙痒。", keywords: ["皮肤干", "脱屑"], severity: "low", adviceTemplate: "继续观察，使用温和保湿剂。" },
  { id: "DER-009", name: "指甲改变", description: "指甲变脆、变色或脱落。", keywords: ["指甲变", "指甲脱"], severity: "low", adviceTemplate: "继续观察并保护指甲。" },
  { id: "DER-010", name: "色素沉着", description: "皮肤色素加深（多西他赛等）。", keywords: ["皮肤变黑", "色素沉着"], severity: "low", adviceTemplate: "继续观察，停药后多可恢复。" },
  { id: "DER-011", name: "光过敏", description: "日晒后皮肤红肿水疱。", keywords: ["晒太阳过敏", "光敏"], severity: "medium", adviceTemplate: "联系团队，严格防晒。" },
  { id: "DER-012", name: "蜂窝组织炎征象", description: "局部红、肿、热、痛伴发热。", keywords: ["皮肤红肿热", "局部肿痛"], severity: "high", adviceTemplate: "立即就医评估抗感染治疗。" },
];

const REN: RuleDef[] = [
  { id: "REN-001", name: "无尿/少尿", description: "24 小时尿量 <400 mL，可能为肾衰。", keywords: ["尿少", "排不出", "少尿"], severity: "high", adviceTemplate: "立即就医评估肾功能。" },
  { id: "REN-002", name: "肉眼血尿", description: "尿色发红或茶色。", keywords: ["尿血", "红尿", "茶色尿"], severity: "high", adviceTemplate: "立即就医排查尿路感染或药物毒性。" },
  { id: "REN-003", name: "肌酐升高", description: "近期化验提示血肌酐较基线升高 ≥1.5 倍。", keywords: ["肌酐高", "肾功能"], severity: "medium", adviceTemplate: "联系团队评估并停用肾毒药物。" },
  { id: "REN-004", name: "蛋白尿（重）", description: "尿常规蛋白 ≥3+，伴双下肢水肿。", keywords: ["尿蛋白", "蛋白尿"], severity: "medium", adviceTemplate: "联系团队评估抗血管生成药相关肾损伤。" },
  { id: "REN-005", name: "排尿不适", description: "尿频、尿急、尿痛。", keywords: ["尿频", "尿急", "尿痛", "撒尿疼"], severity: "medium", adviceTemplate: "联系团队评估泌尿系感染。" },
  { id: "REN-006", name: "排尿不畅", description: "排尿费力、尿线变细。", keywords: ["排尿困难", "尿不出"], severity: "medium", adviceTemplate: "联系团队评估梗阻可能。" },
  { id: "REN-007", name: "夜尿增多", description: "夜尿 >2 次伴口渴。", keywords: ["夜尿多", "频繁起夜"], severity: "low", adviceTemplate: "继续观察并记录尿量。" },
  { id: "REN-008", name: "轻度蛋白尿", description: "尿常规蛋白 ±~1+，无水肿。", keywords: ["尿里有蛋白"], severity: "low", adviceTemplate: "继续观察并复查。" },
];

const HEP: RuleDef[] = [
  { id: "HEP-001", name: "黄疸", description: "皮肤、巩膜黄染，提示胆汁淤积或肝细胞损伤。", keywords: ["黄疸", "皮肤发黄", "眼睛黄"], severity: "high", adviceTemplate: "立即就医评估肝功能与影像。" },
  { id: "HEP-002", name: "肝功能严重异常", description: "化验提示 ALT/AST >5×ULN 或胆红素显著升高。", keywords: ["转氨酶高", "肝功能异常"], severity: "high", adviceTemplate: "立即联系团队，可能需停用肝毒药物。" },
  { id: "HEP-003", name: "肝功能轻度异常", description: "ALT/AST 1-3×ULN，无症状。", keywords: ["转氨酶轻度", "肝功能稍高"], severity: "medium", adviceTemplate: "联系团队复查并评估。" },
  { id: "HEP-004", name: "右上腹胀痛", description: "持续右上腹不适。", keywords: ["右上腹", "肝区"], severity: "medium", adviceTemplate: "联系团队评估肝胆情况。" },
  { id: "HEP-005", name: "肝掌/蜘蛛痣（新发）", description: "新发肝病体征。", keywords: ["肝掌", "蜘蛛痣"], severity: "medium", adviceTemplate: "联系团队评估慢性肝损伤。" },
  { id: "HEP-006", name: "消化道异味（甜味）", description: "口腔甜味或氨味提示肝代谢异常。", keywords: ["口腔异味", "氨味"], severity: "medium", adviceTemplate: "联系团队评估肝性脑病可能。" },
];

const END: RuleDef[] = [
  { id: "END-001", name: "甲状腺功能减退", description: "免疫治疗后乏力、怕冷、体重增加。", keywords: ["怕冷", "体重增加", "甲减"], severity: "medium", adviceTemplate: "联系团队复查甲功五项。" },
  { id: "END-002", name: "甲状腺功能亢进", description: "免疫治疗后心悸、消瘦、出汗多。", keywords: ["怕热", "消瘦", "甲亢", "出汗多"], severity: "medium", adviceTemplate: "联系团队复查甲功。" },
  { id: "END-003", name: "肾上腺危象征象", description: "极度乏力、低血压、低血糖、休克前状态。", keywords: ["休克", "极度无力", "晕倒"], severity: "high", adviceTemplate: "立即拨打 120，疑似肾上腺危象。" },
  { id: "END-004", name: "新发糖尿病征象", description: "多饮多尿多食、消瘦。", keywords: ["口渴", "多尿", "三多一少"], severity: "medium", adviceTemplate: "联系团队复查血糖。" },
  { id: "END-005", name: "高血糖", description: "自测血糖 >13.9 mmol/L 持续。", keywords: ["血糖高", "13.9", "200 mg"], severity: "medium", adviceTemplate: "联系团队评估降糖方案。" },
  { id: "END-006", name: "低血糖", description: "心慌、出汗、手抖、饥饿，自测血糖 <3.9。", keywords: ["低血糖", "心慌出汗", "手抖"], severity: "high", adviceTemplate: "立即口服糖类，必要时就医。" },
  { id: "END-007", name: "下肢非凹陷性水肿", description: "甲减相关黏液性水肿。", keywords: ["下肢肿胀", "非凹陷"], severity: "medium", adviceTemplate: "联系团队评估甲功。" },
  { id: "END-008", name: "性腺功能减退症状", description: "性欲减退、潮热（围绝经样）。", keywords: ["潮热", "性欲下降"], severity: "low", adviceTemplate: "继续观察，常见于内分泌治疗。" },
];

const GEN: RuleDef[] = [
  { id: "GEN-001", name: "异常阴道出血", description: "非月经周期出血或绝经后出血。", keywords: ["阴道出血", "下面出血", "绝经后出血"], severity: "high", adviceTemplate: "立即就医妇科评估。" },
  { id: "GEN-002", name: "盆腔疼痛（重）", description: "持续重度盆腔痛。", keywords: ["盆腔疼", "下腹痛"], severity: "medium", adviceTemplate: "联系团队评估妇科原因。" },
  { id: "GEN-003", name: "热潮红/盗汗", description: "他莫昔芬等内分泌治疗常见。", keywords: ["潮热", "盗汗", "夜间出汗"], severity: "low", adviceTemplate: "继续观察并保持凉爽环境。" },
  { id: "GEN-004", name: "阴道干涩", description: "性生活疼痛、灼热感。", keywords: ["阴道干涩", "私处干"], severity: "low", adviceTemplate: "继续观察并使用润滑剂。" },
  { id: "GEN-005", name: "月经紊乱", description: "经期延长、经量改变或闭经。", keywords: ["月经不调", "经期"], severity: "medium", adviceTemplate: "联系团队评估卵巢功能。" },
  { id: "GEN-006", name: "尿失禁（新发）", description: "压力性或急迫性尿失禁。", keywords: ["漏尿", "尿失禁"], severity: "medium", adviceTemplate: "联系团队评估盆底功能。" },
  { id: "GEN-007", name: "性欲减退", description: "持续性欲下降影响生活质量。", keywords: ["性欲低", "没欲望"], severity: "low", adviceTemplate: "继续观察，可咨询心理或妇科支持。" },
  { id: "GEN-008", name: "外阴瘙痒", description: "持续外阴瘙痒不适。", keywords: ["私处痒"], severity: "low", adviceTemplate: "继续观察并保持卫生。" },
];

const PSY: RuleDef[] = [
  { id: "PSY-001", name: "自杀/自伤念头", description: "出现自杀或自伤想法。", keywords: ["不想活", "想死", "自杀", "结束"], severity: "high", adviceTemplate: "立即就医或拨打 24h 心理援助热线 400-161-9995。" },
  { id: "PSY-002", name: "重度抑郁征象", description: "持续 2 周情绪低落、兴趣丧失、睡眠食欲改变。", keywords: ["很抑郁", "什么都不想干", "活着没意思"], severity: "high", adviceTemplate: "立即联系心理科或精神科评估。" },
  { id: "PSY-003", name: "焦虑发作", description: "突发心慌、出汗、濒死感。", keywords: ["惊恐发作", "焦虑发作", "濒死感"], severity: "medium", adviceTemplate: "联系团队，可能需短期抗焦虑治疗。" },
  { id: "PSY-004", name: "持续焦虑", description: "持续紧张、担忧影响日常。", keywords: ["焦虑", "紧张"], severity: "medium", adviceTemplate: "联系团队评估心理支持。" },
  { id: "PSY-005", name: "情绪低落", description: "治疗期常见心理反应。", keywords: ["情绪低落", "心情差", "难过"], severity: "low", adviceTemplate: "继续观察，可联系心理支持或病友互助。" },
  { id: "PSY-006", name: "易怒", description: "情绪不稳定，易激惹。", keywords: ["易怒", "脾气暴"], severity: "low", adviceTemplate: "继续观察，可能与激素相关。" },
  { id: "PSY-007", name: "社交退缩", description: "明显回避社交场合。", keywords: ["不想见人", "孤僻"], severity: "low", adviceTemplate: "继续观察，鼓励温和接触亲友。" },
  { id: "PSY-008", name: "睡眠困难", description: "入睡或维持困难。", keywords: ["失眠", "睡不好"], severity: "low", adviceTemplate: "继续观察并保持作息。" },
];

const PAI: RuleDef[] = [
  { id: "PAI-001", name: "重度疼痛", description: "VAS ≥7，影响睡眠或日常活动。", keywords: ["疼得厉害", "剧痛", "受不了"], severity: "high", adviceTemplate: "立即联系团队调整镇痛方案。" },
  { id: "PAI-002", name: "新发骨痛", description: "局部骨痛进行性加重。", keywords: ["骨头疼", "腰背痛"], severity: "medium", adviceTemplate: "联系团队评估骨转移可能。" },
  { id: "PAI-003", name: "病理性骨折征象", description: "无外伤情况下突发剧痛、活动受限。", keywords: ["骨折", "动不了", "剧烈骨痛"], severity: "high", adviceTemplate: "立即就医行影像检查。" },
  { id: "PAI-004", name: "肌肉痛", description: "全身或局部肌肉酸痛。", keywords: ["肌肉酸", "肌肉痛"], severity: "low", adviceTemplate: "继续观察，可热敷。" },
  { id: "PAI-005", name: "关节痛", description: "多关节疼痛，常见于内分泌治疗。", keywords: ["关节痛", "关节酸"], severity: "medium", adviceTemplate: "联系团队评估，可能需调整方案。" },
  { id: "PAI-006", name: "腹痛（中度）", description: "持续腹痛但无急腹症体征。", keywords: ["肚子痛", "腹痛"], severity: "medium", adviceTemplate: "联系团队评估。" },
  { id: "PAI-007", name: "胸壁疼痛", description: "放疗后或术后胸壁持续疼痛。", keywords: ["胸壁痛", "刀口痛", "放疗后疼"], severity: "medium", adviceTemplate: "联系团队评估神经性疼痛。" },
  { id: "PAI-008", name: "淋巴水肿伴胀痛", description: "患侧上肢肿胀伴坠胀感。", keywords: ["手肿", "上肢肿", "淋巴水肿"], severity: "medium", adviceTemplate: "联系团队评估，避免患肢测血压抽血。" },
  { id: "PAI-009", name: "头痛（轻）", description: "偶发头痛能自行缓解。", keywords: ["偶尔头痛"], severity: "low", adviceTemplate: "继续观察并保证休息。" },
  { id: "PAI-010", name: "腰背酸痛", description: "短期腰背酸痛无放射。", keywords: ["腰酸", "后背酸"], severity: "low", adviceTemplate: "继续观察。" },
];

const CON: RuleDef[] = [
  { id: "CON-001", name: "高热", description: "体温 ≥39°C 持续。", keywords: ["高烧", "39度", "40度", "高热"], severity: "high", adviceTemplate: "立即就医，警惕感染或粒缺。" },
  { id: "CON-002", name: "中等发热", description: "体温 38.0-38.5°C。", keywords: ["发热", "38度"], severity: "medium", adviceTemplate: "24 小时内联系团队评估感染风险。" },
  { id: "CON-003", name: "持续低热", description: "37.5-38°C 持续 3 天以上。", keywords: ["低烧", "低热", "37.5"], severity: "medium", adviceTemplate: "联系团队排查感染。" },
  { id: "CON-004", name: "重度乏力", description: "卧床不起，无法完成日常活动。", keywords: ["卧床", "起不来", "极度乏力"], severity: "high", adviceTemplate: "立即联系团队评估病因。" },
  { id: "CON-005", name: "中度疲劳", description: "活动耐量下降但能自理。", keywords: ["很累", "乏力", "没力气"], severity: "medium", adviceTemplate: "联系团队评估贫血等病因。" },
  { id: "CON-006", name: "轻度疲劳", description: "癌症相关性疲劳，最常见副作用。", keywords: ["疲劳", "累", "乏力"], severity: "low", adviceTemplate: "继续观察，保持适度活动与规律作息。" },
  { id: "CON-007", name: "体重下降（>5%）", description: "1 月内非主观体重下降 >5%。", keywords: ["体重下降", "瘦了", "掉秤"], severity: "medium", adviceTemplate: "联系团队评估营养与肿瘤进展。" },
  { id: "CON-008", name: "盗汗", description: "夜间大量出汗湿透衣物。", keywords: ["盗汗", "夜间出汗"], severity: "medium", adviceTemplate: "联系团队评估，需排除感染或淋巴瘤。" },
  { id: "CON-009", name: "畏寒寒战", description: "体温升高前明显畏寒寒战。", keywords: ["寒战", "畏寒", "打寒战"], severity: "high", adviceTemplate: "立即联系团队，常提示菌血症。" },
  { id: "CON-010", name: "食欲减退（轻）", description: "短期轻度食欲下降。", keywords: ["不太想吃"], severity: "low", adviceTemplate: "继续观察并少食多餐。" },
];

const INF: RuleDef[] = [
  { id: "INF-001", name: "脓毒症征象", description: "高热伴神志改变、低血压、心率 >100。", keywords: ["高烧昏迷", "脓毒", "意识不清"], severity: "high", adviceTemplate: "立即拨打 120，疑似脓毒症。" },
  { id: "INF-002", name: "中央静脉导管感染", description: "PICC/输液港穿刺处红肿热痛伴发热。", keywords: ["输液港红", "PICC 红肿", "穿刺点感染"], severity: "high", adviceTemplate: "立即就医评估导管感染。" },
  { id: "INF-003", name: "口腔念珠菌感染", description: "口腔白斑伴疼痛。", keywords: ["口腔白斑", "鹅口疮", "口腔真菌"], severity: "medium", adviceTemplate: "联系团队评估抗真菌治疗。" },
  { id: "INF-004", name: "尿路感染", description: "尿频尿急尿痛伴发热。", keywords: ["尿路感染", "膀胱炎"], severity: "medium", adviceTemplate: "联系团队评估抗感染。" },
  { id: "INF-005", name: "皮肤感染", description: "局部红肿热痛进行性扩大。", keywords: ["伤口感染", "皮肤化脓"], severity: "medium", adviceTemplate: "联系团队评估抗生素治疗。" },
  { id: "INF-006", name: "上呼吸道感染（轻）", description: "鼻塞流涕咽痛无发热。", keywords: ["小感冒", "嗓子疼"], severity: "low", adviceTemplate: "继续观察，必要时联系团队。" },
  { id: "INF-007", name: "带状疱疹征象", description: "单侧皮肤刺痛后出现成簇水疱。", keywords: ["带状疱疹", "蛇缠腰", "成簇水疱"], severity: "high", adviceTemplate: "立即就医，免疫低下患者风险高。" },
  { id: "INF-008", name: "结膜炎", description: "眼部红、痒、分泌物。", keywords: ["眼红", "结膜炎", "眼分泌物"], severity: "low", adviceTemplate: "继续观察，必要时眼科。" },
  { id: "INF-009", name: "肛周脓肿征象", description: "肛周红肿疼痛伴发热（粒缺时高危）。", keywords: ["肛周痛", "肛周肿"], severity: "high", adviceTemplate: "立即就医，粒缺时是急症。" },
  { id: "INF-010", name: "中耳炎", description: "耳痛、流脓、听力下降。", keywords: ["耳痛", "流脓", "中耳炎"], severity: "medium", adviceTemplate: "联系团队评估抗感染。" },
];

const MET: RuleDef[] = [
  { id: "MET-001", name: "重度低钾", description: "肌无力、心悸、心电图改变。", keywords: ["四肢无力", "腿软", "低钾"], severity: "high", adviceTemplate: "立即就医补钾监测心电图。" },
  { id: "MET-002", name: "重度低钠", description: "意识改变、抽搐。", keywords: ["低钠", "意识不清"], severity: "high", adviceTemplate: "立即就医，警惕脑水肿。" },
  { id: "MET-003", name: "高钙血症", description: "口渴、多尿、便秘、意识改变（骨转移相关）。", keywords: ["口渴多尿", "意识淡漠"], severity: "high", adviceTemplate: "立即就医，可能为骨转移高钙危象。" },
  { id: "MET-004", name: "脱水征象", description: "口干、尿少、皮肤弹性差。", keywords: ["口干", "尿少", "脱水"], severity: "medium", adviceTemplate: "联系团队评估补液。" },
  { id: "MET-005", name: "低血糖发作", description: "心慌、手抖、出汗、意识模糊。", keywords: ["心慌出汗", "低血糖发作"], severity: "high", adviceTemplate: "立即口服糖类，无好转就医。" },
  { id: "MET-006", name: "代谢性酸中毒可疑", description: "深大呼吸（Kussmaul）伴乏力。", keywords: ["呼吸深大", "酸中毒"], severity: "high", adviceTemplate: "立即就医。" },
  { id: "MET-007", name: "高尿酸/痛风发作", description: "急性单关节红肿热痛。", keywords: ["脚趾痛", "痛风", "关节红肿"], severity: "medium", adviceTemplate: "联系团队评估抗痛风方案。" },
  { id: "MET-008", name: "电解质轻度异常", description: "化验提示轻度电解质偏低/高，无症状。", keywords: ["电解质"], severity: "low", adviceTemplate: "继续观察，按医嘱复查。" },
  { id: "MET-009", name: "镁缺乏", description: "西妥昔单抗等可致低镁。", keywords: ["低镁", "肌肉抽搐"], severity: "medium", adviceTemplate: "联系团队评估补镁。" },
  { id: "MET-010", name: "尿酸轻度升高", description: "无症状性高尿酸。", keywords: ["尿酸高"], severity: "low", adviceTemplate: "继续观察，多饮水。" },
];

const BCS: RuleDef[] = [
  { id: "BCS-001", name: "患侧上肢淋巴水肿（重）", description: "腋窝淋巴结清扫 / 放疗后患侧上肢明显肿胀、皮肤发硬、活动受限。", keywords: ["患侧上肢肿", "胳膊肿", "淋巴水肿", "做过腋窝清扫", "放疗后手肿"], severity: "high", adviceTemplate: "立即联系团队评估，禁止患侧测血压、抽血、注射。" },
  { id: "BCS-002", name: "患侧上肢淋巴水肿（轻中）", description: "患侧上肢轻中度肿胀或坠胀，无明显皮温升高。", keywords: ["患侧手肿", "上肢坠胀"], severity: "medium", adviceTemplate: "联系团队评估，开始抬高患肢、压力袖套等综合消肿治疗。" },
  { id: "BCS-003", name: "蒽环类剂量累积心毒性", description: "阿霉素 / 表阿霉素累积剂量后出现新发活动后气促或心悸。", keywords: ["阿霉素", "表阿霉素", "蒽环", "化疗后气短", "活动后气促"], severity: "high", adviceTemplate: "立即联系团队评估 LVEF，可能需暂停治疗。" },
  { id: "BCS-004", name: "HER2 靶向心毒性", description: "曲妥珠单抗（赫赛汀）/ 帕妥珠单抗治疗中 LVEF 下降或活动耐量下降。", keywords: ["赫赛汀", "曲妥珠", "帕妥珠", "靶向心慌", "HER2"], severity: "high", adviceTemplate: "立即联系团队复查心脏超声 LVEF。" },
  { id: "BCS-005", name: "紫杉类周围神经病变（重）", description: "紫杉醇 / 多西他赛后手足麻木刺痛严重影响生活（持物 / 系扣 / 走路）。", keywords: ["紫杉", "多西他赛", "扣纽扣困难", "拿不住筷子"], severity: "high", adviceTemplate: "立即联系团队评估剂量调整或换药。" },
  { id: "BCS-006", name: "他莫昔芬潮热盗汗（重）", description: "他莫昔芬 / 来曲唑 / 阿那曲唑后剧烈潮热盗汗严重影响睡眠。", keywords: ["他莫昔芬", "来曲唑", "阿那曲唑", "潮热严重", "盗汗湿透"], severity: "medium", adviceTemplate: "联系团队评估，可能需要药物或非药物干预。" },
  { id: "BCS-007", name: "芳香化酶抑制剂关节痛", description: "AI 类（来曲唑/阿那曲唑/依西美坦）后多关节晨僵、疼痛影响活动。", keywords: ["关节晨僵", "AI 关节痛", "全身关节痛"], severity: "medium", adviceTemplate: "联系团队评估，必要时暂停或换药。" },
  { id: "BCS-008", name: "内分泌治疗骨密度下降", description: "AI 长期使用伴骨密度下降或新发骨痛。", keywords: ["骨密度", "骨质疏松"], severity: "medium", adviceTemplate: "联系团队评估，可能需要双膦酸盐 / 地舒单抗。" },
  { id: "BCS-009", name: "可疑骨转移征象", description: "新发持续性局部骨痛伴夜间加重，需排除骨转移。", keywords: ["骨头痛", "夜间骨痛", "腰背痛持续"], severity: "high", adviceTemplate: "立即联系团队行 ECT / PET-CT 排查。" },
  { id: "BCS-010", name: "复发可疑：淋巴结肿大", description: "锁骨上、腋窝、对侧乳房新发硬质包块或淋巴结肿大。", keywords: ["锁骨上肿块", "腋窝肿块", "新发包块", "对侧乳房肿块"], severity: "high", adviceTemplate: "立即联系团队复诊评估。" },
  { id: "BCS-011", name: "术后伤口异常", description: "切口红肿、渗液、裂开或剧烈疼痛。", keywords: ["伤口渗液", "刀口红肿", "切口裂开", "术后伤口"], severity: "high", adviceTemplate: "立即联系团队，排查感染或血肿。" },
  { id: "BCS-012", name: "假体 / 重建相关问题", description: "假体侧不对称、变形、疼痛或皮肤变薄。", keywords: ["假体", "重建", "假体不对称", "假体疼"], severity: "medium", adviceTemplate: "联系团队评估假体状况。" },
  { id: "BCS-013", name: "化疗诱导卵巢功能抑制症状", description: "化疗后闭经、潮热、阴道干涩。", keywords: ["化疗后闭经", "卵巢功能"], severity: "low", adviceTemplate: "继续观察并记录，常见且多为可逆。" },
  { id: "BCS-014", name: "CDK4/6 抑制剂相关粒缺", description: "哌柏西利 / 阿贝西利 / 瑞博西利后 ANC 下降。", keywords: ["哌柏西利", "阿贝西利", "瑞博西利", "CDK"], severity: "high", adviceTemplate: "立即联系团队复查血常规，可能需暂停一周。" },
  { id: "BCS-015", name: "PARP 抑制剂相关贫血 / 乏力", description: "奥拉帕利 / 他拉唑帕利后明显乏力、面色苍白。", keywords: ["奥拉帕利", "他拉唑帕利", "PARP"], severity: "medium", adviceTemplate: "联系团队复查血常规与肝肾功能。" },
];

export const RULES_V2: RuleDef[] = [
  ...BCS,
  ...HEM,
  ...CAR,
  ...RES,
  ...GAS,
  ...NEU,
  ...DER,
  ...REN,
  ...HEP,
  ...END,
  ...GEN,
  ...PSY,
  ...PAI,
  ...CON,
  ...INF,
  ...MET,
];
