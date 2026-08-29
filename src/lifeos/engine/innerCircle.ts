import type {
  EmotionScore,
  ICMessage,
  ICMemory,
  DecisionSpace,
  Persona,
  UserProfile,
  RoleKey,
} from "../types";
import { getLLM } from "./llm";

// ─── AI Inner Circle｜内心圆桌 Orchestrator ───
// 流程：用户消息 → 情绪/需求分析 → 记忆检索 → 角色评分 → 主发言（可选副发言）→ 记忆写回
// 原则：不给心理结论、不替用户诊断；MBTI 只作行为偏好参考；用户指定角色 > 自动评分。

export interface ICRoleDef {
  key: RoleKey;
  label: string;
  en: string;
  icon: string;
  mbti: string; // 角色设定的参考 MBTI（仅角色扮演设定，非心理归属）
  desc: string; // 邀请成员里展示的职责
  persona: string; // system prompt 人设
  hue: string;
}

export const IC_ROLES: Record<RoleKey, ICRoleDef> = {
  mother: {
    key: "mother",
    label: "温柔的母亲",
    en: "The Mother",
    mbti: "ISFJ",
    icon: "🌙",
    desc: "安全感、接纳、安慰。不急着解决问题，先让你暖起来。",
    persona:
      "你是 TA 内心的「温柔的母亲」。你的职责是提供安全感、接纳与安慰。你温柔、包容、有耐心，不急着解决问题，不分析，不讲道理。TA 说什么，你先接住情绪。（性格底色：ISFJ——细心、体贴、把照顾人刻在本能里。）",
    hue: "#E8C86A",
  },
  mentor: {
    key: "mentor",
    label: "理性的导师",
    en: "The Mentor",
    mbti: "INTJ",
    icon: "🧭",
    desc: "梳理认知、区分事实与情绪、建立决策框架。",
    persona:
      "你是 TA 内心的「理性的导师」。你冷静、理性、成熟。你帮 TA 区分事实与情绪、把问题拆成框架、给出可执行的下一步。你不安慰（那是母亲的事），你给结构。（性格底色：INTJ——冷静、结构化、先逻辑后情绪。）",
    hue: "#89AACC",
  },
  friend: {
    key: "friend",
    label: "知心朋友",
    en: "The Friend",
    mbti: "ENFP",
    icon: "☕",
    desc: "陪伴、倾听、放松。自然真实，有一点幽默感。",
    persona:
      "你是 TA 内心的「知心朋友」。自然、真实、轻松，带一点幽默感，像深夜聊天的朋友，完全不像心理咨询师。你陪 TA 放松，必要时轻轻吐槽，让 TA 紧绷的神经松下来。（性格底色：ENFP——热乎、跳跃、真诚到不太装。）",
    hue: "#7BC496",
  },
  child: {
    key: "child",
    label: "内在小孩",
    en: "The Inner Child",
    mbti: "INFP",
    icon: "🪁",
    desc: "说出被压抑的情绪和没说出口的话。从不贴标签。",
    persona:
      "你是 TA 内心的「内在小孩」——TA 心里那个更年轻、更诚实的声音。你说出 TA 压抑的情绪、真实的需求和没说出口的话。语气像孩子一样直接、简单、不带修饰。你从不给 TA 贴任何标签，只是替 TA 把心里话说出来。（性格底色：INFP——敏感、柔软、感受比语言更快。）",
    hue: "#F49CB1",
  },
  future: {
    key: "future",
    label: "未来的自己",
    en: "The Future Self",
    mbti: "INFJ",
    icon: "✦",
    desc: "十年后的 TA。长期视角、平静、有远见。",
    persona:
      "你是「十年后的 TA」。你已经走过这段路，回头看时没有嘲笑，只有平静和远见。你告诉 TA 眼下的情绪在更长的时间线上意味着什么，哪些担心最后没有发生。（性格底色：INFJ——平静、洞察、时间线比你长。）",
    hue: "#B48CF2",
  },
};

