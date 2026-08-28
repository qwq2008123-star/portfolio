import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useOS } from "../store/OSContext";
import { buildDecisionReport } from "../engine/decision";
import { dailyRoutineItems, habitAdvice } from "../engine/dailyAdvisor";
import { getLLM } from "../engine/llm";
import { generatePlan } from "../engine/planner";
import { DEFAULT_DAILY_PLAN } from "../data/dailyPlan";
import type { ChatMessage, DecisionReport } from "../types";
import {
  Card,
  EmptyState,
  GhostButton,
  GradientButton,
  ScoreRing,
  SectionTitle,
  Thinking,
} from "../components/ui";

// ─── AI 人生决策助手：问题 → 调取人格 + 历史 + 模拟 → 决策报告 ───

const EXAMPLES = ["是否创业？", "是否考研？", "是否换工作？", "是否换城市？", "是否坚持这个项目？"];

// 日常习惯对话助手的快捷入口：状态打卡 + 常见选择 + 日总结
const DAILY_PROMPTS = ["我今天想喝哪一家的咖啡？", "今天中午吃什么？", "现在适合去运动吗？"];
const STATE_CHECKINS = [
  { label: "💪 状态很好", msg: "今天感觉怎么样？我给自己打 9 分，今天怎么安排？" },
  { label: "😐 状态一般", msg: "今天感觉怎么样？我给自己打 6 分，今天怎么安排？" },
  { label: "😪 状态很差", msg: "今天感觉怎么样？我给自己打 3 分，今天怎么安排？" },
];
const SUMMARY_PROMPT = "到 AI 日总结时间了，我们聊聊今天吧";

