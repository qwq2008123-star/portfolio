import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useOS } from "../store/OSContext";
import { companionReply, detectMood } from "../engine/companion";
import { COMPANION_MODES, type ChatMessage, type CompanionMode } from "../types";
import { Card, GhostButton, TypeOut } from "../components/ui";

// ─── AI 情绪陪伴：四种模式 + 长期记忆引用 + 情绪记录 ───

const MOOD_TAGS = ["焦虑", "疲惫", "迷茫", "开心", "低落", "烦躁"];

export default function CompanionPage() {
  const { state, persona, dispatch } = useOS();
  const [mode, setMode] = useState<CompanionMode>("friend");
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages.length, pending]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: trimmed,
      mode,
      at: Date.now(),
    };
    dispatch({ type: "addMessage", msg: userMsg });
    setInput("");
    setPending(true);

    const mood = detectMood(trimmed);
    if (mood) dispatch({ type: "addMood", mood: mood.label });

    const reply = await companionReply(trimmed, mode, {
      profile: state.profile,
      persona,
      dailyPlan: state.dailyPlan,
      decisions: state.decisions,
      plans: state.plans,
      memories: state.memories,
      moods: state.moods,
      stats: state.stats,
    });
    dispatch({ type: "addMessage", msg: reply });
    setPending(false);
  };

  const quickMood = (m: string) => {
    dispatch({ type: "addMood", mood: m });
    void send(`我今天感觉有点${m}。`);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-6 lg:flex-row">
      {/* 左：模式 + 情绪 */}
      <div className="w-full shrink-0 space-y-6 lg:w-64">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-muted">陪伴模式</p>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {(Object.keys(COMPANION_MODES) as CompanionMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-2xl border px-4 py-3 text-left transition-all duration-300 ${
                  mode === m
                    ? "border-[#89AACC]/50 bg-[rgba(137,170,204,0.08)]"
                    : "border-stroke bg-surface/20 hover:border-stroke/80"
                }`}
              >
                <p className="text-sm text-text-primary">
                  {COMPANION_MODES[m].icon} {COMPANION_MODES[m].label}
                </p>
                <p className="mt-0.5 text-[11px] text-muted">{COMPANION_MODES[m].desc}</p>
              </button>
            ))}
          </div>
        </div>

        <Card className="hidden lg:block">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-muted">最近情绪</p>
          {state.moods.length === 0 ? (
            <p className="text-xs text-muted">还没有记录</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {state.moods.slice(0, 6).map((m, i) => (
                <span key={`${m.at}-${i}`} className="rounded-full border border-stroke px-2.5 py-1 text-[11px] text-muted">
                  {m.mood}
                </span>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 右：聊天区 */}
      <Card className="flex min-h-0 flex-1 flex-col p-0">
        <div className="border-b border-stroke px-6 py-4">
          <p className="text-sm text-text-primary">
            {COMPANION_MODES[mode].icon} {COMPANION_MODES[mode].label}
            <span className="ml-2 text-xs text-muted">
              {state.profile ? `记得你的目标：${state.profile.goals.slice(0, 16)}…` : "AI 正在了解你"}
            </span>
          </p>
        </div>

        {/* 消息流 */}
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
          {state.messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <span className="text-4xl">☾</span>
              <p className="text-sm text-muted">
                我是你的长期 AI 伙伴。我记得你的目标、决策和情绪变化。
                <br />
                任何时候想聊，我都在。
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {MOOD_TAGS.slice(0, 4).map((m) => (
                  <GhostButton key={m} onClick={() => quickMood(m)}>
                    今天有点{m}
                  </GhostButton>
                ))}
              </div>
            </div>
          )}

          {state.messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-3xl px-5 py-3.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "rounded-br-md bg-text-primary text-bg"
                    : "rounded-bl-md border border-stroke bg-bg/60 text-text-primary/90"
                }`}
              >
                {msg.role === "ai" ? (
                  <>
                    <TypeOut text={msg.text} />
                    {msg.memoryRefs && msg.memoryRefs.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-stroke pt-2.5">
                        {msg.memoryRefs.map((ref) => (
                          <span key={ref} className="rounded-full bg-[rgba(137,170,204,0.1)] px-2 py-0.5 text-[10px] text-[#89AACC]">
                            🧠 {ref}
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

          {pending && (
            <div className="flex justify-start">
              <div className="rounded-3xl rounded-bl-md border border-stroke bg-bg/60 px-5 py-3.5">
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
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* 输入区 */}
        <div className="border-t border-stroke px-6 py-4">
          <div className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void send(input)}
              placeholder={`以${COMPANION_MODES[mode].label}和我聊聊…`}
              className="flex-1 rounded-xl border border-stroke bg-bg px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-[#89AACC]/50"
            />
            <button
              onClick={() => void send(input)}
              disabled={!input.trim() || pending}
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