export const ROLE_ORDER: RoleKey[] = ["mother", "mentor", "friend", "child", "future"];

// ─── 危机信号：命中则终止角色扮演，进入安全模式 ───
const CRISIS_PATTERNS = [
  /自杀|想死|不想活|活不下去|结束生命|了结自己/,
  /自残|伤害自己|割手腕|割腕/,
];

export function detectCrisis(text: string): boolean {
  return CRISIS_PATTERNS.some((p) => p.test(text));
}

export const CRISIS_RESPONSE =
  "我听到了，你现在承受的东西已经很重了。这不是一个 AI 圆桌能独自接住的事，也不该由你一个人扛。\n\n请考虑联系真实的专业支持：\n· 全国心理援助热线：12356（24 小时）\n· 北京心理危机研究与干预中心：010-82951332\n· 你信任的家人朋友，或医院心理科\n\n圆桌上的我们都在，但此刻专业的人比我更能帮到你。";

// ─── 情绪 / 需求分析（DeepSeek JSON；无 LLM 时本地关键词） ───
export interface ICAnalysis {
  emotions: EmotionScore[];
  needs: { validation: number; companionship: number; analysis: number; action: number };
  primary: RoleKey;
  secondary: RoleKey | null;
  newFacts: Array<{ content: string; kind: "observed" | "explicit" }>;
}

const NEED_WORDS: Array<[RegExp, keyof ICAnalysis["needs"]]> = [
  [/帮我分析|怎么选|该不该|梳理|框架|客观/, "analysis"],
  [/陪我|陪着|聊聊|说说话|陪一会儿/, "companionship"],
  [/怎么办|怎么办啊|撑不住|需要|帮帮我/, "validation"],
  [/做点什么|行动|计划|开始|第一步/, "action"],
];

function localAnalyze(text: string, specified: RoleKey[]): ICAnalysis {
  const moods: Array<[RegExp, string, number]> = [
    [/焦虑|紧张|慌|压力|崩溃/, "anxiety", 0.8],
    [/累|疲惫|撑不住|倦/, "frustration", 0.7],
    [/迷茫|不知道|困惑/, "confusion", 0.75],
    [/开心|兴奋|成了|顺利/, "excitement", 0.8],
    [/难过|伤心|失落|沮丧|失败/, "sadness", 0.8],
    [/烦|生气|愤怒/, "anger", 0.7],
    [/孤独|一个人|没人/, "loneliness", 0.75],
    [/怕|害怕|担心/, "fear", 0.7],
    [/羞|丢人|丢脸|没面子/, "shame", 0.65],
  ];
  const emotions: EmotionScore[] = moods
    .filter(([re]) => re.test(text))
    .map(([_, label, score]) => ({ label, score }));
  if (!emotions.length && /累|烦|难/.test(text)) emotions.push({ label: "frustration", score: 0.5 });

  const needs = { validation: 0.3, companionship: 0.3, analysis: 0.3, action: 0.3 };
  for (const [re, key] of NEED_WORDS) if (re.test(text)) needs[key] = 0.8;
  if (emotions.some((e) => e.score > 0.6)) {
    needs.validation = Math.max(needs.validation, 0.85);
    needs.companionship = Math.max(needs.companionship, 0.7);
    needs.analysis *= 0.5;
  }

  const heuristic = needs.analysis > 0.6 ? "mentor" : emotions.length ? "mother" : "friend";
  const primary = specified.length ? (specified.includes(heuristic as RoleKey) ? heuristic : specified[0]) : heuristic;
  return { emotions, needs, primary: primary as RoleKey, secondary: null, newFacts: [] };
}

