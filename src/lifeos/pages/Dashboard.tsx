import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useOS, xpForLevel, LEVEL_TITLES } from "../store/OSContext";
import { Card, Chip, ProgressBar, ScoreRing } from "../components/ui";

// ─── 总览仪表盘：人格摘要 + 今日任务 + 快速入口 + 成长时间线 ───

const QUICK_ACTIONS = [
  { to: "/life-os/simulator", icon: "∿", title: "未来模拟器", desc: "推演不同选择的 3/5/10 年" },
  { to: "/life-os/decisions", icon: "⚖", title: "决策助手", desc: "用结构化分析破解纠结" },
  { to: "/life-os/companion", icon: "☾", title: "情绪陪伴", desc: "四种模式的长期伙伴" },
  { to: "/life-os/rpg", icon: "✦", title: "成长 RPG", desc: "把目标变成升级路线" },
];

export default function Dashboard() {
  const { state, persona } = useOS();
  const hour = new Date().getHours();
  const greeting = hour < 6 ? "夜深了" : hour < 12 ? "早上好" : hour < 18 ? "下午好" : "晚上好";
  const level = state.rpg?.level ?? 1;
  const xp = state.rpg?.xp ?? 0;
  const levelBase = xpForLevel(level);
  const nextBase = xpForLevel(level + 1);
  const xpProgress = level >= 5 ? 100 : ((xp - levelBase) / Math.max(nextBase - levelBase, 1)) * 100;

  const todayTasks = state.plans
    .flatMap((p) => p.tasks)
    .filter((t) => t.cadence === "daily");
  const doneToday = todayTasks.filter((t) => t.done).length;
  const recentMemories = [...state.memories].sort((a, b) => b.at - a.at).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* 问候 + 人格摘要 */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2" glow>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">{greeting}，</p>
          <h1 className="mt-2 font-display text-4xl italic leading-tight">
            {state.profile?.name ?? "旅人"}
          </h1>
          {persona ? (
            <>
              <p className="mt-3 text-sm text-muted">
                你的 AI 画像：
                <span className="text-text-primary">「{persona.archetype}」</span>
                <span className="mx-2 text-stroke">·</span>
                {persona.tagline}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {persona.strengths.slice(0, 2).map((s) => (
                  <Chip key={s} tone="accent">✦ {s}</Chip>
                ))}
                {persona.risks.slice(0, 1).map((r) => (
                  <Chip key={r}>⚠ {r}</Chip>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">人格模型尚未建立</p>
          )}
          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1">
              <div className="mb-2 flex justify-between text-xs text-muted">
                <span>人格模型完善度</span>
                <span>{persona?.completion ?? 0}%</span>
              </div>
              <ProgressBar value={persona?.completion ?? 0} />
              <p className="mt-2 text-[11px] leading-relaxed text-muted">
                随着你使用模拟器、决策助手与完成任务，AI 会越来越了解你。
              </p>
            </div>
          </div>
        </Card>

        {/* 今日任务环 */}
        <Card className="flex flex-col items-center justify-center text-center">
          <p className="mb-4 text-xs uppercase tracking-[0.25em] text-muted">今日任务</p>
          <ScoreRing
            value={todayTasks.length > 0 ? (doneToday / todayTasks.length) * 100 : 0}
            label={`${doneToday}/${todayTasks.length || 0}`}
          />
          <p className="mt-4 text-xs text-muted">
            {todayTasks.length === 0
              ? "还没有行动计划"
              : doneToday === todayTasks.length
                ? "今日目标全部完成 ✓"
                : "完成日常任务获取 XP"}
          </p>
          <Link
            to="/life-os/life"
            className="mt-4 text-xs text-[#89AACC] transition-colors hover:text-text-primary"
          >
            进入生活管理 →
          </Link>
        </Card>
      </div>

      {/* 快速入口 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {QUICK_ACTIONS.map((a, i) => (
          <motion.div
            key={a.to}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.5 }}
          >
            <Link to={a.to}>
              <Card className="group transition-colors duration-300 hover:border-[#89AACC]/40">
                <span className="text-2xl text-[#89AACC]">{a.icon}</span>
                <p className="mt-3 text-sm text-text-primary">{a.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{a.desc}</p>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 成长时间线（长期记忆） */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-text-primary">AI 的长期记忆</p>
            <span className="text-[10px] uppercase tracking-widest text-muted">
              {state.memories.length} 条
            </span>
          </div>
          {recentMemories.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              AI 还没有关于你的记忆，去使用各个模块吧。
            </p>
          ) : (
            <div className="space-y-4">
              {recentMemories.map((m) => (
                <div key={m.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#89AACC]" />
                  <div>
                    <p className="leading-relaxed text-muted">{m.text}</p>
                    <p className="mt-0.5 text-[10px] text-muted/60">
                      {new Date(m.at).toLocaleString("zh-CN", { hour12: false })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* RPG 进度 */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-text-primary">成长进度</p>
            <span className="font-display text-sm italic text-[#89AACC]">
              Lv.{level} {LEVEL_TITLES[level]}
            </span>
          </div>
          <ProgressBar value={xpProgress} />
          <div className="mt-2 flex justify-between text-[11px] text-muted">
            <span>XP {xp}</span>
            <span>{level >= 5 ? "已满级" : `下一级 ${nextBase} XP`}</span>
          </div>
          {state.rpg ? (
            <p className="mt-4 text-xs leading-relaxed text-muted">
              当前方向：{state.rpg.direction}
              <br />
              已解锁成就 {state.rpg.achievements.length} 项
            </p>
          ) : (
            <p className="mt-4 text-xs text-muted">
              还没有选择人生方向，
              <Link to="/life-os/rpg" className="text-[#89AACC] hover:text-text-primary">
                去 RPG 系统选择 →
              </Link>
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
