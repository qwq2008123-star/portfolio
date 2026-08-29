import type { MatchCandidate, Persona, UserProfile } from "../types";
import { createRng, hashString } from "./random";

// ─── AI 人格生态网络：基于人格/目标/兴趣/经历/阶段的多维匹配 ───

const FIRST = ["林", "苏", "陈", "周", "许", "韩", "沈", "顾", "叶", "江"];
const SECOND = ["亦航", "知远", "沐橙", "砚秋", "望舒", "之然", "清越", "既白", "南乔", "时安"];
const ROLES = [
  "AI 方向研究生",
  "独立开发者",
  "产品经理",
  "设计主理人",
  "大四学生",
  "创业公司 CTO",
  "内容创作者",
  "数据分析师",
  "海外留学生",
  "连续创业者",
];
const ARCHETYPES = ["探索型创造者", "分析型思考者", "连接型行动派", "坚韧型长期主义者", "创造型建造者"];
const TYPES: MatchCandidate["type"][] = ["学习伙伴", "创业伙伴", "行业导师", "兴趣朋友"];
const MBTIS = ["INTP", "ENTJ", "ENFP", "ISTJ", "ENTP", "INFJ", "ESTP", "ISFP", "INTJ", "ESFJ"];

const REASON_TEMPLATES = {
  persona: (a: string) => `人格互补：你的「${a}」与对方的执行型特质形成推拉平衡`,
  goal: (g: string) => `目标同向：你们都在朝「${g.slice(0, 12)}」方向前进`,
  interest: (i: string) => `兴趣重叠：同样热爱「${i}」`,
  stage: () => `阶段相邻：对方比你早 1-2 年走过你现在所处的阶段`,
  gap: () => `能力互补：对方的长板恰好是你的待发展项`,
};

export function generateMatches(
  profile: UserProfile,
  persona: Persona,
): MatchCandidate[] {
  const rng = createRng(hashString(profile.name + profile.mbti + persona.archetype));
  const count = 8;
  const candidates: MatchCandidate[] = [];

  for (let i = 0; i < count; i++) {
    const name = `${rng.pick(FIRST)}${rng.pick(SECOND)}`;
    const role = rng.pick(ROLES);
    const type = rng.pick(TYPES);
    const reasons = rng.shuffle(Object.keys(REASON_TEMPLATES)).slice(0, 3).map((key) => {
      switch (key) {
        case "persona":
          return REASON_TEMPLATES.persona(persona.archetype);
        case "goal":
          return REASON_TEMPLATES.goal(profile.goals || profile.dream || "自我成长");
        case "interest": {
          const interest =
            profile.interests.length > 0
              ? rng.pick(profile.interests)
              : "长期主义";
          return REASON_TEMPLATES.interest(interest);
        }
        case "stage":
          return REASON_TEMPLATES.stage();
        default:
          return REASON_TEMPLATES.gap();
      }
    });

    const matchScore = Math.min(97, 62 + rng.range(0, 30) + (type === "学习伙伴" ? 3 : 0));

    candidates.push({
      id: `cand-${i}-${hashString(name)}`,
      name,
      role,
      archetype: rng.pick(ARCHETYPES),
      mbti: rng.pick(MBTIS),
      type,
      matchScore,
      reasons,
      connected: false,
    });
  }

  return candidates.sort((a, b) => b.matchScore - a.matchScore);
}