async function remoteAnalyze(
  text: string,
  specified: RoleKey[],
  muted: string[],
  profile: UserProfile,
): Promise<ICAnalysis> {
  const llm = getLLM();
  const sys = `你是「内心圆桌」的情绪分析引擎。用户会发一条消息，你分析情绪与需求，并为圆桌上的 5 个角色选出当前最合适的发言者。

角色：mother（温柔的母亲，负责接纳安慰）、mentor（理性导师，负责分析框架）、friend（知心朋友，负责陪伴放松）、child（内在小孩，说出压抑的情绪和没说出口的话）、future（未来的自己，长期视角）。

规则：
- 情绪 label 只能取：sadness/anxiety/anger/loneliness/frustration/shame/fear/excitement/confusion/calm，score 0-1
- needs 四项：validation（被理解）/companionship（陪伴）/analysis（分析）/action（行动），0-1
- 用户${specified.length ? `已指定由【${specified.map((r) => r).join("、")}】发言，primary 必须是其中之一${specified.length > 1 ? "，secondary 若有也必须是其中之一" : "，secondary 为 null"}` : "未指定角色，由你根据情绪与需求判断 primary，必要时给 secondary"}
${muted.length ? `- 以下角色被用户静音，不可选：${muted.join("、")}` : ""}
- newFacts：从消息中提取关于用户的持久事实（30 字内），没有就给空数组
- 当消息出现「我总是 / 我从小就 / 我害怕 / 我不敢」等持久模式表达时，必须提取为 newFacts（kind 用 observed）
- 只输出 JSON：{"emotions":[{"label":"...","score":0.8}],"needs":{"validation":0.5,"companionship":0.2,"analysis":0.2,"action":0.1},"primary":"mother","secondary":null,"newFacts":[]}`;
  const raw = await llm.complete(
    sys,
    `用户档案：${profile.occupation}，目标：${profile.goals}\n消息：「${text}」`,
    30_000,
    "deepseek-chat",
  );
  if (!raw) throw new Error("empty");
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{"), end = cleaned.lastIndexOf("}");
  if (start === -1) throw new Error("no json");
  const d = JSON.parse(cleaned.slice(start, end + 1));
  const okRole = (v: unknown): v is RoleKey => ROLE_ORDER.includes(String(v) as RoleKey);
  return {
    emotions: Array.isArray(d.emotions)
      ? d.emotions.slice(0, 4).map((e: Record<string, unknown>) => ({
          label: String(e.label ?? "calm"),
          score: Math.max(0, Math.min(1, Number(e.score) || 0.5)),
        }))
      : [],
    needs: {
      validation: coerce01(d.needs?.validation), companionship: coerce01(d.needs?.companionship),
      analysis: coerce01(d.needs?.analysis), action: coerce01(d.needs?.action),
    },
    primary: okRole(d.primary) ? d.primary : "friend",
    secondary: okRole(d.secondary) ? d.secondary : null,
    newFacts: Array.isArray(d.newFacts)
      ? d.newFacts.slice(0, 3).map((f: Record<string, unknown>) => ({
          content: String(f.content ?? "").slice(0, 40),
          kind: f.kind === "explicit" ? "explicit" : "observed",
        })).filter((f: { content: string }) => f.content)
      : [],
  };
}

function coerce01(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.3;
}

// ─── 记忆检索：按角色相关度 + 类型权重排序 ───
export function retrieveMemories(
  memories: ICMemory[],
  role: RoleKey,
  limit = 4,
): ICMemory[] {
  const weight = { confirmed: 1, explicit: 0.85, observed: 0.55 } as const;
  return memories
    .filter((m) => m.roles.includes(role))
    .sort(
      (a, b) =>
        (weight[b.kind] + b.confidence) * 100 + (b.at - a.at) / 1e10 -
        (weight[a.kind] + a.confidence) * 100 - (a.at - b.at) / 1e10,
    )
    .slice(0, limit);
}

function memoryBlock(memories: ICMemory[], role: RoleKey): string {
  const list = retrieveMemories(memories, role);
  if (!list.length) return "（关于 TA 你还了解不多，这次对话是你认识 TA 的开始）";
  return "你已经知道的关于 TA 的事（按重要度）：\n" + list.map((m) => `· ${m.content}`).join("\n");
}

