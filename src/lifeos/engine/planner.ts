import type { Cadence, LifePlan, PlanTask, OSStats, UserProfile } from "../types";
import { createRng, hashString } from "./random";

// ─── AI 生活管理：根据人生目标自动生成行动计划，并根据执行情况自动调整 ───

interface TaskSeed {
  cadence: Cadence;
  title: string;
}

const BANKS: Array<[RegExp, TaskSeed[]]> = [
  [
    /AI|人工智能|机器学习|算法|大模型|工程师/,
    [
      { cadence: "daily", title: "学习 AI 知识 30 分钟（课程/论文）" },
      { cadence: "daily", title: "完成 1 道代码练习" },
      { cadence: "daily", title: "精读 1 篇技术文章并做笔记" },
      { cadence: "weekly", title: "完成一个可运行的小项目并提交到 GitHub" },
      { cadence: "monthly", title: "复盘知识体系，输出 1 篇学习总结" },
    ],
  ],
  [
    /考研|读研|申研|升学/,
    [
      { cadence: "daily", title: "英语单词 100 个 + 精读 1 篇" },
      { cadence: "daily", title: "数学/专业课刷题 90 分钟" },
      { cadence: "daily", title: "错题整理 20 分钟" },
      { cadence: "weekly", title: "完成 1 套真题并分析薄弱点" },
      { cadence: "monthly", title: "对照大纲复盘进度，调整下月重心" },
    ],
  ],
  [
    /写作|博客|自媒体|内容|公众号|小说/,
    [
      { cadence: "daily", title: "积累 3 条素材/灵感" },
      { cadence: "daily", title: "自由写作 25 分钟" },
      { cadence: "weekly", title: "发布 1 篇完整作品" },
      { cadence: "monthly", title: "分析数据，复盘选题方向" },
    ],
  ],
  [
    /创业|产品|商业|MVP|副业/i,
    [
      { cadence: "daily", title: "与 1 位目标用户对话" },
      { cadence: "daily", title: "推进 MVP 一个最小功能" },
      { cadence: "daily", title: "记录 1 条商业观察" },
      { cadence: "weekly", title: "发布一次更新并收集反馈" },
      { cadence: "monthly", title: "复盘北极星指标，决定继续/转向" },
    ],
  ],
  [
    /健身|减肥|运动|健康|跑步/,
    [
      { cadence: "daily", title: "运动 30 分钟（力量/有氧交替）" },
      { cadence: "daily", title: "记录饮食与睡眠" },
      { cadence: "weekly", title: "完成 1 次强度测试" },
      { cadence: "monthly", title: "对比体测数据，调整计划" },
    ],
  ],
];

const GENERIC: TaskSeed[] = [
  { cadence: "daily", title: "围绕目标专注推进 45 分钟（番茄钟 ×2）" },
  { cadence: "daily", title: "记录 1 条今日进展或卡点" },
  { cadence: "daily", title: "睡前 10 分钟复盘" },
  { cadence: "weekly", title: "完成一个可展示的阶段性产出" },
  { cadence: "monthly", title: "全面复盘：保留什么 / 停止什么 / 开始什么" },
];

function seedsFor(goal: string): TaskSeed[] {
  for (const [re, seeds] of BANKS) {
    if (re.test(goal)) return seeds;
  }
  return GENERIC;
}

function periodKeyOf(cadence: Cadence, now = Date.now()): string {
  const d = new Date(now);
  if (cadence === "daily") return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  if (cadence === "weekly") {
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${week}`;
  }
  return `${d.getFullYear()}-M${d.getMonth()}`;
}

export function generatePlan(goal: string, profile: UserProfile): LifePlan {
  const rng = createRng(hashString(goal + profile.name));
  const seeds = rng.shuffle(seedsFor(goal));
  const now = Date.now();
  const tasks: PlanTask[] = seeds.map((s, i) => ({
    id: `t-${now}-${i}`,
    title: s.title,
    cadence: s.cadence,
    done: false,
    periodKey: periodKeyOf(s.cadence, now),
  }));
  return {
    id: `plan-${now}`,
    goal,
    createdAt: now,
    tasks,
    adjustments: 0,
    lastNote: "AI 已根据你的人格档案生成了初始计划，执行 3 天后将自动优化。",
  };
}

/** 周期翻页：daily/weekly/monthly 任务在新周期自动重置 */
export function rolloverPlan(plan: LifePlan): LifePlan {
  const key = periodKeyOf("daily");
  const weekKey = periodKeyOf("weekly");
  const monthKey = periodKeyOf("monthly");
  let changed = false;
  const tasks = plan.tasks.map((t) => {
    const target =
      t.cadence === "daily" ? key : t.cadence === "weekly" ? weekKey : monthKey;
    if (t.done && t.periodKey !== target) {
      changed = true;
      return { ...t, done: false, doneAt: undefined, periodKey: target };
    }
    if (!t.periodKey) {
      changed = true;
      return { ...t, periodKey: target };
    }
    return t;
  });
  return changed ? { ...plan, tasks } : plan;
}

/** AI 自动调整：完成率过低 → 降负荷；过高 → 加挑战 */
export function adjustPlan(plan: LifePlan, stats: OSStats): LifePlan {
  const done = plan.tasks.filter((t) => t.done).length;
  const rate = plan.tasks.length > 0 ? done / plan.tasks.length : 0;
  const rng = createRng(hashString(plan.goal + String(plan.adjustments) + String(stats.tasksCompleted)));
  let note: string;

  if (rate < 0.35 && plan.adjustments >= 0) {
    note = "检测到完成率偏低：已把每日任务聚焦为「最小可行动作」，先重建节奏，再逐步加量。";
  } else if (rate > 0.8) {
    note = "完成率优秀：为你增加了一项拉伸任务，保持 15% 的挑战区以维持成长斜率。";
  } else {
    note = rng.pick([
      "节奏健康：保持当前配速，重点是连续性而非强度。",
      "建议把最难的任务安排在精力峰值时段，完成率预计可再提升 20%。",
    ]);
  }

  let tasks = [...plan.tasks];
  if (rate < 0.35) {
    tasks = tasks.filter((t) => t.cadence !== "daily" || !/精读|错题|记录饮食|商业观察|素材/.test(t.title));
    if (tasks.filter((t) => t.cadence === "daily").length === 0) {
      tasks.unshift({
        id: `t-${Date.now()}-min`,
        title: "最小行动：围绕目标专注 15 分钟",
        cadence: "daily",
        done: false,
        periodKey: periodKeyOf("daily"),
      });
    }
  } else if (rate > 0.8) {
    tasks.push({
      id: `t-${Date.now()}-stretch`,
      title: "拉伸任务：输出 1 篇复盘/教程并公开分享",
      cadence: "weekly",
      done: false,
      periodKey: periodKeyOf("weekly"),
    });
  }

  return {
    ...plan,
    tasks,
    adjustments: plan.adjustments + 1,
    lastNote: note,
  };
}
