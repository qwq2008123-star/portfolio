import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type {
  ChatMessage,
  DecisionReport,
  LifePlan,
  MemoryEvent,
  OSState,
  Persona,
  UserProfile,
} from "../types";
import { derivePersona } from "../engine/persona";
import { rolloverPlan } from "../engine/planner";
import { DEFAULT_DAILY_PLAN } from "../data/dailyPlan";

// ─── AI Life OS 全局状态：单一数据源 + localStorage 持久化 + 闭环数据流 ───
// 用户输入 → 人格模型 → 模拟/决策 → 行动计划 → 成长反馈 → 更新人格模型

const STORAGE_KEY = "lifeos:v1";

function initialState(): OSState {
  return {
    account: null,
    profile: null,
    dailyPlan: DEFAULT_DAILY_PLAN,
    decisions: [],
    plans: [],
    messages: [],
    moods: [],
    rpg: null,
    memories: [],
    integrations: [],
    roundtableGuests: [],
    innerCircle: { memories: [], sessions: [] },
    stats: {
      tasksCompleted: 0,
      decisionsCount: 0,
      simulationsCount: 0,
      chatsCount: 0,
      moodsCount: 0,
      loginDays: 1,
    },
    lastVisit: Date.now(),
    loginDays: [new Date().toDateString()],
  };
}

export function xpForLevel(level: number): number {
  // 达到该等级所需的总 XP（L1=0，L2=100，…，L5=900）
  return [0, 100, 260, 500, 900][Math.max(0, Math.min(level - 1, 4))] ?? 9999;
}

export const LEVEL_TITLES = ["", "初入江湖", "渐入佳境", "驾轻就熟", "炉火纯青", "登堂入室"];

type Action =
  | { type: "login"; email: string; name: string }
  | { type: "logout" }
  | { type: "saveProfile"; profile: UserProfile }
  | { type: "saveDailyPlan"; plan: string }
  | { type: "addDecision"; report: DecisionReport }
  | { type: "countSimulation" }
  | { type: "addPlan"; plan: LifePlan }
  | { type: "toggleTask"; planId: string; taskId: string }
  | { type: "replacePlan"; plan: LifePlan }
  | { type: "addMessage"; msg: ChatMessage }
  | { type: "addMood"; mood: string }
  | { type: "initRPG"; direction: string }
  | { type: "resetRPG" }
  | { type: "addXp"; amount: number; reason?: string }
  | { type: "connect"; id: string }
  | { type: "addIntegration"; note: import("../types").IntegrationNote }
  | { type: "toggleRoundtableGuest"; id: string }
  | {
      type: "icUpdate";
      memories?: import("../types").ICMemory[];
      sessions?: import("../types").ICSession[];
    }
  | { type: "reset" };