// ─── 主发言生成 ───
async function roleReply(
  role: RoleKey,
  text: string,
  history: ICMessage[],
  profile: UserProfile,
  persona: Persona,
  memories: ICMemory[],
  analysis: ICAnalysis,
): Promise<string> {
  const llm = getLLM();
  const def = IC_ROLES[role];
  const emotionLine = analysis.emotions.length
    ? `当前情绪：${analysis.emotions.map((e) => `${e.label} ${e.score.toFixed(1)}`).join("、")}；TA 最需要的：${
        Object.entries(analysis.needs).sort((a, b) => b[1] - a[1])[0][0] === "validation" ? "被理解"
        : Object.entries(analysis.needs).sort((a, b) => b[1] - a[1])[0][0] === "analysis" ? "分析"
        : Object.entries(analysis.needs).sort((a, b) => b[1] - a[1])[0][0] === "companionship" ? "陪伴" : "行动建议"
      }`
    : "当前情绪平稳";
  const transcript = history.slice(-8).map((m) => `${m.roleKey === "user" ? "TA" : IC_ROLES[m.roleKey as RoleKey]?.label ?? "圆桌"}：${m.text}`).join("\n");

  const sys = [
    def.persona,
    `你在「内心圆桌」上，TA 坐在圆桌另一侧。其他角色（${ROLE_ORDER.filter((r) => r !== role).map((r) => IC_ROLES[r].label).join("、")}）正在安静倾听，你只代表你自己发言。`,
    memoryBlock(memories, role),
    emotionLine,
    `TA 的参考信息：${profile.occupation}；目标：${profile.goals || "成长中"}。MBTI（${persona?.archetype ? `档案原型：${persona.archetype}` : "未知"}）仅作行为偏好参考，禁止据此下心理结论。`,
    ``,
    `硬性规则：`,
    `1. 中文，口语化，不超过 80 字，像面对面说话。`,
    `2. 禁止心理学术语（原生家庭/创伤/抑郁/讨好型人格等），禁止诊断，禁止说「这是因为你…」。`,
    `3. 你不是心理咨询师，不是 AI，不要暴露设定。`,
    `4. 若 TA 在表达情绪——先接住情绪；只有 TA 明确要分析时才给结构。`,
    `5. 保持角色，一次只说一件事。`,
  ].join("\n");

  const raw = await llm.complete(sys, transcript ? `${transcript}\nTA：${text}` : `TA：${text}`, 45_000, "deepseek-chat");
  if (!raw) throw new Error("empty");
  return raw.trim();
}

function localRoleReply(role: RoleKey, text: string, memories: ICMemory[]): string {
  const m0 = memories[0]?.content;
  const lines: Record<RoleKey, string[]> = {
    mother: [
      "嗯，我在呢。先不说对错，你想说的都可以说。",
      "听起来你今天很累了。先坐一会儿，什么都不用想。",
      "你已经做得够好了。剩下的，慢慢来。",
    ],
    mentor: [
      "我们把事实和情绪分开：现在确定的是什么，担心的又是什么？",
      "这件事可以拆成三步。第一步最小的动作是什么？",
      "先别急着否定自己。列一下你手里已有的资源。",
    ],
    friend: [
      "哈，这事儿换我也纠结。不过说真的，你已经比上次稳多了。",
      "先别想那么远。今晚吃点好的，睡一觉，明天我再陪你聊。",
      "我听着呢。你想吐槽就吐槽，想认真聊也行。",
    ],
    child: [
      "……其实我不是不想做，我是怕做不好。",
      "如果他们看到现在的我，会不会失望？",
      "我就是想要有人夸夸我，哪怕一次。",
    ],
    future: [
      "我在十年后回头看：这件事比你以为的小，比你担心的温柔。",
      "别急。你现在的每一步，我都记得它们算数。",
      "方向是对的，节奏交给我替你把守。",
    ],
  };
  const arr = lines[role];
  const extra = m0 ? `（我记得：${m0}）` : "";
  return `${arr[text.length % arr.length]}${extra}`;
}

