import type { RiskLevel } from "../types";

export const RULE_VERSION = "v1";

export type RuleDef = {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  severity: RiskLevel;
  adviceTemplate: string;
};

export const RULES_V1: RuleDef[] = [
  // ========== HIGH ==========
  {
    id: "H001",
    name: "呼吸困难",
    description: "化疗或靶向治疗后出现急性呼吸系统症状，可能提示肺栓塞、严重感染或心衰，需立即就医。",
    keywords: ["呼吸困难", "胸闷", "气短", "喘不上气", "呼吸急促"],
    severity: "high",
    adviceTemplate: "立即线下就医，必要时拨打 120。",
  },
  {
    id: "H002",
    name: "发热（疑似中性粒细胞减少）",
    description: "化疗后 7-14 天内出现发热（≥38.5°C），可能为中性粒细胞减少性发热，是肿瘤急症。",
    keywords: ["发热", "高烧", "高热", "体温升高", "38.5", "39度"],
    severity: "high",
    adviceTemplate: "24 小时内联系医疗团队，避免自行使用退烧药。",
  },
  {
    id: "H003",
    name: "严重出血",
    description: "化疗导致血小板减少时出现自发性出血，可能危及生命。",
    keywords: ["出血不止", "便血", "血便", "尿血", "牙龈大量出血", "鼻血不止"],
    severity: "high",
    adviceTemplate: "立即线下就医，避免按压、热敷或剧烈活动。",
  },
  {
    id: "H004",
    name: "急性神经症状",
    description: "突发剧烈头痛、视物模糊、意识改变可能提示颅内事件或代谢异常。",
    keywords: ["剧烈头痛", "视物模糊", "意识模糊", "晕厥", "抽搐"],
    severity: "high",
    adviceTemplate: "立即拨打 120 或前往最近的急诊。",
  },
  {
    id: "H005",
    name: "胸痛",
    description: "持续性胸痛需排除心血管事件（蒽环类药物心毒性、肺栓塞）。",
    keywords: ["胸痛", "心绞痛", "心前区痛"],
    severity: "high",
    adviceTemplate: "立即线下就医，行心电图与心肌酶检查。",
  },

  // ========== MEDIUM ==========
  {
    id: "M001",
    name: "持续呕吐 / 不能进食",
    description: "化疗后 48 小时仍剧烈呕吐，存在脱水与电解质紊乱风险。",
    keywords: ["持续呕吐", "吐不停", "不能进食", "水都喝不下"],
    severity: "medium",
    adviceTemplate: "24-48 小时内联系医疗团队，必要时静脉补液。",
  },
  {
    id: "M002",
    name: "严重腹泻",
    description: "每日 4 次以上稀便，持续 2 天以上，提示药物相关性肠炎风险。",
    keywords: ["腹泻", "拉肚子", "稀便", "大便次数多"],
    severity: "medium",
    adviceTemplate: "联系医疗团队评估止泻方案与电解质监测。",
  },
  {
    id: "M003",
    name: "周围神经病变",
    description: "紫杉类等药物可致手足麻木、刺痛，持续加重可影响后续治疗。",
    keywords: ["手足麻木", "手脚麻", "神经痛", "刺痛", "针刺感"],
    severity: "medium",
    adviceTemplate: "联系医疗团队评估剂量调整方案，避免极端温度。",
  },
  {
    id: "M004",
    name: "口腔溃疡 / 黏膜炎",
    description: "广泛口腔黏膜溃疡影响进食，需排除感染并对症处理。",
    keywords: ["口腔溃疡", "嘴里长疮", "黏膜溃烂", "口痛"],
    severity: "medium",
    adviceTemplate: "联系医疗团队，使用医生建议的漱口水方案，进流食。",
  },
  {
    id: "M005",
    name: "持续低热",
    description: "37.5-38.5°C 之间持续低热不伴明显诱因，需排除感染。",
    keywords: ["低烧", "低热", "37.5", "38度"],
    severity: "medium",
    adviceTemplate: "密切监测体温，24 小时内联系医疗团队评估。",
  },

  // ========== LOW ==========
  {
    id: "L001",
    name: "脱发",
    description: "化疗常见副作用，多为可逆，治疗结束后头发会重新生长。",
    keywords: ["脱发", "掉头发", "头发掉"],
    severity: "low",
    adviceTemplate: "继续观察并记录，可使用棉质头巾或假发改善舒适度。",
  },
  {
    id: "L002",
    name: "轻度疲劳",
    description: "癌症相关性疲劳是最常见副作用，与治疗与心理因素相关。",
    keywords: ["疲劳", "乏力", "没力气", "累"],
    severity: "low",
    adviceTemplate: "继续观察，保持适度活动与规律作息，记录疲劳程度变化。",
  },
  {
    id: "L003",
    name: "轻度恶心",
    description: "未影响进食的轻度恶心，可通过饮食调整缓解。",
    keywords: ["恶心", "想吐", "胃不舒服"],
    severity: "low",
    adviceTemplate: "继续观察并记录发生频率，少食多餐，避免油腻。",
  },
  {
    id: "L004",
    name: "皮疹（轻微）",
    description: "轻度皮疹未伴瘙痒、水泡或全身症状，多数可自行缓解。",
    keywords: ["皮疹", "起疹子", "皮肤红"],
    severity: "low",
    adviceTemplate: "继续观察并记录皮疹范围与程度，避免抓挠。",
  },
  {
    id: "L005",
    name: "情绪低落",
    description: "治疗期常见心理反应，需关注是否发展为临床抑郁。",
    keywords: ["情绪低落", "心情差", "难过", "焦虑"],
    severity: "low",
    adviceTemplate: "继续观察并记录，可联系心理支持或病友互助资源。",
  },
];
