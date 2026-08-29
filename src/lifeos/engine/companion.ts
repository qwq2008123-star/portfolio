import type {
  ChatMessage,
  CompanionMode,
  DecisionReport,
  LifePlan,
  MemoryEvent,
  OSStats,
  Persona,
  UserProfile,
} from "../types";
import { COMPANION_MODES } from "../types";
import { createRng, hashString } from "./random";
import { getLLM, personaContext } from "./llm";

// ─── AI 情绪陪伴：模式化回应 + 长期记忆引用（支持接入真实 LLM） ───

const MOOD_RULES: Array<[RegExp, string, string]> = [
  [/焦虑|紧张|慌|压力|崩溃/, "焦虑", "先深呼吸 10 秒。焦虑通常是大脑在提醒你在乎这件事。"],
  [/累|疲惫|撑不住|倦/, "疲惫", "累是身体在要求降载，这不是软弱，是信号。"],
  [/迷茫|不知道|困惑|方向/, "迷茫", "迷茫说明旧地图失效了，这正是重新校准的时机。"],
  [/开心|兴奋|成了|顺利|做到/, "愉悦", "记住此刻的手感——这是你能力边界的证据。"],
  [/难过|伤心|失落|沮丧|失败/, "低落", "允许自己难过 24 小时，然后我们把它变成数据。"],
  [/烦|生气|愤怒|气死/, "烦躁", "情绪来了先接住它，我们再谈事实层面。"],
];

export function detectMood(text: string): { label: string; ack: string } | null {
  for (const [re, label, ack] of MOOD_RULES) {
    if (re.test(text)) return { label, ack };
  }
  return null;
}

function recentMemories(memories: MemoryEvent[], n = 3): MemoryEvent[] {
  return [...memories].sort((a, b) => b.at - a.at).slice(0, n);
}

function memoryRefsFor(
  profile: UserProfile | null,
  decisions: DecisionReport[],
  plans: LifePlan[],
  moods: { mood: string }[],
): string[] {
  const refs: string[] = [];
  if (profile?.goals) refs.push(`你的目标：${profile.goals.slice(0, 24)}`);
  if (profile?.dream) refs.push(`你的梦想：${profile.dream.slice(0, 24)}`);
  if (decisions[0]) refs.push(`最近决策：${decisions[0].question.slice(0, 20)}（匹配度 ${decisions[0].matchScore}%）`);
  const openTasks = plans.flatMap((p) => p.tasks).filter((t) => !t.done).length;
  if (openTasks > 0) refs.push(`还有 ${openTasks} 项待完成任务`);
  if (moods[0]) refs.push(`最近记录的情绪：${moods[0].mood}`);
  return refs.slice(0, 3);
}

function localReply(
  text: string,
  mode: CompanionMode,
  profile: UserProfile | null,
  persona: Persona | null,
  decisions: DecisionReport[],
  plans: LifePlan[],
  memories: MemoryEvent[],
  moods: { mood: string }[],
  stats: OSStats,
): string {
  const rng = createRng(hashString(text + mode + String(stats.chatsCount)));
  const mood = detectMood(text);
  const refs = memoryRefsFor(profile, decisions, plans, moods);
  const parts: string[] = [];

  // 1) 开场（模式化 + 情绪确认）
  if (mood) {
    parts.push(mood.ack);
  }
  const opener = rng.pick(
    mode === "friend"
      ? ["我在听。", "嗯，继续说，我记着呢。", "这件事对你来说不容易，我明白。"]
      : mode === "coach"
        ? ["我们把这个情况拆开看。", "先定义问题，再谈感受。", "好，我们按框架来梳理。"]
        : mode === "encourage"
          ? ["你已经走了很远了，别小看这一点。", "这个阶段的挣扎是成长的证据。", "我相信你能处理好，而且我有依据。"]
          : ["以 10 年后的我来看，此刻比你想象的更重要。", "从长期视角看，这件事的权重和你现在的感受不同。", "未来的我先谢谢你今天来问。"],
  );
  parts.push(opener);

  // 2) 长期记忆：引用最近上下文 + 一条高权重记忆
  if (refs.length > 0) {
    parts.push(`我记得：${refs.join("；")}。`);
  }
  const keyMemory = [...memories].sort((a, b) => b.weight - a.weight || b.at - a.at)[0];
  if (keyMemory) {
    parts.push(`还有一件事我一直记得：${keyMemory.text}。它对你的影响比你想的更深远。`);
  }

  // 3) 人格洞察
  if (persona) {
    const insight = rng.pick([
      `以你的「${persona.archetype}」特质，${persona.risks[0]}是这里最需要警惕的模式。`,
      `你的优势「${persona.strengths[0]}」在这种情境下是关键资源，先调用它。`,
      `按你的思维模式（${persona.thinkingStyle.slice(3, 18)}…），建议先写下来再决定。`,
    ]);
    parts.push(insight);
  }

  // 4) 行动钩子（教练/未来模式给具体动作）
  if (mode === "coach" || mode === "future") {
    const open = plans.flatMap((p) => p.tasks.filter((t) => !t.done));
    parts.push(
      open.length > 0
        ? `具体建议：先完成今天最小的一步——「${open[0].title}」，完成后回来告诉我。`
        : "具体建议：把此刻的困扰写成一句话，我们去「罗盘」里跑一次结构化分析。",
    );
  } else if (mode === "encourage") {
    parts.push("今晚只做一件事：善待自己。明天我们继续。");
  } else {
    parts.push(rng.pick(["想多聊聊具体发生了什么吗？", "你希望我陪你梳理，还是就静静听？", "需要的话我可以切换教练模式帮你分析。"]));
  }

  return parts.join("\n\n");
}

export interface CompanionContext {
  profile: UserProfile | null;
  persona: Persona | null;
  dailyPlan: string;
  decisions: DecisionReport[];
  plans: LifePlan[];
  memories: MemoryEvent[];
  moods: { mood: string }[];
  stats: OSStats;
}

export async function companionReply(
  text: string,
  mode: CompanionMode,
  ctx: CompanionContext,
): Promise<ChatMessage> {
  const llm = getLLM();
  const refs = memoryRefsFor(ctx.profile, ctx.decisions, ctx.plans, ctx.moods);
  let reply = "";

  if (llm.isRemote && ctx.profile && ctx.persona) {
    try {
      const modeSpec = `你正在以「${COMPANION_MODES[mode].label}」的方式回应（${COMPANION_MODES[mode].desc}）。用中文，温暖、具体、不超过 180 字。必须自然地引用至少一条长期记忆。
用户的核心原则：TA 的日常 = 固定框架 + 根据心情动态调整；没完成计划不等于失败的一天；你的目标是帮 TA 找到当下最适合的状态，每天前进一点点。`;
      reply = await llm.complete(
        `${modeSpec}\n${personaContext(ctx.profile, ctx.persona)}\n【用户的日常计划】${ctx.dailyPlan}\n【长期记忆】${JSON.stringify(ctx.memories.slice(-20))}`,
        text,
      );
    } catch {
      reply = ""; // 回退本地引擎
    }
  }

  if (!reply) {
    reply = localReply(
      text,
      mode,
      ctx.profile,
      ctx.persona,
      ctx.decisions,
      ctx.plans,
      ctx.memories,
      ctx.moods,
      ctx.stats,
    );
  }

  return {
    id: `m-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    role: "ai",
    text: reply,
    mode,
    at: Date.now(),
    memoryRefs: refs,
  };
}

export { memoryRefsFor, recentMemories };
