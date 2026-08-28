import type {
  ChatMessage,
  LifePlan,
  MemoryEvent,
  OSStats,
  Persona,
  UserProfile,
} from "../types";
import { stateBand } from "../data/dailyPlan";
import { createRng, hashString } from "./random";
import { getLLM, personaContext } from "./llm";

// ─── 日常习惯对话助手：读取用户的「日常计划（弹性版）」→ 按状态动态分析 ───
// 核心原则（来自用户计划）：固定框架 + 根据心情动态调整，不搞死板时间表

export interface DailyAdvisorContext {
  profile: UserProfile | null;
  persona: Persona | null;
  dailyPlan: string;
  plans: LifePlan[];
  memories: MemoryEvent[];
  moods: { at: number; mood: string }[];
  stats: OSStats;
}

type Topic = "coffee" | "food" | "exercise" | "rest" | "study" | "work" | "summary" | "generic";

const TOPIC_RULES: Array<[RegExp, Topic]> = [
  [/咖啡|奶茶|喝点|喝什么|饮品|泡一杯|茶/, "coffee"],
  [/总结|复盘|日总结|今天做了|回顾/, "summary"],
  [/吃|饭|餐|外卖|美食|点心|甜品/, "food"],
  [/运动|健身|跑步|锻炼|游泳|撸铁|散步/, "exercise"],
  [/休息|睡|累|倦|躺|放松|摸鱼|摆烂/, "rest"],
  [/学|读书|看书|课程|背|复习|刷题/, "study"],
  [/工作|任务|效率|专注|推进|赶|deadline|截止/, "work"],
];

function detectTopic(text: string): Topic {
  for (const [re, topic] of TOPIC_RULES) {
    if (re.test(text)) return topic;
  }
  return "generic";
}

/** 从消息里识别状态自评（如「今天 9 分」「状态 3 分」） */
function detectStateScore(text: string): number | null {
  const m = text.match(/(10|[0-9])\s*分/);
  return m ? Number(m[1]) : null;
}

/** 与用户日常计划对齐的时段感知 */
function planBand(hour: number): { label: string; focus: string } {
  if (hour < 8) return { label: "早晨整理", focus: "起床洗漱、看看今天有什么重要的事，不要求一醒来就学习，先进入状态" };
  if (hour < 10) return { label: "咖啡时间 ☕", focus: "按心情在星巴克/瑞幸之间选一杯，舒服坐着慢慢进入状态——这个阶段的重点不是学习" };
  if (hour < 12) return { label: "上午状态判断窗口", focus: "状态好就去图书馆专注 1–2 小时；一般就留在咖啡店保持一点点进度；很差允许自己低效率" };
  if (hour < 13.5) return { label: "午餐时间", focus: "找喜欢吃的东西，不边吃边工作" };
  if (hour < 14.5) return { label: "午休/自由时间", focus: "午睡、散步、刷手机都行" };
  if (hour < 18) return { label: "核心任务时间 🚀", focus: "今天只定 1–3 件最重要的事，完成最重要的事就是成功的一天；状态不好就把任务降难度" };
  if (hour < 20) return { label: "傍晚自由时间", focus: "吃饭、散步、咖啡店坐一会儿，不安排高强度学习" };
  if (hour < 22) return { label: "自由探索", focus: "有动力就继续做项目，一般就看课程/看书，很累就直接休息" };
  return { label: "AI 日总结时间 📝", focus: "聊聊今天做了什么、心情、最开心/最烦的事，我帮你生成今日评分和明日建议" };
}

/** 从生活管理 + 档案 + 人格中汇总用户的「日常」清单 */
export function dailyRoutineItems(ctx: DailyAdvisorContext): string[] {
  const items: string[] = [];
  for (const plan of ctx.plans) {
    for (const t of plan.tasks) {
      if (t.cadence === "daily") {
        items.push(t.done ? `${t.title}（今日已完成 ✓）` : t.title);
      }
    }
  }
  if (ctx.profile && ctx.profile.interests.length > 0) {
    items.push(`兴趣：${ctx.profile.interests.join("、")}`);
  }
  if (ctx.persona) {
    for (const h of ctx.persona.habits) items.push(h);
  }
  return items;
}

