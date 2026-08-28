// ─── AI Life OS — 核心类型定义 ───

export interface UserProfile {
  name: string;
  age: number;
  occupation: string;
  interests: string[];
  personality: string;
  mbti: string;
  experiences: string;
  goals: string;
  dream: string;
  createdAt: number;
  updatedAt: number;
}

export interface PersonaTrait {
  label: string;
  score: number; // 0-100
}

export interface Persona {
  archetype: string; // 例如「探索型创造者」
  tagline: string;
  traits: PersonaTrait[]; // 创造力/执行力/学习力/社交力/抗压性/自律
  strengths: string[];
  risks: string[];
  thinkingStyle: string;
  habits: string[];
  values: string[];
  completion: number; // 人格模型完善度 0-100，随使用增长
  updatedAt: number;
}

export type Horizon = "3" | "5" | "10";

export interface YearProjection {
  career: string;
  ability: string;
  income: string;
}

export interface FutureRoute {
  id: string;
  name: string;
  summary: string;
  successRate: number; // 0-100
  years: Record<Horizon, YearProjection>;
  risks: string[];
  problems: string[];
}

export type DecisionCategory =
  | "考研"
  | "创业"
  | "换工作"
  | "换城市"
  | "学习技能"
  | "坚持项目"
  | "通用";

export interface DecisionReport {
  id: string;
  question: string;
  category: DecisionCategory;
  analysis: string;
  strengths: string[];
  risks: string[];
  matchScore: number; // 匹配度 0-100
  recommendation: string;
  alternatives: string[];
  actions: string[]; // 未来90天行动
  createdAt: number;
}

export type Cadence = "daily" | "weekly" | "monthly";

export interface PlanTask {
  id: string;
  title: string;
  cadence: Cadence;
  done: boolean;
  doneAt?: number;
  periodKey?: string; // daily 按天重置
}

export interface LifePlan {
  id: string;
  goal: string;
  createdAt: number;
  tasks: PlanTask[];
  adjustments: number;
  lastNote?: string;
}

export type CompanionMode = "friend" | "coach" | "encourage" | "future";

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  mode?: CompanionMode;
  at: number;
  memoryRefs?: string[]; // AI 引用的长期记忆
}

export interface MemoryEvent {
  id: string;
  kind: "decision" | "task" | "mood" | "chat" | "profile" | "rpg";
  text: string;
  at: number;
  weight: number; // 记忆权重
}

export interface RPGState {
  direction: string;
  level: number; // 1-5
  xp: number;
  skills: string[];
  achievements: string[];
}

export interface MatchCandidate {
  id: string;
  name: string;
  role: string;
  archetype: string;
  type: "学习伙伴" | "创业伙伴" | "行业导师" | "兴趣朋友";
  matchScore: number;
  reasons: string[];
  connected: boolean;
}

export interface OSStats {
  tasksCompleted: number;
  decisionsCount: number;
  simulationsCount: number;
  chatsCount: number;
  moodsCount: number;
  loginDays: number;
}

export interface OSState {
  account: { email: string; name: string } | null;
  profile: UserProfile | null;
  dailyPlan: string; // 用户的日常计划（弹性版），可编辑，助手据此分析
  decisions: DecisionReport[];
  plans: LifePlan[];
  messages: ChatMessage[];
  moods: { at: number; mood: string }[];
  rpg: RPGState | null;
  memories: MemoryEvent[];
  stats: OSStats;
  lastVisit: number;
  loginDays: string[];
}

export const TRAIT_LABELS = [
  "创造力",
  "执行力",
  "学习力",
  "社交力",
  "抗压性",
  "自律",
] as const;

export const COMPANION_MODES: Record<
  CompanionMode,
  { label: string; desc: string; icon: string }
> = {
  friend: { label: "朋友模式", desc: "倾听与共鸣", icon: "🫂" },
  coach: { label: "教练模式", desc: "分析与拆解", icon: "🧭" },
  encourage: { label: "鼓励模式", desc: "支持与赋能", icon: "🔥" },
  future: { label: "未来自己", desc: "长期视角建议", icon: "🌌" },
};
