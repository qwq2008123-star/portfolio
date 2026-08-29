import type { Persona, UserProfile } from "../types";
import { getLLM, personaContext } from "./llm";

// ─── AI 人生多维决策模拟器 ───
// 理念：不是预测未来，而是基于人格/目标/资源/情绪模拟「不同选择之后的人生路径」。
// 优先走 DeepSeek 生成深度 JSON 模拟；超时或未配置时降级为本地推演引擎（同结构、按领域定制）。

export type DimKey =
  | "career" | "finance" | "ability" | "family" | "social"
  | "love" | "emotion" | "lifestyle" | "opportunity" | "riskCost";

export const DIM_META: Array<{ key: DimKey; title: string; icon: string }> = [
  { key: "career", title: "事业 / 学业", icon: "◆" },
  { key: "finance", title: "财务", icon: "◈" },
  { key: "ability", title: "能力成长", icon: "✦" },
  { key: "family", title: "家庭关系", icon: "⌂" },
  { key: "social", title: "朋友 / 社会评价", icon: "◍" },
  { key: "love", title: "恋爱 / 亲密关系", icon: "♡" },
  { key: "emotion", title: "情绪 / 心理", icon: "☾" },
  { key: "lifestyle", title: "生活方式", icon: "◑" },
  { key: "opportunity", title: "机会与收益", icon: "↑" },
  { key: "riskCost", title: "风险与代价", icon: "⚠" },
];

export interface SimEventChoice { label: string; outcome: string }
export interface SimEvent {
  time: string;
  kind: "warning" | "good" | "decision";
  title: string;
  choices: SimEventChoice[];
}
export interface RiskItem { risk: string; cause: string; signal: string; solution: string }
export interface LifeStage { period: string; name: string; keywords: string[]; desc: string }
export interface RouteAxes { opportunity: number; growth: number; risk: number; stress: number; freedom: number }
export interface FutureScenario { tone: "optimistic" | "baseline" | "stress"; label: string; desc: string }

export interface SimRoute {
  id: string;
  name: string;
  summary: string;
  axes: RouteAxes;
  dims: Record<DimKey, string[]>;
  financePrep: string[];
  abilityCore: string;
  events: SimEvent[];
  futures: FutureScenario[];
  risks: RiskItem[];
  butterfly: string[];
  lifeMap: LifeStage[];
  actions: { now: string[]; verify: string[]; stopLoss: string[]; d30: string[]; d90: string[] };
}

export interface SimResult {
  question: string;
  understanding: string;
  routes: SimRoute[];
  by: "remote" | "local";
  createdAt: number;
}

// ─── 领域识别 ───
export type Domain =
  | "创业" | "考研" | "出国" | "辞职换工作" | "换城市"
  | "感情" | "自由职业" | "转专业" | "休学" | "买房" | "通用";

export function detectDomain(q: string): Domain {
  if (/创业|开公司|startup|合伙/i.test(q)) return "创业";
  if (/考研|读研|读博|申研|升学/.test(q)) return "考研";
  if (/出国|留学|移民/.test(q)) return "出国";
  if (/辞职|跳槽|换工作|离职|裸辞/.test(q)) return "辞职换工作";
  if (/换城市|搬家|去.{0,4}(发展|生活)|北漂|沪漂|深漂/.test(q)) return "换城市";
  if (/感情|恋爱|分手|表白|结婚|这段感情/.test(q)) return "感情";
  if (/自由职业|独立开发|接单|soho|数字游民/i.test(q)) return "自由职业";
  if (/转专业|转行/.test(q)) return "转专业";
  if (/休学|gap|间隔年/i.test(q)) return "休学";
  if (/买房|购房|房子/.test(q)) return "买房";
  return "通用";
}