function localReply(
  text: string,
  topic: Topic,
  ctx: DailyAdvisorContext,
  routine: string[],
): string {
  const now = new Date();
  const band = planBand(now.getHours() + (now.getMinutes() >= 30 ? 0.5 : 0));
  const rng = createRng(hashString(text + band.label + String(ctx.stats.chatsCount)));
  const mood = ctx.moods[0]?.mood;
  const persona = ctx.persona;
  const parts: string[] = [];

  // 0) 状态自评最高优先级：「今天 X 分」→ 按计划的状态分诊规则给安排
  const score = detectStateScore(text);
  if (score !== null) {
    const b = stateBand(score);
    parts.push(`收到，今天 ${score} 分，${b.label}。`);
    parts.push(b.advice + "。");
    if (score <= 4) {
      parts.push("记住我们说好的：没完成计划不代表今天失败。今天允许自己低效率，你能来打卡已经是在前进了。");
    } else if (score >= 8) {
      parts.push("状态在峰值，把今天最重要的一件事拿出来，图书馆专注 1–2 小时就够本了。");
    } else {
      parts.push("不强迫自己，保持一点点进度就算赢。");
    }
    return parts.join("\n\n");
  }

  // 1) 开场：时段 + 最近情绪（早上 8–10 点按计划主动问状态）
  const morningCheck = now.getHours() >= 8 && now.getHours() < 10;
  if (morningCheck && topic === "generic") {
    parts.push(`早上好。现在是${band.label}——${band.focus}。`);
    parts.push("按我们的约定先对个暗号：今天感觉怎么样？满分 10 分，你现在的状态是多少？告诉我分数，我来帮你定今天的路线。");
    return parts.join("\n\n");
  }
  parts.push(
    mood
      ? `现在是${band.label}，我记得你最近记录过「${mood}」的情绪，今天的建议会把它算进去。`
      : `现在是${band.label}——${band.focus}。`,
  );

  // 2) 引用用户写好的「日常」
  if (routine.length > 0) {
    parts.push(`先对齐一下我读到的你的日常：${routine.slice(0, 3).join("；")}。`);
  } else {
    parts.push("你还没在「生活管理」里写下每日任务——去写两条，我对你日常的分析会准很多。");
  }

  // 3) 按主题分析
  const tired = mood === "疲惫" || mood === "低落";
  switch (topic) {
    case "coffee": {
      parts.push("按你的日常计划，这个时间喝咖啡的意义是「进入状态」而不是续命——根据当天心情在星巴克和瑞幸之间选就好。");
      if (tired) parts.push("今天偏疲惫，可以在平常的订单上浓半档，但记得先垫点东西，别空腹。");
      else parts.push(rng.pick(["想换口味的话，燕麦拿铁这类温和款更稳，不容易引起心慌。", "选一杯你真正喜欢的，坐下慢慢喝——这一杯是你一天节奏的开关。"]));
      break;
    }
    case "summary": {
      parts.push("来，按我们的日总结流程过一遍：");
      parts.push("1️⃣ 今天做了什么？2️⃣ 心情怎么样（😊/😐/😔）？3️⃣ 今天最开心的事？4️⃣ 今天最烦的事？5️⃣ 明天最重要的一件事是什么？\n\n你直接按这个顺序说给我，我帮你生成「今日状态评分 + 今日总结 + 明日建议」。");
      break;
    }
    case "food": {
      parts.push(
        routine.length > 0
          ? "你今天还有日常任务要推进，这顿吃到七分饱就好，吃太重下午的专注力会替你买单。"
          : "按计划，中午这顿要好好吃——找喜欢吃的东西，不边吃边工作。",
      );
      if (tired) parts.push("情绪偏沉的时候别用重油重辣硬撑，一碗热汤面比炸物更能把你捞起来。");
      break;
    }
    case "exercise": {
      const hasSportTask = routine.some((r) => /运动|健身|跑步|锻炼/.test(r));
      if (hasSportTask) parts.push("你的日常里已经排了运动任务，今天按计划走就行，别临时加练。");
      if (tired) parts.push("不过你最近偏疲惫，高强度改成散步或拉伸半小时——这本身就符合你计划里「允许低效率」的原则。");
      else parts.push(rng.pick(["傍晚体温最高时训练效率最好，力量或强度课放在那个时段。", "每次 30 分钟起步就够，频率比单次强度重要。"]));
      break;
    }
    case "rest": {
      parts.push("会主动安排休息本身就是好习惯，别有负罪感——你的计划里白纸黑字写着允许自己休息。");
      parts.push(
        persona && (persona.traits.find((t) => t.label === "自律")?.score ?? 0) < 50
          ? "你偏「状态驱动」，休息不定时就会变成无限刷手机——设个 25 分钟的闹钟，到点回来。"
          : "按你的节奏，定时休息 15 分钟、离开屏幕，回来效率会明显回血。",
      );
      break;
    }
    case "study": {
      const hour = now.getHours();
      if (hour >= 14 && hour < 18) {
        parts.push("现在是你的核心任务时间。按计划只挑 1–3 件最重要的事：完成最重要的事，今天就算成功。");
      } else {
        parts.push("按你的计划，上午适合推进学习——状态好去图书馆专注 1–2 小时，一般就保持一点点进度。");
      }
      parts.push("状态不好就把任务降难度：「完成 AI 项目」→「先把首页做出来」，「学新技术」→「只看 30 分钟课程」。");
      break;
    }
    case "work": {
      const openTasks = ctx.plans.flatMap((p) => p.tasks.filter((t) => !t.done));
      parts.push(
        openTasks.length > 0
          ? `你现在挂着 ${openTasks.length} 项未完成任务，最优先的是「${openTasks[0].title}」——先把它拆成 25 分钟的一小块推进。`
          : "把最想推进的那件事拆成一个 25 分钟能完成的最小单元，从它开始。",
      );
      parts.push("今天只要完成最重要的事情，就是成功的一天。");
      break;
    }
    default: {
      parts.push(
        rng.pick([
          "把这个选择放进你今天的节奏里看：哪个选项更不破坏你「固定框架 + 动态调整」的安排，就选哪个。",
          "按你的计划来——先判断状态，再选场景，最后只抓最重要的一件事。",
        ]),
      );
    }
  }

  // 4) 收尾
  parts.push(rng.pick(["需要我帮你把这条安排写进日常吗？", "还有别的想聊的，直接说。", "按这个来，明天告诉我效果。"]));

  return parts.join("\n\n");
}

