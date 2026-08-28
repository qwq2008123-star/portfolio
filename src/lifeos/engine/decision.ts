import type {
  DecisionCategory,
  DecisionReport,
  OSStats,
  Persona,
  UserProfile,
} from "../types";
import { clamp, createRng, hashString } from "./random";
import { detectDomain } from "./simulator";

// ─── AI 人生决策助手：人格档案 + 历史行为 + 未来模拟 → 决策报告 ───

function categoryOf(question: string): DecisionCategory {
  const domain = detectDomain(question);
  if (domain === "考研" || domain === "就业") return domain === "考研" ? "考研" : "换工作";
  if (domain === "创业") return "创业";
  if (domain === "换城市") return "换城市";
  if (domain === "技能") return "学习技能";
  if (/坚持|继续|放弃|停下/.test(question)) return "坚持项目";
  return "通用";
}

const CATEGORY_BASE: Record<DecisionCategory, number> = {
  考研: 58,
  创业: 48,
  换工作: 62,
  换城市: 55,
  学习技能: 74,
  坚持项目: 60,
  通用: 60,
};

const CATEGORY_ACTIONS: Record<DecisionCategory, string[]> = {
  考研: ["锁定目标院校与专业，完成信息收集表", "制定 90 天复习计划，每天 3h 基础科目", "联系 2 位目标专业学长做现实校验"],
  创业: ["完成 10 次目标用户访谈，验证核心痛点", "用最小成本做出可演示的 MVP", "找 1 位互补型潜在合伙人深聊 3 次"],
  换工作: ["更新简历与作品集，明确目标公司清单", "每周完成 2 场面试练习或真实面试", "盘点现金流，确保 6 个月安全垫"],
  换城市: ["列出候选城市的成本/机会对比矩阵", "去目标城市实地生活 7 天", "建立目标城市的前 10 个关键人脉"],
  学习技能: ["选定 1 门主线课程，禁止同时开 2 门", "每天固定 45 分钟刻意练习", "30 天内产出 1 个可展示的小作品"],
  坚持项目: ["写下「为什么开始」的第一性理由", "砍掉 50% 范围，聚焦核心体验", "设定 2 周一个的可验证里程碑"],
  通用: ["把问题写下来，拆成 3 个可验证的子问题", "为每个选项设定 30 天检查点", "找 1 位有相关经历的人深谈"],
};

const CATEGORY_ALTS: Record<DecisionCategory, string[]> = {
  考研: ["先工作 2 年再申请（在职硕士/海外）", "用证书 + 项目组合替代学历信号"],
  创业: ["以早期员工身份加入创业公司学习", "副业形式低成本验证 6 个月"],
  换工作: ["内部转岗试探新方向", "接 1 个外部顾问项目验证市场"],
  换城市: ["远程工作先行，逐步迁移生活重心", "每季度在目标城市住 2 周再决定"],
  学习技能: ["用在岗项目实战代替系统课程", "加入社群以教代学"],
  坚持项目: ["缩小范围做减法而非放弃", "冻结 30 天后再评估"],
  通用: ["设 30 天倒计时强制决策", "小规模试点后再全面投入"],
};

export function buildDecisionReport(
  question: string,
  profile: UserProfile,
  persona: Persona,
  stats: OSStats,
): DecisionReport {
  const rng = createRng(hashString(question + persona.archetype + String(stats.tasksCompleted)));
  const category = categoryOf(question);
  const traitMap = new Map(persona.traits.map((t) => [t.label, t.score]));

  // 匹配度 = 类别基准 + 人格加成 + 行为一致性（完成任务数佐证执行力） + 微扰
  const exec = (traitMap.get("执行力") ?? 50) - 50;
  const learn = (traitMap.get("学习力") ?? 50) - 50;
  const stress = (traitMap.get("抗压性") ?? 50) - 50;
  const consistency = clamp(stats.tasksCompleted * 1.2, -5, 12);
  const matchScore = clamp(
    Math.round(
      CATEGORY_BASE[category] +
        exec * 0.18 +
        learn * 0.1 +
        stress * 0.08 +
        consistency +
        rng.range(-4, 5),
    ),
    20,
    96,
  );

  const goalHit = profile.goals && question.includes(profile.goals.slice(0, 2));
  const analysis = `结合你的${persona.archetype}人格模型（${persona.tagline}）与${
    stats.tasksCompleted > 0 ? `${stats.tasksCompleted} 次任务执行记录` : "当前尚少的行为数据"
  }，「${question}」本质上是在问：${
    category === "考研"
      ? "你愿意为更高的起点支付 1-3 年的时间成本吗？"
      : category === "创业"
        ? "你的执行力与抗压性能否承载长期不确定性？"
        : category === "换工作"
          ? "现平台的天花板是否已经低于你的成长速度？"
          : category === "换城市"
            ? "环境红利与既有积累，哪个对你更重要？"
              : category === "学习技能"
                ? `这项技能与你${goalHit ? "的长期目标" : "的主线"}是否形成复利？`
              : category === "坚持项目"
                ? "它值得你继续投入，还是沉没成本在绑架你？"
                : "哪个选项更符合你的价值观排序？"
  }。你的优势项「${
    [...traitMap.entries()].sort((a, b) => b[1] - a[1])[0][0]
  }」在此决策中权重较高，而「${
    [...traitMap.entries()].sort((a, b) => a[1] - b[1])[0][0]
  }」是需要提前布防的短板。`;

  return {
    id: `dc-${Date.now()}-${Math.floor(rng.next() * 1e6)}`,
    question,
    category,
    analysis,
    strengths: persona.strengths.slice(0, 2),
    risks: persona.risks.slice(0, 2),
    matchScore,
    recommendation:
      matchScore >= 70
        ? `建议推进。你的行为数据（任务完成 ${stats.tasksCompleted} 次）与人格特质支持这个方向，关键是把大目标切成 90 天可验证的里程碑。`
        : matchScore >= 50
          ? "建议有条件推进：先设计一个 30 天的小成本验证，用真实反馈代替反复内耗。"
          : "建议暂缓：当前人格-资源-时机匹配度不足，先补齐短板或降低赌注再入场。",
    alternatives: CATEGORY_ALTS[category],
    actions: CATEGORY_ACTIONS[category],
    createdAt: Date.now(),
  };
}