// ─── DeepSeek 深度生成 ───
const SYSTEM_PROMPT = `你是一个「人生多维决策模拟引擎」。用户会提出一个人生选择问题，你要基于 TA 的人格、目标、能力、资源、情绪和现实条件，模拟不同选择可能产生的人生路径。

核心原则：
- 不给"成功概率"这种伪精确数字，改用「乐观 / 基准 / 压力」三种情景
- 不替用户做决定，而是让 TA 看见不同选择背后的机会、风险、代价、关系变化和成长
- 内容要具体、有真实感：家庭维度要写出家人可能说的话；情绪维度要模拟成功前和失败后的心理；财务维度要给出可执行的准备动作
- 全部用中文，每条内容不超过 45 个字

只输出 JSON（不要 markdown 代码块，不要解释），结构如下：
{
  "understanding": "2-3 句话，描述你对用户当前状态的理解（结合 TA 的档案）",
  "routes": [
    {
      "name": "路线 A · 全职创业",
      "summary": "一句话概括这条路线",
      "axes": {"opportunity": 80, "growth": 70, "risk": 60, "stress": 75, "freedom": 85},
      "dims": {
        "career": ["2-4 条：职业/学业变化、机会、关键节点、可能遇到的重大选择"],
        "finance": ["2-4 条：收入、支出、现金流、储蓄、财务压力、财富上限、最坏情况"],
        "ability": ["2-4 条：会被迫获得什么能力，哪些能力是未来 3-5 年核心竞争力"],
        "family": ["2-4 条：家人的担忧（写出他们可能说的话）、压力来源、如何沟通、如何降低冲突"],
        "social": ["2-4 条：朋友劝说、同龄人比较、孤独感、如何建立自己的价值判断"],
        "love": ["2-4 条：陪伴时间、情绪与收入变化对关系的影响、冲突与解决方案"],
        "emotion": ["2-4 条：成功之前经历什么、失败之后经历什么、各阶段情绪曲线"],
        "lifestyle": ["2-4 条：时间自由度、工作时长、城市、社交圈、生活节奏的变化"],
        "opportunity": ["2-4 条：如果成功可能获得什么——收入上限、自主权、事业、人脉、掌控感"],
        "riskCost": ["2-4 条：最大风险、隐性风险、机会成本、失败之后怎么办"]
      },
      "financePrep": ["2-3 条：选择这条路线前应提前准备的财务动作（储备金额、成本控制、止损线）"],
      "abilityCore": "一句话：未来 3-5 年的核心竞争力",
      "events": [
        {"time": "第 8 个月", "kind": "warning|good|decision", "title": "关键事件", "choices": [{"label": "A · 选项", "outcome": "可能结果"}, {"label": "B · 选项", "outcome": "可能结果"}]}
      ],
      "futures": [
        {"tone": "optimistic", "label": "乐观路线", "desc": "条件成立后可能发生什么"},
        {"tone": "baseline", "label": "基准路线", "desc": "按目前条件最可能出现的情景"},
        {"tone": "stress", "label": "压力路线", "desc": "关键条件没有满足时可能发生什么"}
      ],
      "risks": [
        {"risk": "风险名", "cause": "为什么会发生", "signal": "预警信号", "solution": "解决方案"}
      ],
      "butterfly": ["5-7 步的连锁反应，第 1 步是这个决定本身，后面每步是它引发的一个维度变化"],
      "lifeMap": [
        {"period": "0～1 年", "name": "验证期", "keywords": ["学习", "试错"], "desc": "这个阶段的你可能是什么状态"}
      ],
      "actions": {
        "now": ["2-3 条现在就应该做的事"],
        "verify": ["2-3 条做决定前建议先验证的事"],
        "stopLoss": ["1-2 条止损线"],
        "d30": ["1-2 条未来 30 天行动"],
        "d90": ["1-2 条未来 90 天行动"]
      }
    }
  ]
`;

function coerceNum(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : fallback;
}

function strArray(v: unknown, fallback: string[]): string[] {
  if (!Array.isArray(v)) return fallback;
  const arr = v.map((x) => String(x).trim()).filter(Boolean);
  return arr.length ? arr : fallback;
}