export default function DecisionsPage() {
  const { state, persona, dispatch } = useOS();
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState<"input" | "thinking" | "done">("input");
  const [report, setReport] = useState<DecisionReport | null>(null);
  const [addedToPlan, setAddedToPlan] = useState(false);

  // ─── 日常习惯对话助手（本地会话，不影响情绪陪伴的消息流） ───
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatPending, setChatPending] = useState(false);
  const [pendingSecs, setPendingSecs] = useState(0);
  const [showPlanEditor, setShowPlanEditor] = useState(false);
  const [planDraft, setPlanDraft] = useState("");
  const [planSaved, setPlanSaved] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const routineItems = dailyRoutineItems({ profile: state.profile, persona, dailyPlan: state.dailyPlan, plans: state.plans, memories: state.memories, moods: state.moods, stats: state.stats });

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [chat.length, chatPending, pendingSecs]);

  // 思考计时器：让等待可见（DeepSeek 通常 3–10 秒）
  useEffect(() => {
    if (!chatPending) return;
    setPendingSecs(0);
    const id = setInterval(() => setPendingSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [chatPending]);

  const sendDaily = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || chatPending || !state.profile || !persona) return;
    setChat((c) => [...c, { id: `u-${Date.now()}`, role: "user", text: trimmed, at: Date.now() }]);
    setChatInput("");
    setChatPending(true);
    const reply = await habitAdvice(trimmed, {
      profile: state.profile,
      persona,
      dailyPlan: state.dailyPlan,
      plans: state.plans,
      memories: state.memories,
      moods: state.moods,
      stats: state.stats,
    });
    setChat((c) => [...c, reply]);
    setChatPending(false);
  };

  const openPlanEditor = () => {
    setPlanDraft(state.dailyPlan);
    setPlanSaved(false);
    setShowPlanEditor((v) => !v);
  };

  const savePlan = () => {
    if (!planDraft.trim()) return;
    dispatch({ type: "saveDailyPlan", plan: planDraft });
    setPlanSaved(true);
  };

  const run = (q: string) => {
    if (!q.trim() || !state.profile || !persona) return;
    setQuestion(q);
    setPhase("thinking");
    setReport(null);
    setAddedToPlan(false);
    setTimeout(() => {
      const result = buildDecisionReport(q, state.profile!, persona, state.stats);
      setReport(result);
      setPhase("done");
      dispatch({ type: "addDecision", report: result });
      dispatch({ type: "addXp", amount: 25, reason: "完成一次决策分析" });
    }, 2200);
  };

  const addToPlan = () => {
    if (!report || !state.profile) return;
    const plan = generatePlan(`${report.category}：${report.actions[0]}`, state.profile);
    const planWithActions = {
      ...plan,
      goal: `${report.question.slice(0, 16)} — 90 天行动`,
      tasks: plan.tasks.map((t, i) =>
        i < report.actions.length
          ? { ...t, title: report.actions[i], cadence: "weekly" as const }
          : t,
      ),
    };
    dispatch({ type: "addPlan", plan: planWithActions });
    setAddedToPlan(true);
  };

  if (!state.profile || !persona) {
    return (
      <EmptyState
        icon="⚖"
        title="需要先建立人格档案"
        sub="决策助手需要调用你的 AI 人格档案与历史行为数据。"
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Decision Assistant"
        title={
          <>
            破解你的<em className="font-display italic"> 人生选择 </em>
          </>
        }
        sub="AI 将调取你的人格档案、历史行为与未来模拟，生成结构化决策报告。"
      />

      {/* ─── 日常习惯对话助手：聊日常小选择，AI 按你的「日常计划（弹性版）」分析 ─── */}
      <Card className="flex flex-col p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stroke px-6 py-4">
          <p className="text-sm text-text-primary">
            ☕ 日常习惯助手
            <span className="ml-2 text-xs text-muted">按你的日常计划 · 状态动态调整</span>
          </p>
          <div className="flex items-center gap-1.5">
            {routineItems.length > 0 ? (
              <span className="rounded-full bg-[rgba(137,170,204,0.1)] px-2.5 py-1 text-[10px] text-[#89AACC]">
                已读取 {routineItems.length} 条你的日常
              </span>
            ) : (
              <span className="rounded-full border border-stroke px-2.5 py-1 text-[10px] text-muted">
                还没有日常数据，去「生活管理」写下每日任务
              </span>
            )}
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] ${
                getLLM().isRemote ? "border-[#89AACC]/40 text-[#89AACC]" : "border-stroke text-muted"
              }`}
            >
              {getLLM().isRemote ? `⚡ ${getLLM().name}` : "本地引擎"}
            </span>
            <GhostButton onClick={openPlanEditor} active={showPlanEditor}>
              📋 我的日常
            </GhostButton>
          </div>
        </div>

        {/* 日常计划编辑面板 */}
        {showPlanEditor && (
          <div className="border-b border-stroke px-6 py-4">
            <textarea
              value={planDraft}
              onChange={(e) => {
                setPlanDraft(e.target.value);
                setPlanSaved(false);
              }}
              className="h-64 w-full resize-none rounded-xl border border-stroke bg-bg px-4 py-3 font-mono text-xs leading-relaxed outline-none transition-colors focus:border-[#89AACC]/50"
              placeholder="写下你的日常计划（固定框架 + 动态调整规则），助手会按这份计划协助你"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <GradientButton onClick={savePlan} disabled={!planDraft.trim() || planDraft === state.dailyPlan}>
                保存日常
              </GradientButton>
              <GhostButton onClick={() => setPlanDraft(DEFAULT_DAILY_PLAN)}>恢复默认模板</GhostButton>
              {planSaved && <span className="text-xs text-[#89AACC]">✓ 已保存，助手已同步你的最新计划</span>}
            </div>
          </div>
        )}

        {/* 消息流 */}
        <div className="max-h-72 min-h-40 space-y-3 overflow-y-auto px-6 py-4">
          {chat.length === 0 && !chatPending && (
            <div className="flex h-full min-h-32 flex-col items-center justify-center gap-3 text-center">
              <p className="max-w-md text-sm text-muted">
                早上先打状态分，白天聊选择，晚上做总结——
                <br />
                我按你的「日常计划（弹性版）」陪你动态调整，不搞死板时间表。
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {STATE_CHECKINS.map((s) => (
                  <GhostButton key={s.label} onClick={() => void sendDaily(s.msg)}>
                    {s.label}
                  </GhostButton>
                ))}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {DAILY_PROMPTS.map((p) => (
                  <GhostButton key={p} onClick={() => void sendDaily(p)}>
                    {p}
                  </GhostButton>
                ))}
                <GhostButton onClick={() => void sendDaily(SUMMARY_PROMPT)}>📝 AI 日总结</GhostButton>
              </div>
            </div>
          )}

          {chat.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "rounded-br-md bg-text-primary text-bg"
                    : "rounded-bl-md border border-stroke bg-bg/60 text-text-primary/90"
                }`}
              >
                {msg.role === "ai" ? (
                  <>
                    <span className="whitespace-pre-wrap">{msg.text}</span>
                    {msg.memoryRefs && msg.memoryRefs.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-stroke pt-2">
                        {msg.memoryRefs.map((ref) => (
                          <span key={ref} className="rounded-full bg-[rgba(137,170,204,0.1)] px-2 py-0.5 text-[10px] text-[#89AACC]">
                            📋 {ref}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  msg.text
                )}
              </div>
            </motion.div>
          ))}

          {chatPending && (
            <div className="flex justify-start">
              <div className="rounded-3xl rounded-bl-md border border-stroke bg-bg/60 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-text-primary/70"
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted tabular-nums">
                    {pendingSecs < 20
                      ? `DeepSeek 正在结合你的日常思考… ${pendingSecs}s`
                      : pendingSecs < 30
                        ? `响应较慢（${pendingSecs}s），30 秒后会自动改用本地引擎`
                        : "即将回退本地引擎…"}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* 输入区 */}
        <div className="border-t border-stroke px-6 py-3">
          {/* 常驻快捷入口：状态打卡 + 日常选择 + 日总结（聊天中也能随时用） */}
          {chat.length > 0 && (
            <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-0.5">
              {STATE_CHECKINS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => void sendDaily(s.msg)}
                  disabled={chatPending}
                  className="shrink-0 rounded-full border border-stroke px-3 py-1.5 text-xs text-muted transition-colors hover:text-text-primary disabled:opacity-40"
                >
                  {s.label}
                </button>
              ))}
              {DAILY_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => void sendDaily(p)}
                  disabled={chatPending}
                  className="shrink-0 rounded-full border border-stroke px-3 py-1.5 text-xs text-muted transition-colors hover:text-text-primary disabled:opacity-40"
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => void sendDaily(SUMMARY_PROMPT)}
                disabled={chatPending}
                className="shrink-0 rounded-full border border-stroke px-3 py-1.5 text-xs text-muted transition-colors hover:text-text-primary disabled:opacity-40"
              >
                📝 AI 日总结
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void sendDaily(chatInput)}
              placeholder="聊聊今天的习惯选择，例如：「我今天想喝哪一家的咖啡？」"
              className="flex-1 rounded-xl border border-stroke bg-bg px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-[#89AACC]/50"
            />
            <button
              onClick={() => void sendDaily(chatInput)}
              disabled={!chatInput.trim() || chatPending}
              className="accent-gradient rounded-xl px-5 text-sm font-medium text-bg transition-opacity disabled:opacity-40"
            >
              发送
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="输入困扰你的决策，例如：「是否创业？」"
          className="min-h-20 w-full resize-none rounded-xl border border-stroke bg-bg px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-[#89AACC]/50"
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((e) => (
              <GhostButton key={e} onClick={() => run(e)} active={question === e}>
                {e}
              </GhostButton>
            ))}
          </div>
          <GradientButton onClick={() => run(question)} disabled={phase === "thinking" || !question.trim()}>
            生成决策报告
          </GradientButton>
        </div>
      </Card>

      {/* 历史决策 */}
      {state.decisions.length > 0 && phase === "input" && (
        <Card>
          <p className="mb-4 text-xs uppercase tracking-[0.25em] text-muted">历史决策</p>
          <div className="space-y-3">
            {state.decisions.slice(0, 5).map((d) => (
              <button
                key={d.id}
                onClick={() => run(d.question)}
                className="flex w-full items-center justify-between rounded-2xl border border-stroke bg-bg/40 px-4 py-3 text-left transition-colors hover:border-[#89AACC]/40"
              >
                <span className="truncate text-sm text-muted">{d.question}</span>
                <span className="ml-4 shrink-0 font-display text-sm italic text-[#89AACC]">
                  {d.matchScore}%
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}

      <AnimatePresence mode="wait">
        {phase === "thinking" && (
          <motion.div key="thinking" exit={{ opacity: 0 }}>
            <Card>
              <Thinking text="正在调取人格档案与历史行为" />
            </Card>
          </motion.div>
        )}

        {phase === "done" && report && (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card glow>
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                <div className="flex flex-col items-center gap-2">
                  <ScoreRing value={report.matchScore} size={110} label="匹配度" />
                  <span className="rounded-full border border-stroke px-3 py-1 text-[10px] uppercase tracking-widest text-muted">
                    {report.category}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-2xl italic">「{report.question}」</h3>
                  <p className="mt-3 text-sm leading-relaxed text-text-primary/90">{report.analysis}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.25em] text-[#89AACC]">你的优势</p>
                  <ul className="space-y-1.5">
                    {report.strengths.map((s) => (
                      <li key={s} className="text-sm text-muted">✦ {s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.25em] text-amber-400/80">需要警惕</p>
                  <ul className="space-y-1.5">
                    {report.risks.map((r) => (
                      <li key={r} className="text-sm text-muted">⚠ {r}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-[#89AACC]/30 bg-[rgba(137,170,204,0.06)] p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-[#89AACC]">AI 推荐</p>
                <p className="mt-2 text-sm leading-relaxed text-text-primary">{report.recommendation}</p>
                <p className="mt-4 text-xs uppercase tracking-[0.25em] text-muted">未来 90 天行动</p>
                <ol className="mt-2 space-y-1.5">
                  {report.actions.map((a, i) => (
                    <li key={a} className="text-sm text-muted">
                      <span className="mr-2 font-display italic text-[#89AACC]">{i + 1}.</span>
                      {a}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-6">
                <p className="mb-2 text-xs uppercase tracking-[0.25em] text-muted">备选方案</p>
                <ul className="space-y-1.5">
                  {report.alternatives.map((a) => (
                    <li key={a} className="text-sm text-muted">→ {a}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <GradientButton onClick={addToPlan} disabled={addedToPlan}>
                  {addedToPlan ? "✓ 已加入行动计划" : "把行动建议加入生活管理"}
                </GradientButton>
                <button
                  onClick={() => navigate("/life-os/simulator")}
                  className="rounded-full border border-stroke px-5 py-3 text-sm text-muted transition-colors hover:text-text-primary"
                >
                  去模拟器看未来路线
                </button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