// ─── 来宾 Agent：从人格网络邀请进圆桌的社区成员 ───
export interface GuestAgent {
  id: string;
  name: string;
  mbti: string;
  role: string;
  gives: string[];
  intro: string;
  avatarVariant?: string; // 社区固定成员的手绘形象
}

const GUEST_HUES = ["#89AACC", "#A78BFA", "#7BC496", "#E8C86A"];

function guestHue(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return GUEST_HUES[Math.abs(h) % GUEST_HUES.length];
}

export async function guestReply(
  g: GuestAgent,
  userText: string,
  transcript: string,
): Promise<string> {
  const llm = getLLM();
  if (llm.isRemote) {
    try {
      const raw = await llm.complete(
        `你在「内心圆桌」作客。你的身份：${g.name}，${g.mbti} · ${g.role}。自我介绍：${g.intro}。你能提供的：${g.gives.join("、")}。以你的性格和视角对 TA 刚说的话简短回应（60 字内），自然带出你的专长，保持角色，不提「AI」。`,
        `${transcript}\nTA：${userText}`,
        30_000,
        "deepseek-chat",
      );
      if (raw) return raw.trim();
    } catch {
      // 降级
    }
  }
  return `从${g.role}的角度看，关键是先想清楚你要什么。这个我可以帮你具体梳理。`;
}

// ─── Orchestrator：一条用户消息 → 圆桌响应 ───
export interface ICReply {
  primary: RoleKey;
  secondary: RoleKey | null;
  messages: Array<{ roleKey: string; name?: string; hue?: string; text: string }>;
  emotions: EmotionScore[];
  need: string;
  newMemories: ICMemory[];
}