function mem(
  kind: MemoryEvent["kind"],
  text: string,
  weight = 1,
): MemoryEvent {
  return {
    id: `mem-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    kind,
    text,
    at: Date.now(),
    weight,
  };
}

function reducer(state: OSState, action: Action): OSState {
  switch (action.type) {
    case "login": {
      const today = new Date().toDateString();
      const isNewDay = !state.loginDays.includes(today);
      return {
        ...state,
        account: { email: action.email, name: action.name },
        loginDays: isNewDay ? [...state.loginDays, today] : state.loginDays,
        stats: { ...state.stats, loginDays: state.loginDays.length + (isNewDay ? 1 : 0) },
      };
    }
    case "logout":
      return initialState();

    case "saveProfile": {
      return {
        ...state,
        profile: action.profile,
        memories: [
          mem("profile", `完善了星图（${action.profile.occupation} · ${action.profile.mbti}）`, 3),
          ...state.memories,
        ],
      };
    }

    case "saveDailyPlan":
      return {
        ...state,
        dailyPlan: action.plan,
        memories: [mem("profile", "更新了日常计划（弹性版）", 2), ...state.memories],
      };

    case "addDecision":
      return {
        ...state,
        decisions: [action.report, ...state.decisions].slice(0, 20),
        stats: { ...state.stats, decisionsCount: state.stats.decisionsCount + 1 },
        memories: [
          mem("decision", `完成决策分析：${action.report.question}（匹配度 ${action.report.matchScore}%）`, 2),
          ...state.memories,
        ],
      };

    case "countSimulation":
      return {
        ...state,
        stats: { ...state.stats, simulationsCount: state.stats.simulationsCount + 1 },
        memories: [mem("decision", "进行了一次未来模拟推演", 1), ...state.memories],
      };

    case "addPlan":
      return {
        ...state,
        plans: [action.plan, ...state.plans],
        memories: [mem("task", `AI 生成了「${action.plan.goal}」行动计划`, 2), ...state.memories],
      };

    case "toggleTask": {
      let gainedXp = 0;
      let completedTitle = "";
      const plans = state.plans.map((p) => {
        if (p.id !== action.planId) return p;
        const tasks = p.tasks.map((t) => {
          if (t.id !== action.taskId) return t;
          const nowDone = !t.done;
          if (nowDone) {
            gainedXp = t.cadence === "daily" ? 15 : t.cadence === "weekly" ? 40 : 60;
            completedTitle = t.title;
          }
          return { ...t, done: nowDone, doneAt: nowDone ? Date.now() : undefined };
        });
        return { ...p, tasks };
      });
      if (gainedXp === 0) {
        return { ...state, plans };
      }
      const stats = {
        ...state.stats,
        tasksCompleted: state.stats.tasksCompleted + 1,
      };
      const rpg = state.rpg
        ? advanceXp({ ...state.rpg, xp: state.rpg.xp + gainedXp })
        : null;
      const achievements = rpg ? [...rpg.achievements] : [];
      const newAchievements = checkAchievements(stats, rpg?.level ?? 0).filter(
        (a) => !achievements.includes(a),
      );
      return {
        ...state,
        plans,
        stats,
        rpg: rpg ? { ...rpg, achievements: [...achievements, ...newAchievements] } : null,
        memories: [
          mem("task", `完成任务「${completedTitle}」(+${gainedXp} XP)`, 1),
          ...newAchievements.map((a) => mem("rpg", `解锁成就「${a}」`, 2)),
          ...state.memories,
        ],
      };
    }

    case "replacePlan":
      return {
        ...state,
        plans: state.plans.map((p) => (p.id === action.plan.id ? action.plan : p)),
      };

    case "addMessage":
      if (action.msg.role !== "user") return { ...state, messages: [...state.messages, action.msg] };
      return {
        ...state,
        messages: [...state.messages, action.msg],
        stats: { ...state.stats, chatsCount: state.stats.chatsCount + 1 },
        memories: [mem("chat", action.msg.text.slice(0, 40), 1), ...state.memories].slice(0, 80),
      };

    case "addMood": {
      const mood = { at: Date.now(), mood: action.mood };
      return {
        ...state,
        moods: [mood, ...state.moods].slice(0, 30),
        stats: { ...state.stats, moodsCount: state.stats.moodsCount + 1 },
        memories: [mem("mood", `记录情绪：${action.mood}`, 1), ...state.memories],
      };
    }

    case "initRPG":
      return {
        ...state,
        rpg: {
          direction: action.direction,
          level: 1,
          xp: 0,
          skills: [],
          achievements: ["启程者"],
        },
        memories: [mem("rpg", `选择人生方向「${action.direction}」，RPG 成长路线启动`, 3), ...state.memories],
      };

    case "addXp": {
      if (!state.rpg) return state;
      const rpg = advanceXp({ ...state.rpg, xp: state.rpg.xp + action.amount });
      const newAchievements = checkAchievements(state.stats, rpg.level).filter(
        (a) => !rpg.achievements.includes(a),
      );
      return {
        ...state,
        rpg: { ...rpg, achievements: [...rpg.achievements, ...newAchievements] },
        memories: [
          ...(action.reason ? [mem("rpg", `${action.reason} (+${action.amount} XP)`)] : []),
          ...newAchievements.map((a) => mem("rpg", `解锁成就「${a}」`, 2)),
          ...state.memories,
        ],
      };
    }

    case "resetRPG":
      return {
        ...state,
        rpg: null,
        memories: [mem("rpg", "重置了人生方向，回到选择页", 1), ...state.memories],
      };

    case "toggleRoundtableGuest": {
      const has = state.roundtableGuests.includes(action.id);
      return {
        ...state,
        roundtableGuests: has
          ? state.roundtableGuests.filter((id) => id !== action.id)
          : [...state.roundtableGuests, action.id].slice(0, 4),
        memories: [
          mem("rpg", has ? "一位成员离开了圆桌" : "邀请了一位成员加入内心圆桌", 1),
          ...state.memories,
        ],
      };
    }

    case "addIntegration":
      return {
        ...state,
        integrations: [action.note, ...state.integrations].slice(0, 20),
        memories: [
          mem("rpg", `完成了一次「整合之旅」对话`, 2),
          ...state.memories,
        ],
      };

    case "icUpdate":
      return {
        ...state,
        innerCircle: {
          memories: action.memories ?? state.innerCircle.memories,
          sessions: action.sessions ?? state.innerCircle.sessions,
        },
      };

    case "connect":
      return state; // 连接状态在页面本地维护（Demo 演示）

    case "reset":
      return initialState();

    default:
      return state;
  }
}

function advanceXp<T extends { xp: number; level: number; achievements: string[] }>(rpg: T): T {
  let { xp, level } = rpg;
  const achievements = [...rpg.achievements];
  while (level < 5 && xp >= xpForLevel(level + 1)) {
    level += 1;
    if (!achievements.includes(`Level ${level}`)) achievements.push(`Level ${level}`);
  }
  return { ...rpg, xp, level, achievements };
}

function checkAchievements(stats: OSState["stats"], level: number): string[] {
  const unlocked: string[] = [];
  if (stats.tasksCompleted >= 1) unlocked.push("第一步");
  if (stats.tasksCompleted >= 10) unlocked.push("十项全能");
  if (stats.decisionsCount >= 1) unlocked.push("决策者");
  if (stats.decisionsCount >= 5) unlocked.push("抉择大师");
  if (stats.chatsCount >= 5) unlocked.push("深度对话");
  if (stats.simulationsCount >= 1) unlocked.push("时间旅人");
  if (level >= 3) unlocked.push("三级跳");
  return unlocked;
}

function load(): OSState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as OSState;
    return {
      ...initialState(),
      ...parsed,
      plans: (parsed.plans ?? []).map(rolloverPlan), // 周期任务自动重置
    };
  } catch {
    return initialState();
  }
}

interface OSContextValue {
  state: OSState;
  dispatch: Dispatch<Action>;
  persona: Persona | null;
}

const OSContext = createContext<OSContextValue | null>(null);

export function OSProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // 存储满时静默降级（Demo 场景）
    }
  }, [state]);

  const persona = useMemo(
    () =>
      state.profile
        ? derivePersona(state.profile, {
            stats: state.stats,
            memoryCount: state.memories.length,
          })
        : null,
    [state.profile, state.stats, state.memories],
  );

  return (
    <OSContext.Provider value={{ state, dispatch, persona }}>
      {children}
    </OSContext.Provider>
  );
}

export function useOS(): OSContextValue {
  const ctx = useContext(OSContext);
  if (!ctx) throw new Error("useOS must be used within OSProvider");
  return ctx;
}

export type { Action };