/** 日常习惯对话：用户输入 → 结合日常计划与状态的人格化分析回复 */
export async function habitAdvice(
  text: string,
  ctx: DailyAdvisorContext,
): Promise<ChatMessage> {
  const llm = getLLM();
  const routine = dailyRoutineItems(ctx);
  const now = new Date();
  const band = planBand(now.getHours() + (now.getMinutes() >= 30 ? 0.5 : 0));
  const refs: string[] = [];

  if (routine.length > 0) refs.push(...routine.slice(0, 3));
  if (ctx.moods[0]) refs.push(`最近情绪：${ctx.moods[0].mood}`);
  refs.push(`当前时段：${band.label}`);

  let reply = "";
  if (llm.isRemote && ctx.profile && ctx.persona) {
    try {
      reply = await llm.complete(
        `你是用户的日常习惯助手，严格按 TA 的「日常计划（弹性版）」协助 TA。

【核心规则——必须遵守】
1. 不把生活安排成死板时间表。TA 的日常 = 固定框架 + 根据心情动态调整。
2. 早上主动问状态："今天感觉怎么样？满分 10 分？"
3. 状态 8–10 分 → 图书馆 / 学习 / 做项目；5–7 分 → 咖啡店 / 轻度学习 / 简单任务；0–4 分 → 休息 / 散步 / 放松 / 低压力任务。
4. 没完成计划 ≠ 失败的一天，绝不能让 TA 因此自责。
5. 你的目标不是监督，而是根据 TA 当下的状态，帮 TA 找到今天最适合的生活方式，每天前进一点点。
6. 用户说「X 分」时，先按第 3 条分诊，再给具体安排。
7. 22 点后是 AI 日总结时间：问今天做了什么、心情（😊/😐/😔）、最开心的事、最烦的事、完成了什么、明天最重要的一件事，然后生成「今日状态评分 + 今日总结 + 明日建议」。

回答要求：中文，口语化、具体，自然引用 TA 计划里的实际内容（咖啡时间、图书馆、核心任务、降难度原则等），不超过 160 字，最后给明确建议。

${personaContext(ctx.profile, ctx.persona)}
【用户的日常计划】${ctx.dailyPlan}
【生活管理里的每日任务】${JSON.stringify(routine)}
【最近情绪】${JSON.stringify(ctx.moods.slice(0, 3).map((m) => m.mood))}
【当前时段】${band.label}：${band.focus}`,
        text,
      );
    } catch {
      reply = ""; // 回退本地引擎
    }
  }

  if (!reply) {
    reply = localReply(text, detectTopic(text), ctx, routine);
  }

  return {
    id: `d-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    role: "ai",
    text: reply,
    at: Date.now(),
    memoryRefs: refs.slice(0, 4),
  };
}