function parseJsonLoose(raw: string): unknown {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no json");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function remoteSimulate(
  question: string,
  profile: UserProfile,
  persona: Persona,
): Promise<SimResult> {
  const llm = getLLM();
  const user = `用户的问题：「${question}」\n\n${personaContext(profile, persona)}\n当前身份：${profile.occupation}；目标：${profile.goals}；梦想：${profile.dream}\n\n请生成 2-4 条不同的人生路线，并按 schema 输出 JSON。`;
  const raw = await llm.complete(SYSTEM_PROMPT, user, 90_000);
  if (!raw) throw new Error("empty response");

  const data = parseJsonLoose(raw) as Record<string, unknown>;
  const rawRoutes = Array.isArray(data.routes) ? data.routes : [];
  if (rawRoutes.length < 2) throw new Error("routes < 2");

  const routes: SimRoute[] = rawRoutes.slice(0, 4).map((r, i) => {
    const rr = r as Record<string, unknown>;
    const axes = (rr.axes ?? {}) as Record<string, unknown>;
    const dims = (rr.dims ?? {}) as Record<string, unknown>;
    const dim = (key: DimKey, fallback: string[]) => strArray(dims[key], fallback);
    const actions = (rr.actions ?? {}) as Record<string, unknown>;
    const events = (Array.isArray(rr.events) ? rr.events : []).map((e, j) => {
      const ee = e as Record<string, unknown>;
      const kind = ["warning", "good", "decision"].includes(String(ee.kind))
        ? (String(ee.kind) as SimEvent["kind"])
        : j % 2 === 0 ? "warning" : "good";
      const choices = (Array.isArray(ee.choices) ? ee.choices : []).map((c) => {
        const cc = c as Record<string, unknown>;
        return { label: String(cc.label ?? "选项"), outcome: String(cc.outcome ?? "") };
      });
      return {
        time: String(ee.time ?? `节点 ${j + 1}`),
        kind,
        title: String(ee.title ?? ""),
        choices: choices.length ? choices : [{ label: "A · 顺其自然", outcome: "结果取决于执行质量" }],
      };
    });
    const futures = (Array.isArray(rr.futures) ? rr.futures : []).slice(0, 3).map((f) => {
      const ff = f as Record<string, unknown>;
      const tone = ["optimistic", "baseline", "stress"].includes(String(ff.tone))
        ? (String(ff.tone) as FutureScenario["tone"])
        : "baseline";
      return { tone, label: String(ff.label ?? "情景"), desc: String(ff.desc ?? "") };
    });
    const risks = (Array.isArray(rr.risks) ? rr.risks : []).map((rk) => {
      const kk = rk as Record<string, unknown>;
      return {
        risk: String(kk.risk ?? "风险"),
        cause: String(kk.cause ?? ""),
        signal: String(kk.signal ?? ""),
        solution: String(kk.solution ?? ""),
      };
    });
    const lifeMap = (Array.isArray(rr.lifeMap) ? rr.lifeMap : []).map((l) => {
      const ll = l as Record<string, unknown>;
      return {
        period: String(ll.period ?? ""),
        name: String(ll.name ?? ""),
        keywords: strArray(ll.keywords, []),
        desc: String(ll.desc ?? ""),
      };
    });
    // 兜底：不足 4 段时补齐 5～10 年的人生结构变化
    if (lifeMap.length < 4) {
      lifeMap.push({
        period: "5～10 年",
        name: "人生结构变化",
        keywords: ["财富", "事业", "家庭", "城市", "价值观"],
        desc: "10 年后的你不一定只是成功或失败——而是这条路把你塑造成了一个什么样的人",
      });
    }
    const acts = {
      now: strArray(actions.now, []),
      verify: strArray(actions.verify, []),
      stopLoss: strArray(actions.stopLoss, []),
      d30: strArray(actions.d30, []),
      d90: strArray(actions.d90, []),
    };

    return {
      id: `r-${i}`,
      name: String(rr.name ?? `路线 ${"ABCD"[i]}`),
      summary: String(rr.summary ?? ""),
      axes: {
        opportunity: coerceNum(axes.opportunity, 60),
        growth: coerceNum(axes.growth, 60),
        risk: coerceNum(axes.risk, 50),
        stress: coerceNum(axes.stress, 50),
        freedom: coerceNum(axes.freedom, 50),
      },
      dims: {
        career: dim("career", []), finance: dim("finance", []), ability: dim("ability", []),
        family: dim("family", []), social: dim("social", []), love: dim("love", []),
        emotion: dim("emotion", []), lifestyle: dim("lifestyle", []),
        opportunity: dim("opportunity", []), riskCost: dim("riskCost", []),
      },
      financePrep: strArray(rr.financePrep, []),
      abilityCore: String(rr.abilityCore ?? ""),
      events,
      futures,
      risks,
      butterfly: strArray(rr.butterfly, []),
      lifeMap,
      actions: acts,
    } satisfies SimRoute;
  });

  return {
    question,
    understanding: String(data.understanding ?? ""),
    routes,
    by: "remote",
    createdAt: Date.now(),
  };
}

