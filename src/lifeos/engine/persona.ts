import type { OSStats, Persona, UserProfile } from "../types";
import { TRAIT_LABELS } from "../types";
import { clamp, createRng, hashString } from "./random";

type TraitScore = Record<(typeof TRAIT_LABELS)[number], number>;

const BASE_TRAITS: TraitScore = {
  创造力: 50,
  执行力: 50,
  学习力: 50,
  社交力: 50,
  抗压性: 50,
  自律: 50,
};

// ─── 关键词规则库 ───
const OCCUPATION_RULES: Array<[RegExp, Partial<TraitScore>]> = [
  [/学生|大学|研究生|在读/, { 学习力: 8, 社交力: 3, 自律: -3 }],
  [/工程|开发|程序|程序員|程序员|软件/, { 执行力: 8, 学习力: 6, 创造力: 2 }],
  [/设计|创意|美术|视觉/, { 创造力: 10, 执行力: -2 }],
  [/产品|运营|市场/, { 社交力: 8, 执行力: 4 }],
  [/教师|老师|教育/, { 社交力: 6, 自律: 4 }],
  [/医|护|健康/, { 抗压性: 8, 自律: 6 }],
  [/金融|会计|投资|数据|分析/, { 自律: 6, 学习力: 4, 创造力: -2 }],
];

const INTEREST_RULES: Array<[RegExp, Partial<TraitScore>]> = [
  [/编程|代码|AI|技术|开发|科技/, { 学习力: 6, 执行力: 3 }],
  [/设计|绘画|写作|音乐|摄影|视频|创作/, { 创造力: 7 }],
  [/运动|健身|跑步|篮球|游泳/, { 抗压性: 6, 自律: 4 }],
  [/阅读|读书|心理学|哲学|历史/, { 学习力: 5, 抗压性: 2 }],
  [/旅行|摄影|美食/, { 创造力: 3, 社交力: 3 }],
  [/创业|商业|投资/, { 社交力: 4, 抗压性: 4 }],
];

const PERSONALITY_RULES: Array<[RegExp, Partial<TraitScore>]> = [
  [/好奇|探索|爱尝试|喜欢新/, { 学习力: 7, 创造力: 5 }],
  [/焦虑|容易紧张|压力大|内耗/, { 抗压性: -9 }],
  [/拖延|不够自律|难以坚持|三分钟/, { 自律: -8, 执行力: -5 }],
  [/自律|坚持|习惯|规律/, { 自律: 8, 执行力: 4 }],
  [/外向|开朗|健谈|爱交朋友/, { 社交力: 8 }],
  [/内向|安静|独处|慢热/, { 社交力: -6, 创造力: 3 }],
  [/完美主义|细节|挑剔/, { 执行力: -3, 自律: 4 }],
  [/果断|行动派|执行力强|说做就做/, { 执行力: 8 }],
];

const MBTI_RULES: Record<string, Partial<TraitScore>> = {
  N: { 创造力: 6 },
  S: { 执行力: 3, 自律: 2 },
  T: { 抗压性: 4 },
  F: { 社交力: 4 },
  J: { 自律: 7, 执行力: 4 },
  P: { 创造力: 4, 自律: -4 },
  E: { 社交力: 7 },
  I: { 社交力: -5, 创造力: 2 },
};

const TRAIT_TO_STRENGTH: Record<string, string[]> = {
  创造力: ["创造力强，善于提出独特想法", "能从不同角度看待问题", "审美与直觉敏锐"],
  执行力: ["想到就做，落地能力强", "推进项目不易半途而废", "善于把想法拆解为行动"],
  学习力: ["学习能力强，上手新领域快", "知识面广，善于融会贯通", "对未知领域保持好奇"],
  社交力: ["善于建立人际连接", "沟通表达自然", "能快速融入新环境"],
  抗压性: ["压力下保持稳定输出", "情绪恢复能力强", "能承受不确定性"],
  自律: ["习惯驱动，长期主义", "自我管理能力强", "说到做到，值得信赖"],
};

const TRAIT_TO_RISK: Record<string, string> = {
  创造力: "想法过多导致聚焦困难",
  执行力: "计划多于行动，启动偏慢",
  学习力: "兴趣发散，深度不足",
  社交力: "独来独往，缺少外部反馈",
  抗压性: "容易焦虑，被不确定性消耗",
  自律: "依赖状态驱动，持续性不足",
};

const TRAIT_TO_VALUE: Record<string, string> = {
  创造力: "创造与表达",
  执行力: "行动与成果",
  学习力: "成长与探索",
  社交力: "连接与影响",
  抗压性: "自由与韧性",
  自律: "秩序与掌控",
};

const PREFIX = ["探索型", "创造型", "分析型", "连接型", "坚韧型"];
const SUFFIX = ["创造者", "思考者", "行动派", "建造者", "长期主义者"];

