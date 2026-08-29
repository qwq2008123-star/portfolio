import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOS } from "../store/OSContext";
import { companionReply, detectMood } from "../engine/companion";
import {
  IC_ROLES,
  ROLE_ORDER,
  recommendRole,
  buildDecisionSpace,
  orchestrator,
} from "../engine/innerCircle";
import { COMPANION_MODES, type ChatMessage, type CompanionMode, type DecisionSpace, type ICMessage, type ICSession, type RoleKey } from "../types";
import { Card, GhostButton, TypeOut } from "../components/ui";

// ─── AI Inner Circle｜内心圆桌：多角色陪伴支持系统 ───
// 圆桌场景 + 动态发言机制 + 角色关系记忆 + 用户控制权 + 快速聊天（旧模式保留）

export default function CompanionPage() {
  const { state, persona, dispatch } = useOS();

  // ── 圆桌状态 ──
  const [session, setSession] = useState<ICSession | null>(null);
  const [icInput, setIcInput] = useState("");
  const [icPending, setIcPending] = useState(false);
  const [specified, setSpecified] = useState<RoleKey | null>(null);
  const [muted, setMuted] = useState<RoleKey[]>([]);
  const [decision, setDecision] = useState<DecisionSpace | null>(null);
  const [decPending, setDecPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── 快速聊天（旧四模式，保留入口） ──
  const [quickChat, setQuickChat] = useState(false);
  const [mode, setMode] = useState<CompanionMode>("friend");
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const bottomRef2 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages.length, icPending]);
  useEffect(() => {
    bottomRef2.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages.length, pending]);

  if (!state.profile || !persona) {
    return (
      <Card className="py-10 text-center text-muted">
        需要先建立人格档案，圆桌上的角色才能认识你。
      </Card>
    );
  }

  const icMemories = state.innerCircle.memories;
  const recommendation = recommendRole(icMemories, state.moods);

  // ── 圆桌发言 ──
  const profile = state.profile;
  const sendIC = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || icPending) return;
    setIcInput("");

    const userMsg: ICMessage = { id: `icu-${Date.now()}`, roleKey: "user", text: trimmed, at: Date.now() };
    const baseMessages = [...(session?.messages ?? []), userMsg];
    const current: ICSession = session ?? {
      id: `ics-${Date.now()}`,
      startedAt: Date.now(),
      messages: baseMessages,
      primaryRole: specified ?? recommendRole(icMemories, state.moods).role,
    };
    setSession(current);
    setIcPending(true);

    const reply = await orchestrator(trimmed, current.messages, {
      profile,
      persona,
      memories: icMemories,
      specified,
      muted,
    });

    const roleMessages: ICMessage[] = reply.messages.map((m, i) => ({
      id: `ica-${Date.now()}-${i}`,
      roleKey: m.roleKey,
      text: m.text,
      at: Date.now(),
      emotions: i === 0 ? reply.emotions : undefined,
      need: i === 0 ? reply.need : undefined,
    }));
    const next: ICSession = {
      ...current,
      messages: [...current.messages, ...roleMessages],
      primaryRole: reply.primary,
    };
    setSession(next);
    setIcPending(false);

    // 持久化：会话 + 新记忆（observed 待确认）
    const newMemories = [
      ...reply.newMemories.map((m) => ({ ...m, roles: [reply.primary, ...m.roles] })),
      ...icMemories,
    ].slice(0, 200);
    dispatch({
      type: "icUpdate",
      memories: newMemories,
      sessions: [next, ...state.innerCircle.sessions.filter((s) => s.id !== next.id)].slice(0, 10),
    });
  };

  const confirmMemory = (id: string) => {
    dispatch({
      type: "icUpdate",
      memories: icMemories.map((m) =>
        m.id === id ? { ...m, kind: "confirmed" as const, confidence: 1, confirmedAt: Date.now() } : m,
      ),
    });
  };
  const deleteMemory = (id: string) => {
    dispatch({ type: "icUpdate", memories: icMemories.filter((m) => m.id !== id) });
  };

  const openDecision = async () => {
    if (!session || decPending) return;
    setDecPending(true);
    const ds = await buildDecisionSpace(session.messages);
    setDecision(ds);
    setDecPending(false);
  };

  // ── 快速聊天（旧模式） ──
  const sendQuick = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text: trimmed, mode, at: Date.now() };
    dispatch({ type: "addMessage", msg: userMsg });
    setInput("");
    setPending(true);
    const mood = detectMood(trimmed);
    if (mood) dispatch({ type: "addMood", mood: mood.label });
    const reply = await companionReply(trimmed, mode, {
      profile: state.profile, persona, dailyPlan: state.dailyPlan, decisions: state.decisions,
      plans: state.plans, memories: state.memories, moods: state.moods, stats: state.stats,
    });
    dispatch({ type: "addMessage", msg: reply });
    setPending(false);
  };

  // 座位位置（画布百分比）
  const SEATS: Array<{ key: RoleKey; x: number; y: number }> = [
    { key: "mother", x: 50, y: 10 },
    { key: "mentor", x: 88, y: 36 },
    { key: "friend", x: 12, y: 36 },
    { key: "child", x: 80, y: 72 },
    { key: "future", x: 20, y: 72 },
  ];
  const lastPrimary = [...(session?.messages ?? [])].reverse().find((m) => m.roleKey !== "user");
  const roleStatus = (key: RoleKey) => {
    if (muted.includes(key)) return "silent";
    if (icPending && session && session.messages[session.messages.length - 1]?.roleKey === "user") return "thinking";
    if (lastPrimary && lastPrimary.roleKey === key) return "speaking";
    return "listening";
  };

  return (
    <div className="flex flex-col gap-6 xl:flex-row">
      {/* ── 主区：圆桌 + 对话 ── */}
      <Card className="flex min-h-0 flex-1 flex-col p-0">
        {/* 圆桌场景 */}
        <div className="relative h-[300px] shrink-0 overflow-hidden rounded-t-3xl border-b border-stroke">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 42%, rgba(232,200,106,0.13), transparent 55%)," +
                "radial-gradient(ellipse at 50% 50%, rgba(137,170,204,0.06), transparent 65%)," +
                "#070609",
            }}
          />
          {/* 圆桌 */}
          <div
            className="absolute left-1/2 top-[42%] h-[46%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-[#E8C86A]/25"
            style={{
              background:
                "radial-gradient(ellipse at 50% 40%, rgba(232,200,106,0.10), rgba(90,70,40,0.08) 60%, transparent 75%)",
              boxShadow: "inset 0 0 60px rgba(232,200,106,0.08), 0 0 50px rgba(232,200,106,0.05)",
            }}
          />
          {/* 角色座位 */}
          {SEATS.map((seat) => {
            const def = IC_ROLES[seat.key];
            const status = roleStatus(seat.key);
            const dim = status === "silent" || muted.includes(seat.key);
            return (
              <motion.button
                key={seat.key}
                onClick={() => setSpecified(specified === seat.key ? null : seat.key)}
                title={muted.includes(seat.key) ? "已静音，点击恢复" : `邀请${def.label}发言`}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2 focus:outline-none"
                style={{ left: `${seat.x}%`, top: `${seat.y}%` }}
                animate={{ opacity: dim ? 0.3 : 1 }}
                transition={{ duration: 0.4 }}
              >
                <motion.div
                  animate={{ scale: status === "speaking" ? 1.1 : 1 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col items-center"
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full border text-lg backdrop-blur-md"
                    style={{
                      borderColor: status === "speaking" ? def.hue : "rgba(137,170,204,0.3)",
                      background: "rgba(11,16,32,0.85)",
                      boxShadow: status === "speaking" ? `0 0 26px ${def.hue}88` : "none",
                    }}
                  >
                    {def.icon}
                  </div>
                  <p className="mt-1 whitespace-nowrap text-[10px]" style={{ color: status === "speaking" ? def.hue : undefined }}>
                    {def.label}
                  </p>
                  {status === "speaking" && (
                    <span className="text-[8px] uppercase tracking-widest" style={{ color: def.hue }}>
                      speaking
                    </span>
                  )}
                  {muted.includes(seat.key) && <span className="text-[8px] text-muted/60">已静音</span>}
                  {specified === seat.key && !muted.includes(seat.key) && (
                    <span className="mt-0.5 rounded-full border border-[#89AACC]/50 px-1.5 text-[8px] text-[#89AACC]">
                      TA 来陪你
                    </span>
                  )}
                </motion.div>
              </motion.button>
            );
          })}
          {/* 用户座位 */}
          <div className="absolute bottom-[4%] left-1/2 z-10 -translate-x-1/2">
            <div className="flex flex-col items-center">
              <div className="accent-gradient flex h-12 w-12 items-center justify-center rounded-full p-[2px]">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0A0F1E] text-sm">
                  {(state.profile.name || "你").slice(0, 1)}
                </div>
              </div>
              <p className="mt-1 text-[10px] text-muted">{state.profile.name || "你"}（你）</p>
            </div>
          </div>
        </div>

        {/* 对话区 */}
        <div className="flex min-h-0 flex-1 flex-col">
          {!session || session.messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-8 text-center">
              <p className="font-display text-2xl italic text-text-primary">今晚，你想让谁陪你聊聊？</p>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 max-w-md rounded-2xl border border-[#E8C86A]/30 bg-[rgba(232,200,106,0.06)] p-4"
              >
                <p className="text-xs leading-relaxed text-text-primary/90">
                  <span className="mr-1.5">{IC_ROLES[recommendation.role].icon}</span>
                  我觉得今晚的你，可能需要
                  <span className="font-medium text-[#89AACC]">{IC_ROLES[recommendation.role].label}</span>——
                  {recommendation.reason}
                </p>
                <div className="mt-3 flex justify-center">
                  <GhostButton onClick={() => setSpecified(recommendation.role)}>
                    和{IC_ROLES[recommendation.role].label}聊聊
                  </GhostButton>
                </div>
              </motion.div>
              <p className="mt-3 max-w-md text-[10px] leading-relaxed text-muted/70">
                圆桌是情绪陪伴与思考的空间，不是心理诊断。你随时可以指定角色、静音角色，或者只说「我今天真的好累」。
              </p>
            </div>
          ) : (
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {session.messages.map((m, i) => {
                if (m.roleKey === "user") {
                  return (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[80%] rounded-3xl rounded-br-md bg-text-primary px-5 py-3 text-sm text-bg">
                        {m.text}
                      </div>
                    </div>
                  );
                }
                const def = IC_ROLES[m.roleKey as RoleKey];
                const isLast = i === session.messages.length - 1;
                return (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                    <div className="max-w-[85%]">
                      <p className="mb-1 text-[10px]" style={{ color: def.hue }}>
                        {def.icon} {def.label}
                      </p>
                      <div
                        className="rounded-3xl rounded-bl-md border px-5 py-3.5 text-sm leading-relaxed"
                        style={{ borderColor: `${def.hue}44`, background: "rgba(11,16,32,0.7)" }}
                      >
                        {isLast ? <TypeOut text={m.text} /> : <span className="whitespace-pre-wrap">{m.text}</span>}
                      </div>
                      {m.emotions && m.emotions.length > 0 && (
                        <p className="mt-1 text-[9px] text-muted/60">
                          情绪：{m.emotions.map((e) => `${e.label} ${e.score.toFixed(1)}`).join(" · ")}
                          {m.need && ` · 最需要的：${m.need}`}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              {icPending && (
                <div className="flex justify-start">
                  <div className="rounded-3xl rounded-bl-md border border-stroke bg-bg/60 px-5 py-3.5">
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
                      <span className="text-xs text-muted">圆桌正在倾听…</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {/* 决策空间 */}
          <AnimatePresence>
            {decision && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mx-6 mb-3 rounded-2xl border border-[#89AACC]/30 bg-[rgba(137,170,204,0.06)] p-4"
              >
                <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-[#89AACC]">决策空间</p>
                <div className="grid gap-2 text-[11px] leading-relaxed sm:grid-cols-2">
                  <p className="text-text-primary/90"><span className="text-[#89AACC]">我真正想要：</span>{decision.want}</p>
                  <p className="text-text-primary/90"><span className="text-[#89AACC]">我害怕：</span>{decision.fear}</p>
                  {decision.facts.length > 0 && (
                    <p className="text-muted sm:col-span-2"><span className="text-[#89AACC]">已知事实：</span>{decision.facts.join("；")}</p>
                  )}
                  {decision.risks.length > 0 && (
                    <p className="text-muted sm:col-span-2"><span className="text-amber-400/80">风险：</span>{decision.risks.join("；")}</p>
                  )}
                  {decision.options.length > 0 && (
                    <p className="text-muted sm:col-span-2"><span className="text-[#89AACC]">可选方案：</span>{decision.options.join("；")}</p>
                  )}
                  {decision.next.length > 0 && (
                    <p className="text-muted sm:col-span-2"><span className="text-[#89AACC]">下一步：</span>{decision.next.join("；")}</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 输入区 */}
          <div className="border-t border-stroke px-6 py-4">
            {session && session.messages.length >= 6 && !decision && (
              <div className="mb-3 flex justify-center">
                <button
                  onClick={() => void openDecision()}
                  disabled={decPending}
                  className="rounded-full border border-[#89AACC]/50 px-4 py-1.5 text-[11px] text-[#89AACC] transition-colors hover:bg-[rgba(137,170,204,0.1)] disabled:opacity-50"
                >
                  {decPending ? "正在整理…" : "✦ 整理决策空间"}
                </button>
              </div>
            )}
            <div className="flex gap-3">
              <input
                value={icInput}
                onChange={(e) => setIcInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void sendIC(icInput)}
                placeholder={specified ? `和${IC_ROLES[specified].label}聊聊…` : "说什么都行，圆桌会判断谁来回应…"}
                className="flex-1 rounded-xl border border-stroke bg-bg px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-[#89AACC]/50"
              />
              <button
                onClick={() => void sendIC(icInput)}
                disabled={!icInput.trim() || icPending}
                className="accent-gradient rounded-xl px-5 text-sm font-medium text-bg transition-opacity disabled:opacity-40"
              >
                发送
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* ── 右栏：推荐 / 邀请成员 / 记忆 / 快速聊天 ── */}
      <div className="w-full shrink-0 space-y-5 xl:w-72">
        {!session && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-[#E8C86A]/30 bg-[rgba(232,200,106,0.06)] p-4"
          >
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#E8C86A]">今晚的推荐</p>
            <p className="mt-2 text-sm text-text-primary">
              {IC_ROLES[recommendation.role].icon} {IC_ROLES[recommendation.role].label}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">{recommendation.reason}</p>
          </motion.div>
        )}

        <Card>
          <p className="mb-1 text-sm text-text-primary">邀请成员</p>
          <p className="mb-3 text-[11px] text-muted">点击邀请发言，再次点击恢复自动</p>
          <div className="space-y-2">
            {ROLE_ORDER.map((key) => {
              const def = IC_ROLES[key];
              const isMuted = muted.includes(key);
              const isSpec = specified === key;
              return (
                <div
                  key={key}
                  className={`rounded-2xl border p-3 transition-colors ${
                    isSpec && !isMuted ? "border-[#89AACC]/50 bg-[rgba(137,170,204,0.08)]" : "border-stroke bg-bg/40"
                  } ${isMuted ? "opacity-45" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <button onClick={() => setSpecified(isSpec ? null : key)} className="text-left">
                      <p className="text-xs text-text-primary">
                        {def.icon} {def.label}
                      </p>
                      <p className="text-[10px] text-muted">{def.en}</p>
                    </button>
                    <button
                      onClick={() => {
                        setMuted((m) => (isMuted ? m.filter((k) => k !== key) : [...m, key]));
                        if (isSpec) setSpecified(null);
                      }}
                      className="text-[9px] text-muted transition-colors hover:text-text-primary"
                    >
                      {isMuted ? "取消静音" : "静音"}
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted/80">{def.desc}</p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <p className="mb-1 text-sm text-text-primary">记得你的事</p>
          <p className="mb-3 text-[11px] text-muted">圆桌的长期记忆，你可以确认或删除</p>
          {icMemories.length === 0 ? (
            <p className="text-xs text-muted">随着对话积累，这里会记住你的重要经历与模式。</p>
          ) : (
            <div className="space-y-2">
              {icMemories.slice(0, 8).map((m) => (
                <div key={m.id} className="rounded-xl border border-stroke bg-bg/60 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] leading-relaxed text-text-primary/90">{m.content}</p>
                    <button onClick={() => deleteMemory(m.id)} className="shrink-0 text-[10px] text-muted/60 hover:text-text-primary">✕</button>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className={`rounded-full px-1.5 py-0.5 text-[8px] ${
                      m.kind === "confirmed"
                        ? "bg-emerald-400/15 text-emerald-400"
                        : m.kind === "explicit"
                          ? "bg-[rgba(137,170,204,0.15)] text-[#89AACC]"
                          : "bg-amber-400/10 text-amber-400/90"
                    }`}>
                      {m.kind === "confirmed" ? "你确认过" : m.kind === "explicit" ? "你说的" : "我注意到的"}
                    </span>
                    {m.kind === "observed" && (
                      <button onClick={() => confirmMemory(m.id)} className="text-[9px] text-[#89AACC] hover:underline">
                        确认是这样
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <GhostButton onClick={() => setQuickChat((q) => !q)} className="w-full">
          {quickChat ? "返回内心圆桌" : "快速聊天（旧版单 AI）"}
        </GhostButton>
      </div>

      {/* 快速聊天浮层 */}
      <AnimatePresence>
        {quickChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
            onClick={() => setQuickChat(false)}
          >
            <Card className="flex h-[80vh] w-full max-w-2xl flex-col p-0" >
              <div className="flex items-center justify-between border-b border-stroke px-6 py-4">
                <div>
                  <p className="text-sm text-text-primary">快速聊天</p>
                  <p className="text-[10px] text-muted">单 AI · 四种模式 · 旧版入口</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {(Object.keys(COMPANION_MODES) as CompanionMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`rounded-full px-2.5 py-1 text-[10px] transition-colors ${
                        mode === m ? "bg-[rgba(137,170,204,0.15)] text-[#89AACC]" : "text-muted hover:text-text-primary"
                      }`}
                    >
                      {COMPANION_MODES[m].icon} {COMPANION_MODES[m].label}
                    </button>
                  ))}
                  <button
                    onClick={() => setQuickChat(false)}
                    className="ml-2 rounded-full border border-stroke px-2 py-0.5 text-xs text-muted hover:text-text-primary"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                {state.messages.length === 0 && (
                  <p className="py-10 text-center text-sm text-muted">和单 AI 快速聊两句——深度的谈话请回到圆桌。</p>
                )}
                {state.messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-3xl px-5 py-3 text-sm leading-relaxed ${
                        msg.role === "user" ? "rounded-br-md bg-text-primary text-bg" : "rounded-bl-md border border-stroke bg-bg/60 text-text-primary/90"
                      }`}
                    >
                      {msg.role === "ai" ? <TypeOut text={msg.text} /> : msg.text}
                    </div>
                  </div>
                ))}
                {pending && (
                  <div className="flex justify-start">
                    <div className="rounded-3xl rounded-bl-md border border-stroke bg-bg/60 px-5 py-3">
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
                <div ref={bottomRef2} />
              </div>
              <div className="border-t border-stroke px-6 py-4">
                <div className="flex gap-3">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void sendQuick(input)}
                    placeholder="快速聊两句…"
                    className="flex-1 rounded-xl border border-stroke bg-bg px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-[#89AACC]/50"
                  />
                  <button
                    onClick={() => void sendQuick(input)}
                    disabled={!input.trim() || pending}
                    className="accent-gradient rounded-xl px-5 text-sm font-medium text-bg transition-opacity disabled:opacity-40"
                  >
                    发送
                  </button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