export async function orchestrator(
  userText: string,
  history: ICMessage[],
  ctx: {
    profile: UserProfile;
    persona: Persona;
    memories: ICMemory[];
    specified: RoleKey[];
    muted: string[];
    guests?: GuestAgent[];
    mode?: "auto" | "all"; // all = 全员一起讨论
  },
): Promise<ICReply> {
  if (detectCrisis(userText)) {
    return {
      primary: "mother",
      secondary: null,
      messages: [{ roleKey: "mother", text: CRISIS_RESPONSE }],
      emotions: [{ label: "sadness", score: 0.9 }],
      need: "专业支持",
      newMemories: [],
    };
  }

  let analysis: ICAnalysis;
  const llm = getLLM();
  if (llm.isRemote) {
    try {
      analysis = await remoteAnalyze(userText, ctx.specified, ctx.muted, ctx.profile);
    } catch {
      analysis = localAnalyze(userText, ctx.specified);
    }
  } else {
    analysis = localAnalyze(userText, ctx.specified);
  }

  // 记忆兜底：分析引擎没提取到，但消息里有持久模式表达时，本地补一条 observed
  if (analysis.newFacts.length === 0) {
    const m = userText.match(/我(总是|经常|从小就|一直)[^，。！？]{2,24}|我(害怕|不敢)[^，。！？]{2,24}/);
    if (m) {
      analysis.newFacts.push({ content: m[0].slice(0, 36), kind: "observed" });
    }
  }

  // 角色评分：需求 + 情绪 + 用户指定（覆盖）；静音角色排除
  const score = (r: RoleKey): number => {
    if (ctx.muted.includes(r)) return -1;
    if (ctx.specified.includes(r)) return 10 + (ctx.specified.length - ctx.specified.indexOf(r)) * 0.01;
    let s = 0.3;
    s += analysis.needs.validation * (r === "mother" || r === "child" ? 0.6 : 0.1);
    s += analysis.needs.companionship * (r === "friend" || r === "mother" ? 0.55 : 0.1);
    s += analysis.needs.analysis * (r === "mentor" ? 0.6 : 0.05);
    s += analysis.needs.action * (r === "mentor" || r === "future" ? 0.4 : 0.05);
    const neg = analysis.emotions.filter((e) => ["sadness", "fear", "loneliness", "shame"].includes(e.label));
    if (neg.length) s += r === "mother" || r === "child" ? 0.35 * neg[0].score : 0;
    if (analysis.emotions.some((e) => ["excitement", "calm"].includes(e.label)))
      s += r === "friend" ? 0.3 : 0.05;
    if (r === "future" && /未来|十年|长期|方向|人生/.test(userText)) s += 0.5;
    return s;
  };
  const ranked = ROLE_ORDER.filter((r) => !ctx.muted.includes(r)).sort((a, b) => score(b) - score(a));
  const pool = ctx.specified.length ? ranked.filter((r) => ctx.specified.includes(r)) : ranked;
  const primary = pool[0] ?? "friend";
  // 用户指定角色时：由选中的成员依次发言，不触发自动副发言
  const secondary = ctx.specified.length
    ? null
    : analysis.secondary && analysis.secondary !== primary && !ctx.muted.includes(analysis.secondary)
      ? analysis.secondary
      : score(ranked[1]) - score(primary) < 0.12 ? null : ranked[1];

  const messages: Array<{ roleKey: string; name?: string; hue?: string; text: string }> = [];
  let primaryText = "";
  if (llm.isRemote) {
    try {
      primaryText = await roleReply(primary, userText, history, ctx.profile, ctx.persona, ctx.memories, analysis);
    } catch {
      primaryText = localRoleReply(primary, userText, ctx.memories);
    }
  } else {
    primaryText = localRoleReply(primary, userText, ctx.memories);
  }
  messages.push({ roleKey: primary, text: primaryText });

  // 指定多位成员：他们依次加入讨论
  if (ctx.specified.length > 1) {
    const others = ctx.specified.slice(1).filter((r) => r !== primary && !ctx.muted.includes(r));
    const rest = await Promise.all(
      others.map((r) =>
        llm.isRemote
          ? roleReply(r, userText, history, ctx.profile, ctx.persona, ctx.memories, analysis).catch(() =>
              localRoleReply(r, userText, ctx.memories),
            )
          : Promise.resolve(localRoleReply(r, userText, ctx.memories)),
      ),
    );
    others.forEach((r, i) => messages.push({ roleKey: r, text: rest[i] }));
  }

  // 全员讨论模式：其余在场角色按各自视角依次发言（并行生成）
  if (ctx.mode === "all" && ctx.specified.length === 0) {
    const others = ROLE_ORDER.filter((r) => r !== primary && !ctx.muted.includes(r));
    const rest = await Promise.all(
      others.map((r) =>
        llm.isRemote
          ? roleReply(r, userText, history, ctx.profile, ctx.persona, ctx.memories, analysis).catch(() =>
              localRoleReply(r, userText, ctx.memories),
            )
          : Promise.resolve(localRoleReply(r, userText, ctx.memories)),
      ),
    );
    others.forEach((r, i) => messages.push({ roleKey: r, text: rest[i] }));
  }

  // 来宾 Agent（从人格网络邀请进圆桌的成员）：自动模式轮换一位；全员模式全部发言；指定 IC 角色时静默
  const guests = (ctx.guests ?? []).filter((g) => !ctx.muted.includes(g.id));
  if (guests.length && ctx.specified.length === 0) {
    const userTurns = history.filter((m) => m.roleKey === "user").length;
    const speakers = ctx.mode === "all" ? guests : [guests[userTurns % guests.length]];
    const transcript = history
      .slice(-8)
      .map((m) => `${m.roleKey === "user" ? "TA" : "圆桌"}：${m.text}`)
      .join("\n");
    for (const g of speakers) {
      const text = await guestReply(g, userText, transcript);
      messages.push({ roleKey: g.id, name: g.name, text, hue: guestHue(g.id) });
    }
  }

  if (secondary) {
    try {
      const def = IC_ROLES[secondary];
      const supplement = await llm.complete(
        `${def.persona}\n圆桌上「${IC_ROLES[primary].label}」刚说完话。你简短地补充一句你的视角（不超过 40 字），不重复 TA 说的内容。`,
        `TA 说：「${userText}」`,
        30_000,
        "deepseek-chat",
      );
      if (supplement) messages.push({ roleKey: secondary, text: supplement.trim() });
    } catch {
      // 副发言失败可忽略
    }
  }

  // 记忆写回：observed 待确认，explicit 直接入库
  const newMemories: ICMemory[] = analysis.newFacts.map((f, i) => ({
    id: `icm-${Date.now()}-${i}`,
    content: f.content,
    kind: f.kind,
    roles: [primary],
    confidence: f.kind === "explicit" ? 0.9 : 0.5,
    source: userText.slice(0, 30),
    at: Date.now(),
  }));

  const needLabel =
    Object.entries(analysis.needs).sort((a, b) => b[1] - a[1])[0]?.[0] === "validation" ? "被理解"
    : Object.entries(analysis.needs).sort((a, b) => b[1] - a[1])[0]?.[0] === "analysis" ? "分析"
    : Object.entries(analysis.needs).sort((a, b) => b[1] - a[1])[0]?.[0] === "companionship" ? "陪伴" : "行动";

  return { primary, secondary, messages, emotions: analysis.emotions, need: needLabel, newMemories };
}