function applyRules(
  traits: TraitScore,
  rules: Array<[RegExp, Partial<TraitScore>]>,
  text: string,
): void {
  for (const [re, delta] of rules) {
    if (re.test(text)) {
      for (const [k, v] of Object.entries(delta)) {
        traits[k as keyof TraitScore] += v as number;
      }
    }
  }
}

export interface PersonaUsage {
  stats: OSStats;
  memoryCount: number;
}

/** 从档案 + 使用数据推导人格模型（确定性：同一输入同一结果，随使用逐步完善） */
export function derivePersona(
  profile: UserProfile,
  usage: PersonaUsage,
): Persona {
  const rng = createRng(hashString(profile.name + profile.mbti + profile.occupation));
  const traits: TraitScore = { ...BASE_TRAITS };

  applyRules(traits, OCCUPATION_RULES, profile.occupation);
  applyRules(traits, INTEREST_RULES, profile.interests.join(" "));
  applyRules(traits, PERSONALITY_RULES, profile.personality);
  for (const ch of profile.mbti.toUpperCase()) {
    const delta = MBTI_RULES[ch];
    if (delta) {
      for (const [k, v] of Object.entries(delta)) {
        traits[k as keyof TraitScore] += v as number;
      }
    }
  }
  // 经历与目标提供小幅扰动（体现「持续更新」）
  applyRules(traits, INTEREST_RULES, profile.goals);
  traits.执行力 += clamp(Math.floor(usage.stats.tasksCompleted / 4), 0, 10);
  traits.抗压性 += clamp(usage.stats.decisionsCount * 2, 0, 8);

  const scored = TRAIT_LABELS.map((label) => ({
    label,
    score: clamp(traits[label] + rng.range(-3, 3), 15, 96),
  }));

  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const second = sorted[1];
  const weakest = sorted[sorted.length - 1];

  const archetype = `${PREFIX[TRAIT_LABELS.indexOf(top.label) % PREFIX.length]}${
    rng.pick(SUFFIX)
  }`;

  const strengths = [
    ...(TRAIT_TO_STRENGTH[top.label] ?? []).slice(0, 2),
    (TRAIT_TO_STRENGTH[second.label] ?? [])[0] ?? "综合能力均衡",
  ];

  const risks: string[] = [TRAIT_TO_RISK[weakest.label]];
  if (profile.interests.length >= 4) risks.push("目标过多，精力容易分散");
  if (traits.抗压性 < 45) risks.push("容易焦虑，需要建立情绪出口");
  if (traits.执行力 < 45) risks.push("执行不足，想法难以落地");
  risks.push(
    rng.pick([
      "对短期反馈依赖较强，需要可视化长期进展",
      "容易同时开启多条线，建议单线程冲刺",
    ]),
  );

  const thinkingStyle = `偏向「${
    top.label
  }」驱动的思考方式：${
    top.label === "创造力"
      ? "先发散再收敛，从灵感出发构建方案"
      : top.label === "执行力"
        ? "先拆解再执行，用行动验证方向"
        : top.label === "学习力"
          ? "先研究再判断，用信息密度降低不确定性"
          : top.label === "社交力"
            ? "先交流再决策，在对话中打磨想法"
            : top.label === "抗压性"
              ? "先接受再优化，在波动中保持节奏"
              : "先规划再推进，用系统代替意志力"
  }。`;

  const habits = [
    traits.自律 >= 55 ? "习惯打卡，节奏稳定" : "状态起伏，需要外部结构",
    traits.学习力 >= 55 ? "持续输入，笔记与收藏丰富" : "按需学习，即用即查",
    traits.社交力 >= 55 ? "喜欢与人讨论碰撞想法" : "倾向独立思考后再分享",
  ];

  const values = [
    TRAIT_TO_VALUE[top.label],
    TRAIT_TO_VALUE[second.label],
    rng.pick(["真诚的关系", "长期复利", "内心秩序", "影响他人", "作品传世"]),
  ];

  // 模型完善度：档案完整度 + 使用深度
  const profileFields = [
    profile.name,
    profile.occupation,
    profile.interests.join(""),
    profile.personality,
    profile.mbti,
    profile.experiences,
    profile.goals,
    profile.dream,
  ];
  const filled = profileFields.filter((f) => f.trim().length > 0).length;
  const usageDepth =
    usage.stats.decisionsCount * 3 +
    usage.stats.tasksCompleted * 1.5 +
    usage.stats.chatsCount * 2 +
    usage.stats.simulationsCount * 3 +
    usage.stats.moodsCount * 1 +
    usage.memoryCount * 0.5;
  const completion = clamp(
    Math.round(30 + (filled / profileFields.length) * 35 + Math.min(usageDepth, 35)),
    30,
    98,
  );

  return {
    archetype,
    tagline: `${profile.mbti.toUpperCase()} · ${profile.occupation} · ${top.label}主导`,
    traits: scored,
    strengths,
    risks: [...new Set(risks)].slice(0, 4),
    thinkingStyle,
    habits,
    values,
    completion,
    updatedAt: Date.now(),
  };
}