// ─── 本地推演引擎（按领域定制的结构化模板，无 API Key 也可用） ───

const AXIS = (opportunity: number, growth: number, risk: number, stress: number, freedom: number): RouteAxes =>
  ({ opportunity, growth, risk, stress, freedom });

function butterflyFor(subject: string, hops: string[]): string[] {
  return [
    `做出「${subject}」的决定`,
    ...hops,
    `3-5 年后：你会成为一个在「${subject}」上有真实掌控力的人——无论结果是否符合最初的想象`,
  ];
}

function genericRoutes(subject: string, domain: Domain): SimRoute[] {
  const isEmotion = domain === "感情";
  const routeTpls: Array<{
    name: string; summary: string; axes: RouteAxes;
    dimOverrides: Partial<Record<DimKey, string[]>>;
  }> = isEmotion
    ? [
        {
          name: "路线 A · 认真经营这段感情",
          summary: "投入时间与沟通，把关系当作需要「共同维护的项目」。",
          axes: AXIS(70, 55, 45, 50, 40),
          dimOverrides: {
            love: ["陪伴时间固定下来，关系进入深度磨合期", "冲突从「谁对谁错」转向「怎么解决问题」"],
            family: ["双方家庭开始更认真地看待这段关系", "家人的意见会变多，但决定权在你们手里"],
          },
        },
        {
          name: "路线 B · 设定一个期限，坦诚谈一次",
          summary: "把核心分歧摆上桌面，约定一个共同评估的时间点。",
          axes: AXIS(60, 65, 40, 65, 50),
          dimOverrides: {
            love: ["短期可能爆发激烈冲突，但问题被真正摊开", "期限带来确定性，减少长期内耗"],
            emotion: ["谈话前焦虑达到峰值，之后无论结果如何都会解脱", "你会学会「在关系中表达需求」这个关键技能"],
          },
        },
        {
          name: "路线 C · 体面分开",
          summary: "承认不合适，把这段关系变成对自己的更深入了解。",
          axes: AXIS(40, 70, 25, 55, 70),
          dimOverrides: {
            love: ["分手后的孤独感在前 1-2 个月最强烈", "你会更清楚下一段关系里自己真正要什么"],
            social: ["需要向共同朋友解释，之后社交圈自然更替"],
          },
        },
      ]
    : [
        {
          name: `路线 A · 全力投入${subject}`,
          summary: `把主要时间和资源押在${subject}上，用最快速度换取深度经验。`,
          axes: AXIS(82, 85, 78, 76, 80),
          dimOverrides: {},
        },
        {
          name: `路线 B · 小步验证${subject}`,
          summary: `不改变主线生活，用业余时间低成本试错，验证可行后再加码。`,
          axes: AXIS(62, 58, 35, 45, 55),
          dimOverrides: {},
        },
        {
          name: `路线 C · 暂缓${subject}，先积累条件`,
          summary: "先补齐资金、能力或时机上的缺口，把选择权留在手里。",
          axes: AXIS(45, 42, 18, 30, 40),
          dimOverrides: {},
        },
      ];

  const mk = (tpl: (typeof routeTpls)[number], i: number): SimRoute => {
    const X = subject;
    const allIn = tpl.name.includes("全力");
    const cautious = tpl.name.includes("暂缓") || tpl.name.includes("分开") || tpl.name.includes("期限");
    return {
      id: `l-${i}`,
      name: tpl.name,
      summary: tpl.summary,
      axes: tpl.axes,
      dims: {
        career: tpl.dimOverrides.career ?? [
          allIn ? `${X}相关的履历会快速建立，但早期缺少背书` : `${X}的进展会慢于全力投入，但主线风险更低`,
          allIn ? "关键节点：前 6-12 个月能否拿出可验证的成果" : "关键节点：验证期结束时决定是否加码",
          "可能遇到的重大选择：出现初步成果时，是否追加投入",
        ],
        finance: tpl.dimOverrides.finance ?? [
          cautious ? "财务基本不受影响，用存量资源推进" : allIn ? "投入期收入可能下降甚至为负" : "投入可控，但注意隐性成本（时间也是钱）",
          allIn ? "相关支出增加：工具、学习、迁移成本" : "建议为每次验证设置预算上限",
          allIn ? "最坏情况：储备消耗，但经验完整保留" : "财富上限取决于验证结果",
        ],
        ability: tpl.dimOverrides.ability ?? [
          `被迫快速学习${X}所需的核心技能`,
          "获取反馈、自我管理、在不确定中决策的能力被放大",
          cautious ? "耐心与资源规划能力是隐藏的收获" : "试错和复盘会形成你自己的方法论",
        ],
        family: tpl.dimOverrides.family ?? [
          `父母的典型担忧：「${X}不稳定」「失败了怎么办」「能不能养活自己」`,
          "反对的背后是对确定性的关心，而不是不爱你",
          "降低冲突：用小成果和阶段性计划沟通，而不是只谈想法",
          "邀请他们提问，比试图说服他们更有效",
        ],
        social: tpl.dimOverrides.social ?? [
          "会有朋友劝你「稳妥一点」，这是他们价值观的诚实表达",
          "同龄人比较带来的落差感，在别人升职加薪的节点最明显",
          "非主流路径早期的孤独感是常态，找同路人比说服所有人重要",
          "坚持下去，你会逐渐建立自己的价值判断，不再依赖外界评价",
        ],
        love: tpl.dimOverrides.love ?? [
          "陪伴时间和情绪稳定性可能下降，这会被伴侣最先感知到",
          "伴侣的担忧多来自安全感的变化，而不是不支持你",
          "提前同步节奏与财务安排，保留固定的高质量陪伴时间",
        ],
        emotion: tpl.dimOverrides.emotion ?? [
          "成功之前：兴奋 → 怀疑 → 焦虑 → 小突破带来掌控感，这个循环会反复出现",
          "受挫之后：自我怀疑和羞耻感是正常反应，别在情绪低谷做重大决定",
          `把「我选择了${X}」重新定义为「我在验证 ${X}」，焦虑会明显下降`,
        ],
        lifestyle: tpl.dimOverrides.lifestyle ?? [
          allIn ? "时间自由度提高，但总投入可能比上班更长——自由的悖论" : "生活节奏基本不变，新增投入需要挤压娱乐时间",
          "社交圈会慢慢向「同路人」更替",
          "生活节奏从「被安排」变成「自己安排」，对自律的要求陡增",
        ],
        opportunity: tpl.dimOverrides.opportunity ?? [
          `${X}跑通后的收入与选择权上限明显提高`,
          "建立属于自己履历/事业的可能性",
          "人脉质量提升：认识的人从同事变成同路人和前辈",
          "更重要的收益是人生掌控感",
        ],
        riskCost: tpl.dimOverrides.riskCost ?? [
          "最大风险：投入 1-2 年后未达预期，需要面对沉没成本",
          "隐性风险：机会成本——同期主线上的晋升/积累窗口",
          "最坏情况之后：经验仍可迁移，重新进入主线的成本比想象中低",
        ],
      },
      financePrep: cautious
        ? [`列出推进${X}的月度预算上限`, "不动用应急储蓄"]
        : [
            "列出未来 12 个月固定支出，算清现金流 Runway",
            `给${X}设预算上限与止损线，写下来`,
            "预留 6-12 个月生活储备，不动用应急部分",
          ],
      abilityCore: allIn
        ? `在${X}上拿到真实结果的能力 + 在不确定中做决策的判断力`
        : "快速验证与复盘的能力——无论这条路走不走通都会增值",
      events: [
        {
          time: "第 1-2 个月", kind: "warning" as const, title: "新鲜感消退，进入枯燥的执行期",
          choices: [
            { label: "A · 降低标准，保持最小行动节奏", outcome: "大概率穿过低谷期，习惯开始成型" },
            { label: "B · 暂时搁置，等状态好了再说", outcome: "计划停滞，之后重启的心理成本更高" },
            { label: "C · 公开承诺或找人组队", outcome: "外部约束帮你熬过适应期" },
          ],
        },
        {
          time: "第 6 个月", kind: "warning" as const, title: `第一个瓶颈：${X}的进展明显放缓`,
          choices: [
            { label: "A · 调整方法继续推进", outcome: "方法迭代后通常会出现第二波增长" },
            { label: "B · 判断方向错误，考虑更换路径", outcome: "若确有更好的方向，及时止损也是一种赢" },
            { label: "C · 暂停并做一次完整复盘", outcome: "慢一点，但决策质量更高" },
          ],
        },
        {
          time: "第 12 个月", kind: "warning" as const, title: "身边开始出现质疑的声音",
          choices: [
            { label: "A · 用阶段性成果回应，不争论", outcome: "注意力留在事情上，关系压力逐渐消化" },
            { label: "B · 反复向所有人辩解", outcome: "消耗大量情绪能量，进展停滞" },
          ],
        },
        {
          time: "第 18 个月", kind: "good" as const, title: "第一次看到真实成果",
          choices: [
            { label: "A · 乘势加大投入", outcome: "进入加速期，但风险随之上升" },
            { label: "B · 保持现有节奏", outcome: "稳健，但可能错过窗口" },
          ],
        },
        {
          time: "第 2 年", kind: "decision" as const, title: `是否全面投入${X}`,
          choices: [
            { label: "A · 全押", outcome: "上限最高，需要储备和止损线兜底" },
            { label: "B · 维持双轨", outcome: "增长慢但抗风险强" },
            { label: "C · 收手止损", outcome: "把两年经验带回主线，并不算失败" },
          ],
        },
      ],
      futures: [
        { tone: "optimistic", label: "🟢 乐观路线", desc: `关键条件成立（资金充足 + 方法对 + 支持系统在）：${X}在 1-2 年内拿出可见成果，进入正循环` },
        { tone: "baseline", label: "🟡 基准路线", desc: `按目前条件最可能的情况：进展比预期慢 30-50%，中途至少经历 2 次想放弃，第 2 年初步站稳` },
        { tone: "stress", label: "🔴 压力路线", desc: `关键条件缺失（储备耗尽 / 家里强烈反对 / 遇到瓶颈放弃）：回到主线，但带着完整的经验和更清晰的自我认知` },
      ],
      risks: [
        { risk: "半途而废", cause: "目标太大、反馈太慢", signal: "连续两周没有任何最小行动", solution: "把目标拆到周，用打卡或同伴建立外部约束" },
        { risk: "财务失血", cause: "没有算清 Runway 就开始投入", signal: "储蓄低于 6 个月固定支出", solution: "预设止损线：储蓄触及红线即暂停或收缩" },
        { risk: "关系紧张", cause: "家人缺乏信息与参与感", signal: "开始回避和家人谈进展", solution: "每月同步一次小成果，主动邀请他们提问" },
        { risk: "方向判断错误", cause: "闭门造车，缺少真实反馈", signal: "迟迟拿不出可以给别人看的东西", solution: "每 4 周做一次对外验证，让现实而不是直觉投票" },
      ],
      butterfly: butterflyFor(X, [
        "每天的时间结构被重新分配，学习和产出成为常态",
        "能力半径扩大，开始接到以前接不到的机会",
        "社交圈更替：聊得来的人变成同路人",
        "财务结构变化：从「工资思维」过渡到「资源思维」",
        "家人从担忧转为观望，再到部分认可",
        "职业选择权增加：你开始挑选机会，而不是被机会挑选",
      ]),
      lifeMap: [
        { period: "0～1 年", name: "验证期", keywords: ["学习", "试错", "现金流", "怀疑"], desc: "你会频繁怀疑自己，同时第一次感受到「为自己做决定」的踏实感" },
        { period: "1～3 年", name: "成长 / 淘汰期", keywords: ["增长", "团队", "转型", "压力"], desc: "方法成型的人进入增长，只靠热情的人大多在这里退出" },
        { period: "3～5 年", name: "分叉期", keywords: ["扩大", "盈利", "转型", "重启"], desc: "可能走向：A. 成功扩大 B. 稳定经营 C. 转型相邻方向 D. 带着经验重新开始" },
        { period: "5～10 年", name: "人生结构变化", keywords: ["财富", "事业", "家庭", "城市", "价值观"], desc: `10 年后的你不一定只是成功或失败——而是${X}把你塑造成了一个什么样的人` },
      ],
      actions: {
        now: [
          `写下你选择${X}的三条理由和三条担忧`,
          "盘点时间 / 资金 / 技能三类资源，量化可投入量",
          "约一个已经做过这件事的人聊 30 分钟",
        ],
        verify: [
          "用 2 周做一次最小成本的真实尝试，而不是继续想",
          "问 3 个目标相关的人拿真实反馈",
          "确认家庭支持与财务两条底线是否成立",
        ],
        stopLoss: [
          "资金线：动用储备不超过 6 个月固定支出",
          "时间线：6 个月无可验证进展即启动完整复盘",
        ],
        d30: ["完成一次真实世界的验证动作", "建立每周固定投入时段", "和家人做一次正式沟通"],
        d90: ["拿出第一个可对外展示的成果", "复盘并决定：加注 / 调整 / 暂停"],
      },
    } satisfies SimRoute;
  };

  return routeTpls.map(mk);
}