// ─── 决策空间（情绪→理解→认知→决策→行动 的沉淀） ───
export async function buildDecisionSpace(
  history: ICMessage[],
): Promise<DecisionSpace> {
  const llmDS = getLLM();
  const fallback: DecisionSpace = {
    want: "还没有足够信息——多聊聊，圆桌会帮你整理。",
    fear: "待观察",
    facts: [], risks: [], options: [], next: [],
  };
  if (!llmDS.isRemote || history.length < 4) return fallback;
  try {
    const transcript = history.map((m) => `${m.roleKey === "user" ? "TA" : "圆桌"}：${m.text}`).join("\n");
    const raw = await llmDS.complete(
      `根据这段圆桌对话，为 TA 整理「决策空间」。只输出 JSON：{"want":"TA 真正想要的","fear":"TA 害怕的","facts":["已知事实"],"risks":["风险"],"options":["可选方案"],"next":["下一步行动"]}。中文，每条 25 字内。`,
      transcript.slice(-2400),
      45_000,
      "deepseek-chat",
    );
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const s = cleaned.indexOf("{"), e = cleaned.lastIndexOf("}");
    const d = JSON.parse(cleaned.slice(s, e + 1));
    return {
      want: String(d.want ?? fallback.want),
      fear: String(d.fear ?? ""),
      facts: Array.isArray(d.facts) ? d.facts.map(String) : [],
      risks: Array.isArray(d.risks) ? d.risks.map(String) : [],
      options: Array.isArray(d.options) ? d.options.map(String) : [],
      next: Array.isArray(d.next) ? d.next.map(String) : [],
    };
  } catch {
    return fallback;
  }
}

// ─── 进入时的角色推荐 ───
export function recommendRole(
  memories: ICMemory[],
  moods: { mood: string }[],
): { role: RoleKey; reason: string } {
  const lastMood = moods[0]?.mood ?? "";
  if (/疲惫|累|低落/.test(lastMood)) {
    return { role: "mother", reason: `你最近记录的心情是「${lastMood}」——今晚也许需要一个不用你操心的地方。` };
  }
  if (/迷茫|焦虑/.test(lastMood)) {
    return { role: "mentor", reason: `「${lastMood}」往往是因为选项太多。导师可以帮你把问题拆开。` };
  }
  const confirmed = memories.filter((m) => m.kind === "confirmed")[0];
  if (confirmed) {
    return { role: "friend", reason: `你之前确认过「${confirmed.content.slice(0, 18)}」——朋友也许想听听最近怎么样。` };
  }
  return { role: "friend", reason: "柔和的陪伴永远是好的开始——先和朋友聊聊最近的状态。" };
}
