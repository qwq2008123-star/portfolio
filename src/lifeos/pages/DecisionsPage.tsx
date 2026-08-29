import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useOS } from "../store/OSContext";
import { dailyRoutineItems, habitAdvice } from "../engine/dailyAdvisor";
import { getLLM } from "../engine/llm";
import { DEFAULT_DAILY_PLAN } from "../data/dailyPlan";
import type { ChatMessage } from "../types";
import {
  Card,
  EmptyState,
  GhostButton,
  GradientButton,
  SectionTitle,
} from "../components/ui";

// ─── AI 决策助手 · 日常习惯对话：按「日常计划（弹性版）」陪用户动态调整 ───

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

  if (!state.profile || !persona) {
    return (
      <EmptyState
        icon="⚖"
        title="需要先建立星图"
        sub="日常习惯助手需要调用你的 AI 星图与日常计划数据。"
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Decision Assistant"
        title={
          <>
            过好你的<em className="font-display italic"> 每一天 </em>
          </>
        }
        sub="AI 按你的「日常计划（弹性版）」，陪你动态调整每天的选择，不搞死板时间表。"
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
                还没有日常数据，点「📋 我的日常」写下每日计划
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
    </div>
  );
}