const DOMAIN_SUBJECT: Record<Domain, string> = {
  创业: "创业", 考研: "考研", 出国: "出国留学", 辞职换工作: "换一份工作", 换城市: "换城市",
  感情: "这段感情", 自由职业: "自由职业", 转专业: "转专业", 休学: "休学调整", 买房: "买房", 通用: "这个选择",
};

function localSimulate(question: string, profile: UserProfile, persona: Persona): SimResult {
  const domain = detectDomain(question);
  const subject =
    question.replace(/我要不要|我该不该|要不要|该不该|是否应该|是否|应该|我觉得|现在|？|\?/g, "").trim() ||
    DOMAIN_SUBJECT[domain];

  const understanding = `${profile.name || "你"}现在是${profile.occupation || "过渡期"}，目标指向「${profile.goals || "成长"}」，人格画像显示你是${persona.archetype}。这个决定之所以纠结，是因为它同时牵动事业、财务和身边人的期待——下面把每条路线的人生摊开给你看。`;

  const routes = genericRoutes(subject, domain);
  return { question, understanding, routes, by: "local", createdAt: Date.now() };
}

// ─── 对外入口：优先 DeepSeek，失败降级本地 ───
export async function simulateDeep(
  question: string,
  profile: UserProfile,
  persona: Persona,
): Promise<SimResult> {
  const llm = getLLM();
  if (llm.isRemote) {
    try {
      return await remoteSimulate(question, profile, persona);
    } catch {
      // 超时 / 格式异常 → 本地推演兜底
    }
  }
  return localSimulate(question, profile, persona);
}
