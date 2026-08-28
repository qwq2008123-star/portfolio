import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOS } from "../store/OSContext";
import { adjustPlan, generatePlan } from "../engine/planner";
import { Card, EmptyState, GradientButton, SectionTitle } from "../components/ui";
import type { Cadence } from "../types";

// ─── AI 生活管理：目标 → AI 自动生成行动计划 → 执行 → 自动调整 ───

const CADENCE_META: Record<Cadence, { label: string; icon: string }> = {
  daily: { label: "每日任务", icon: "☀" },
  weekly: { label: "每周任务", icon: "▤" },
  monthly: { label: "每月任务", icon: "◈" },
};

export default function LifePage() {
  const { state, dispatch } = useOS();
  const [goal, setGoal] = useState("");
  const [generating, setGenerating] = useState(false);

  const createPlan = () => {
    if (!goal.trim() || !state.profile) return;
    setGenerating(true);
    setTimeout(() => {
      dispatch({ type: "addPlan", plan: generatePlan(goal.trim(), state.profile!) });
      setGoal("");
      setGenerating(false);
    }, 1600);
  };

  const adjust = (planId: string) => {
    const plan = state.plans.find((p) => p.id === planId);
    if (!plan) return;
    dispatch({ type: "replacePlan", plan: adjustPlan(plan, state.stats) });
  };

  if (state.plans.length === 0) {
    return (
      <div className="space-y-6">
        <SectionTitle
          eyebrow="Life Management"
          title={
            <>
              让 AI 把目标变成<em className="font-display italic"> 行动计划 </em>
            </>
          }
          sub="不是普通 Todo 工具——AI 根据你的人生目标生成每日/每周/每月计划，并根据执行情况自动调整。"
        />
        {generating ? (
          <Card>
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-text-primary/70"
                    animate={{ opacity: [0.2, 1, 0.2], y: [0, -3, 0] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
              <p className="text-sm text-text-primary">AI 正在根据你的目标生成计划…</p>
            </div>
          </Card>
        ) : (
          <Card>
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createPlan()}
              placeholder="输入一个人生目标，例如：「成为 AI 工程师」"
              className="w-full rounded-xl border border-stroke bg-bg px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-[#89AACC]/50"
            />
            <div className="mt-4 flex justify-end">
              <GradientButton onClick={createPlan} disabled={!goal.trim()}>
                生成行动计划
              </GradientButton>
            </div>
          </Card>
        )}
        <EmptyState
          icon="▤"
          title="还没有行动计划"
          sub="输入你的目标，AI 会拆解为可执行的日常任务。完成任务可获得 XP 并反哺人格模型。"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Life Management"
        title={
          <>
            执行<em className="font-display italic"> 即成长 </em>
          </>
        }
        sub="完成任务 → 获得 XP → 数据反哺人格模型 → AI 调整计划强度。"
      />

      {/* 新目标输入 */}
      <Card className="flex flex-col gap-3 sm:flex-row">
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createPlan()}
          placeholder="添加新目标，例如：「写完一本小书」"
          className="flex-1 rounded-xl border border-stroke bg-bg px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-[#89AACC]/50"
        />
        <GradientButton onClick={createPlan} disabled={!goal.trim() || generating}>
          {generating ? "生成中…" : "生成计划"}
        </GradientButton>
      </Card>

      {/* 计划列表 */}
      {state.plans.map((plan) => {
        const groups: Cadence[] = ["daily", "weekly", "monthly"];
        const done = plan.tasks.filter((t) => t.done).length;
        return (
          <Card key={plan.id} glow>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-2xl italic">{plan.goal}</h3>
                {plan.lastNote && (
                  <p className="mt-2 max-w-xl rounded-xl border border-[#89AACC]/30 bg-[rgba(137,170,204,0.06)] px-3 py-2 text-xs leading-relaxed text-[#89AACC]">
                    AI 调整 #{plan.adjustments}：{plan.lastNote}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted">
                  {done}/{plan.tasks.length} 已完成
                </span>
                <button
                  onClick={() => adjust(plan.id)}
                  className="rounded-full border border-stroke px-4 py-1.5 text-xs text-muted transition-colors hover:border-[#89AACC]/50 hover:text-text-primary"
                >
                  让 AI 调整计划
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              {groups.map((cadence) => (
                <div key={cadence}>
                  <p className="mb-3 text-xs uppercase tracking-[0.25em] text-muted">
                    {CADENCE_META[cadence].icon} {CADENCE_META[cadence].label}
                  </p>
                  <div className="space-y-2">
                    {plan.tasks
                      .filter((t) => t.cadence === cadence)
                      .map((task) => (
                        <AnimatePresence key={task.id} mode="wait">
                          <motion.button
                            layout
                            onClick={() => dispatch({ type: "toggleTask", planId: plan.id, taskId: task.id })}
                            className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-300 ${
                              task.done
                                ? "border-[#89AACC]/30 bg-[rgba(137,170,204,0.06)]"
                                : "border-stroke bg-bg/40 hover:border-stroke/80"
                            }`}
                            whileTap={{ scale: 0.98 }}
                          >
                            <span
                              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                task.done ? "border-transparent bg-[#89AACC] text-bg" : "border-stroke text-transparent"
                              }`}
                            >
                              ✓
                            </span>
                            <span
                              className={`text-sm leading-relaxed ${
                                task.done ? "text-muted line-through" : "text-text-primary/90"
                              }`}
                            >
                              {task.title}
                              {!task.done && (
                                <span className="ml-2 text-[10px] text-muted/60">
                                  +{task.cadence === "daily" ? 15 : task.cadence === "weekly" ? 40 : 60} XP
                                </span>
                              )}
                            </span>
                          </motion.button>
                        </AnimatePresence>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