// ─── 社区固定成员：9 位手绘头像角色（每人定制可提供的服务与帮助人数） ───
export const FIXED_MEMBERS: MatchCandidate[] = [
  {
    id: "fixed-ata",
    name: "阿苔",
    role: "独立音乐人",
    archetype: "敏锐的感受者",
    mbti: "INFP",
    type: "兴趣朋友",
    matchScore: 71,
    helpedCount: 64,
    avatarVariant: "beanie",
    reasons: ["兴趣重叠：你们都在用作品表达自己", "阶段相邻：TA 也经历过创作枯竭期"],
    connected: false,
    customServices: [
      { name: "歌曲创作入门", price: 16, helps: ["从情绪到旋律", "写第一段主歌", "克服完美主义"] },
      { name: "音乐制作起步", price: 20, helps: ["Logic/库乐队上手", "混音基础", "发布到流媒体"] },
      { name: "开放麦勇气辅导", price: 10, helps: ["第一次登台准备", "冷场怎么办", "找到你的听众"] },
    ],
  },
  {
    id: "fixed-chengyi",
    name: "程亦",
    role: "全栈工程师",
    archetype: "冷静的建造者",
    mbti: "ISTP",
    type: "学习伙伴",
    matchScore: 86,
    helpedCount: 156,
    avatarVariant: "topknot",
    reasons: ["能力互补：TA 的工程长板正好是你的待发展项", "目标同向：都在做自己的产品"],
    connected: false,
    customServices: [
      { name: "React / Node 实战", price: 24, helps: ["项目结构设计", "踩坑排查", "性能优化思路"] },
      { name: "副业接单指南", price: 20, helps: ["报价策略", "客户沟通模板", "交付流程"] },
      { name: "代码 Review", price: 15, helps: ["可维护性建议", "重构思路", "面试代码准备"] },
    ],
  },
  {
    id: "fixed-naya",
    name: "奈雅",
    role: "留学申请导师",
    archetype: "温暖的开路者",
    mbti: "ENFJ",
    type: "行业导师",
    matchScore: 83,
    helpedCount: 203,
    avatarVariant: "braids",
    reasons: ["阶段相邻：TA 走过你现在纠结的留学路径", "人格互补：TA 的行动力推动你的想法落地"],
    connected: false,
    customServices: [
      { name: "留学申请规划", price: 30, helps: ["选校定位", "文书故事线", "时间线管理"] },
      { name: "跨文化适应", price: 18, helps: ["第一年生存指南", "建立本地社交圈", "应对文化落差"] },
      { name: "英语面试辅导", price: 22, helps: ["高频问题演练", "表达自然度", "心态建设"] },
    ],
  },
  {
    id: "fixed-akai",
    name: "阿凯",
    role: "品牌设计师",
    archetype: "锐利的表达者",
    mbti: "ESTP",
    type: "创业伙伴",
    matchScore: 78,
    helpedCount: 98,
    avatarVariant: "spiky",
    reasons: ["能力互补：视觉表达 × 你的产品思维", "兴趣重叠：都欣赏大胆的美学"],
    connected: false,
    customServices: [
      { name: "作品集指导", price: 28, helps: ["项目筛选与排序", "案例叙事", "版式细节"] },
      { name: "海报与视觉设计", price: 18, helps: ["信息层级", "配色系统", "快速出稿方法"] },
      { name: "品牌视觉基础", price: 20, helps: ["Logo 思路", "VI 最小集", "设计验收标准"] },
    ],
  },
  {
    id: "fixed-youyou",
    name: "柚柚",
    role: "直播主播",
    archetype: "高能量的连接者",
    mbti: "ESFP",
    type: "兴趣朋友",
    matchScore: 66,
    helpedCount: 77,
    avatarVariant: "split",
    reasons: ["兴趣重叠：你们都愿意尝试新事物", "人格互补：TA 的即时能量平衡你的深度思考"],
    connected: false,
    customServices: [
      { name: "直播入门", price: 12, helps: ["设备与场景", "冷启动流量", "开播心态"] },
      { name: "镜头表现力", price: 15, helps: ["眼神与语速", "即兴表达", "回看复盘法"] },
      { name: "社媒运营", price: 14, helps: ["内容定位", "发布节奏", "评论区经营"] },
    ],
  },
  {
    id: "fixed-zhiwei",
    name: "沈知微",
    role: "心理咨询师",
    archetype: "安静的陪伴者",
    mbti: "ISFJ",
    type: "行业导师",
    matchScore: 81,
    helpedCount: 289,
    avatarVariant: "scarf",
    reasons: ["目标同向：你们都相信「先理解，再改变」", "能力互补：TA 的倾听框架补足你的表达"],
    connected: false,
    customServices: [
      { name: "情绪梳理", price: 26, helps: ["给情绪命名", "找到触发点", "建立缓冲习惯"] },
      { name: "倾听练习", price: 22, helps: ["不评判回应", "提问的力度", "沉默的力量"] },
      { name: "关系沟通", price: 25, helps: ["非暴力表达", "设立边界", "修复对话"] },
    ],
  },
  {
    id: "fixed-laomo",
    name: "老莫",
    role: "连续创业者 · 人生导师",
    archetype: "走过路的引路人",
    mbti: "INFJ",
    type: "行业导师",
    matchScore: 91,
    helpedCount: 412,
    avatarVariant: "dreadlocks",
    reasons: ["阶段相邻：TA 比你早 15 年走过创业这条路", "目标同向：TA 现在做的事就是帮年轻人少走弯路"],
    connected: false,
    customServices: [
      { name: "创业复盘", price: 30, helps: ["失败案例拆解", "决策时点回看", "什么是运气什么是实力"] },
      { name: "长期决策", price: 28, helps: ["10 年视角推演", "机会成本排序", "价值观筛选法"] },
      { name: "人生规划", price: 30, helps: ["把大问题拆小", "阶段性目标设定", "和家庭沟通策略"] },
    ],
  },
  {
    id: "fixed-alie",
    name: "阿烈",
    role: "独立乐队主唱",
    archetype: "不服管的表达者",
    mbti: "ISTP",
    type: "兴趣朋友",
    matchScore: 58,
    helpedCount: 52,
    avatarVariant: "mohawk",
    reasons: ["兴趣重叠：你们都在做非主流的事", "弱关系：可能出现意外的化学反应"],
    connected: false,
    customServices: [
      { name: "演出策划", price: 18, helps: ["第一场 Live 怎么办", "场地与设备", "票务定价"] },
      { name: "词曲创作", price: 20, helps: ["从 riff 到完整歌", "歌词意象", "编曲取舍"] },
      { name: "舞台表现力", price: 12, helps: ["克服怯场", "与观众互动", "台风打磨"] },
    ],
  },
  {
    id: "fixed-linlang",
    name: "林朗",
    role: "社群运营顾问",
    archetype: "热心的组织者",
    mbti: "ENFP",
    type: "创业伙伴",
    matchScore: 88,
    helpedCount: 134,
    avatarVariant: "curly",
    reasons: ["人格互补：TA 的组织力 × 你的创造力", "目标同向：都在尝试从 0 到 1 建立社区"],
    connected: false,
    customServices: [
      { name: "活动策划", price: 22, helps: ["主题与流程设计", "冷场预防", "复盘方法"] },
      { name: "社群冷启动", price: 26, helps: ["前 100 个种子用户", "群规则与文化", "活跃度维护"] },
      { name: "主持人训练", price: 15, helps: ["开场与串场", "提问技巧", "意外处理"] },
    ],
  },
];

// ─── 弱关系成员 + 完整名册（星系与内心圆桌共用，保证成员 id 跨页一致） ───
export function weakTies(profile: UserProfile): MatchCandidate[] {
  const rng = createRng(hashString(profile.name + "weakties"));
  const WEAK_ROLES = ["独立音乐人", "山系户外玩家", "播客主播", "飞盘俱乐部主理人"];
  return [0, 1].map((i) => {
    const name = `${rng.pick(["洛", "祁"])}${rng.pick(["之野", "一帆", "知夏", "沐风"])}`;
    return {
      id: `weak-${i}-${hashString(name)}`,
      name,
      role: rng.pick(WEAK_ROLES),
      archetype: "潜在发现",
      mbti: rng.pick(["ESFP", "ISTP", "ENFJ", "INFP"]),
      type: "兴趣朋友" as const,
      matchScore: Math.round(rng.range(38, 52)),
      reasons: ["弱关系：出现于你的扩展人脉圈，可能有潜在交集"],
      connected: false,
    };
  });
}

export function buildRoster(profile: UserProfile, persona: Persona): MatchCandidate[] {
  return [...generateMatches(profile, persona), ...weakTies(profile)];
}
