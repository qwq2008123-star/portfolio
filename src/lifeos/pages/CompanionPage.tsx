import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOS } from "../store/OSContext";
import {
  IC_ROLES,
  ROLE_ORDER,
  recommendRole,
  buildDecisionSpace,
  orchestrator,
  type GuestAgent,
} from "../engine/innerCircle";
import { buildRoster, FIXED_MEMBERS } from "../engine/network";
import { MemberAvatar } from "../components/MemberAvatar";
import type { DecisionSpace, ICMemory, ICMessage, ICSession, MatchCandidate, RoleKey } from "../types";

// 自然语言指定角色：「我想和妈妈聊聊」「不想听建议，只想让朋友陪着」「让导师帮我分析」…
const ROLE_INTENT: Array<[RegExp, RoleKey]> = [
  [/(妈妈|母亲)/, "mother"],
  [/(导师|帮我分析|客观意见|客观地)/, "mentor"],
  [/(朋友|不想听建议|只想让朋友|陪着我)/, "friend"],
  [/(内在小孩|小时候的我自己|内心深处那个)/, "child"],
  [/(未来的?自己|十年后的我)/, "future"],
];

function detectRoleIntent(text: string): RoleKey | null {
  for (const [re, key] of ROLE_INTENT) if (re.test(text)) return key;
  return null;
}
import { Card, GhostButton, TypeOut } from "../components/ui";
import { PixelPerson } from "../components/PixelPerson";

// ─── AI Inner Circle｜内心圆桌：多角色陪伴支持系统 ───
// 圆桌场景 + 动态发言机制 + 角色关系记忆 + 用户控制权 + 讨论模式（自动/全员）

export default function CompanionPage() {
  const { state, persona, dispatch } = useOS();

  // ── 圆桌状态 ──
  const [session, setSession] = useState<ICSession | null>(null);
  const [icInput, setIcInput] = useState("");
  const [icPending, setIcPending] = useState(false);
  const [specified, setSpecified] = useState<RoleKey[]>([]);
  const [muted, setMuted] = useState<string[]>([]);
  // 队列化发送：回复生成期间再发的内容排队处理，永不丢失
  const queueRef = useRef<string[]>([]);
  const processingRef = useRef(false);
  const sessionRef = useRef<ICSession | null>(null);
  const specifiedRef = useRef<RoleKey[]>([]);
  const mutedRef = useRef<string[]>([]);
  const modeRef = useRef<"auto" | "all">("auto");
  const icMemoriesRef = useRef<ICMemory[]>([]);
  const guestsRef = useRef<GuestAgent[]>([]);
  const msgSeq = useRef(0);
  const [decision, setDecision] = useState<DecisionSpace | null>(null);
  const [decPending, setDecPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── 讨论模式：auto = 圆桌自动选择发言者；all = 全员一起讨论 ──
  const [mode, setMode] = useState<"auto" | "all">("auto");

  // 挂载时恢复上次圆桌会话（刷新不丢人物与历史）
  useEffect(() => {
    const last = state.innerCircle.sessions[0];
    if (last && last.messages.length > 0) {
      sessionRef.current = last;
      setSession(last);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    specifiedRef.current = specified;
    mutedRef.current = muted;
    modeRef.current = mode;
    icMemoriesRef.current = state.innerCircle.memories;
  }, [specified, muted, mode, state.innerCircle.memories]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages.length, icPending]);

  if (!state.profile || !persona) {
    return (
      <Card className="py-10 text-center text-muted">
        需要先建立人格档案，圆桌上的角色才能认识你。
      </Card>
    );
  }

  const icMemories = state.innerCircle.memories;
  const recommendation = recommendRole(icMemories, state.moods);

  // 被邀请进圆桌的来宾成员（人格网络里点「邀请加入圆桌」的）
  const guestAgents = useMemo<GuestAgent[]>(() => {
    if (!state.roundtableGuests?.length || !state.profile || !persona) return [];
    const byId = new Map<string, MatchCandidate>();
    [...buildRoster(state.profile, persona), ...FIXED_MEMBERS].forEach((c) => byId.set(c.id, c));
    return state.roundtableGuests
      .map((id) => byId.get(id))
      .filter((c): c is MatchCandidate => Boolean(c))
      .map((c) => ({
        id: c.id,
        name: c.name,
        mbti: c.mbti,
        role: c.type,
        gives: (c.customServices ?? []).map((sv) => sv.name).slice(0, 3).length
          ? (c.customServices ?? []).map((sv) => sv.name).slice(0, 3)
          : [c.type],
        intro: `${c.archetype} · ${c.role}`,
        avatarVariant: c.avatarVariant,
      }));
  }, [state.profile, persona, state.roundtableGuests]);

  useEffect(() => {
    guestsRef.current = guestAgents;
  }, [guestAgents]);

  // ── 圆桌发言（队列化：回复生成期间再发的内容排队处理，永不丢失） ──
  const profile = state.profile;
  const enqueueIC = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    setIcInput("");
    queueRef.current.push(trimmed);
    void drainQueue();
  };

  const drainQueue = async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIcPending(true);
    try {
      while (queueRef.current.length > 0) {
        const text = queueRef.current.shift()!;
        msgSeq.current += 1;

        // 自然语言指定角色（用户意图优先于自动评分）
        const intent = detectRoleIntent(text);
        const effectiveSpecified = intent ? [intent] : specifiedRef.current;
        if (intent) setSpecified([intent]);
        specifiedRef.current = effectiveSpecified;

        const userMsg: ICMessage = { id: `icu-${Date.now()}-${msgSeq.current}`, roleKey: "user", text, at: Date.now() };
        const baseMessages = [...(sessionRef.current?.messages ?? []), userMsg];
        const current: ICSession = sessionRef.current ?? {
          id: `ics-${Date.now()}`,
          startedAt: Date.now(),
          messages: baseMessages,
          primaryRole: effectiveSpecified[0] ?? recommendRole(icMemoriesRef.current, state.moods).role,
        };
        sessionRef.current = { ...current, messages: baseMessages };
        setSession(sessionRef.current);

        const reply = await orchestrator(text, baseMessages, {
          profile,
          persona,
          memories: icMemoriesRef.current,
          specified: effectiveSpecified,
          muted: mutedRef.current,
          guests: guestsRef.current,
          mode: modeRef.current,
        });

        const roleMessages: ICMessage[] = reply.messages.map((m, i) => ({
          id: `ica-${Date.now()}-${msgSeq.current}-${i}`,
          roleKey: m.roleKey,
          text: m.text,
          at: Date.now(),
          emotions: i === 0 ? reply.emotions : undefined,
          need: i === 0 ? reply.need : undefined,
        }));
        const next: ICSession = {
          ...current,
          messages: [...baseMessages, ...roleMessages],
          primaryRole: reply.primary,
        };
        sessionRef.current = next;
        setSession(next);

        // 持久化：会话 + 新记忆（observed 待确认）
        const newMemories = [
          ...reply.newMemories.map((m) => ({ ...m, roles: [reply.primary, ...m.roles] })),
          ...icMemoriesRef.current,
        ].slice(0, 200);
        icMemoriesRef.current = newMemories;
        dispatch({
          type: "icUpdate",
          memories: newMemories,
          sessions: [next, ...state.innerCircle.sessions.filter((s) => s.id !== next.id)].slice(0, 10),
        });
      }
    } finally {
      processingRef.current = false;
      setIcPending(false);
    }
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

  // 座位位置（画布百分比）
  const SEATS: Array<{ key: RoleKey; x: number; y: number }> = [
    { key: "mother", x: 50, y: 10 },
    { key: "mentor", x: 88, y: 36 },
    { key: "friend", x: 12, y: 36 },
    { key: "child", x: 80, y: 72 },
    { key: "future", x: 20, y: 72 },
  ];
  const lastPrimary = [...(session?.messages ?? [])].reverse().find((m) => m.roleKey !== "user");
  const speakingRole =
    lastPrimary && lastPrimary.roleKey !== "user" ? lastPrimary.roleKey : null;
  // 每个角色与用户的关系记忆（邀请成员卡片展示）
  const roleRelationship = (key: RoleKey): string | null => {
    const weight = { confirmed: 3, explicit: 2, observed: 1 } as const;
    const known = icMemories.filter((m) => m.roles.includes(key));
    if (!known.length) return null;
    return known.sort((a, b) => weight[b.kind] - weight[a.kind] || b.at - a.at)[0].content;
  };
  const roleStatus = (key: RoleKey) => {
    if (muted.includes(key)) return "silent";
    if (icPending && session && session.messages[session.messages.length - 1]?.roleKey === "user") return "thinking";
    if (lastPrimary && lastPrimary.roleKey === key) return "speaking";
    return "listening";
  };

  return (
    <div className="flex flex-col gap-6 xl:flex-row xl:h-[calc(100vh-11rem)]">
      {/* ── 主区：圆桌 + 对话（不被右栏高度拉伸） ── */}
      <Card className={`flex min-h-0 flex-1 flex-col self-start p-0 ${session ? "xl:h-[calc(100vh-11rem)]" : ""}`}>
        {session && (
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
          {/* 圆桌：发言时轻微转向发言者（镜头感） */}
          <div className="absolute left-1/2 top-[42%] h-[46%] w-[62%] -translate-x-1/2 -translate-y-1/2">
          <motion.div
            className="h-full w-full rounded-[50%] border border-[#E8C86A]/25"
            style={{
              background:
                "radial-gradient(ellipse at 50% 40%, rgba(232,200,106,0.10), rgba(90,70,40,0.08) 60%, transparent 75%)",
              boxShadow: "inset 0 0 60px rgba(232,200,106,0.08), 0 0 50px rgba(232,200,106,0.05)",
            }}
            animate={{ x: (() => {
              if (!speakingRole || speakingRole === "user") return 0;
              const seatIdx = SEATS.findIndex((s2) => s2.key === speakingRole);
              if (seatIdx >= 0) return (SEATS[seatIdx].x - 50) * 3;
              const guestIdx = guestAgents.findIndex((g) => g.id === speakingRole);
              return guestIdx >= 0 ? (guestAgents[guestIdx].id === speakingRole && guestIdx === 0 ? -30 : 30) : 0;
            })() }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />
          </div>
          {/* 灯光聚焦（发言者以外压暗） */}
          <AnimatePresence>
            {(speakingRole === "user" || speakingRole) && (() => {
              const seatIdx = SEATS.findIndex((s2) => s2.key === speakingRole);
              const guestIdx = guestAgents.findIndex((g) => g.id === speakingRole);
              const sx = seatIdx >= 0 ? SEATS[seatIdx].x : guestIdx >= 0 ? (guestIdx === 0 ? 28 : 72) : 50;
              const sy = seatIdx >= 0 ? SEATS[seatIdx].y : guestIdx >= 0 ? 76 : 42;
              return (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
                  className="pointer-events-none absolute inset-0 z-[5]"
                  style={{
                    background: `radial-gradient(ellipse 38% 42% at ${sx}% ${sy}%, transparent 40%, rgba(0,0,0,0.5) 100%)`,
                  }}
                />
              );
            })()}
          </AnimatePresence>

          {/* 角色座位 */}
          {SEATS.map((seat) => {
            const def = IC_ROLES[seat.key];
            const status = roleStatus(seat.key);
            const dim = status === "silent" || muted.includes(seat.key);
            return (
              <motion.button
                key={seat.key}
                onClick={() =>
                  setSpecified(
                    specified.includes(seat.key)
                      ? specified.filter((k) => k !== seat.key)
                      : [...specified, seat.key],
                  )
                }
                title={muted.includes(seat.key) ? "已静音，点击恢复" : `邀请${def.label}加入讨论`}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2 focus:outline-none"
                style={{ left: `${seat.x}%`, top: `${seat.y}%` }}
                animate={{
                  opacity: dim
                    ? 0.3
                    : speakingRole
                      ? seat.key === speakingRole
                        ? 1
                        : 0.45
                      : 1,
                }}
                transition={{ duration: 0.6 }}
              >
                <motion.div
                  animate={{ scale: status === "speaking" ? 1.12 : 1 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col items-center"
                >
                  <div className={status === "speaking" ? "pixel-speaking" : "pixel-idle"}>
                    <PixelPerson variant={seat.key} size={58} speaking={status === "speaking"} />
                  </div>
                  <p className="mt-1 whitespace-nowrap text-[10px]" style={{ color: status === "speaking" ? def.hue : undefined }}>
                    {def.label}
                    <span className="ml-1 text-[8px] text-muted/80">{def.mbti}</span>
                  </p>
                  {status === "speaking" && (
                    <span className="text-[8px] uppercase tracking-widest" style={{ color: def.hue }}>
                      speaking
                    </span>
                  )}
                  {muted.includes(seat.key) && <span className="text-[8px] text-muted/60">已静音</span>}
                  {specified.includes(seat.key) && !muted.includes(seat.key) && (
                    <span className="mt-0.5 rounded-full border border-[#89AACC]/50 px-1.5 text-[8px] text-[#89AACC]">
                      TA 来陪你
                    </span>
                  )}
                </motion.div>
              </motion.button>
            );
          })}
          {/* 来宾座位（从人格网络邀请的成员） */}
          {guestAgents.slice(0, 2).map((g, gi) => {
            const pos = gi === 0 ? { x: 26, y: 76 } : { x: 74, y: 76 };
            const dim = muted.includes(g.id);
            const isSpeaking = speakingRole === g.id;
            return (
              <motion.div
                key={g.id}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${pos.x}%`, top: `${pos.y}%`, opacity: dim ? 0.3 : 1 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: dim ? 0.3 : 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex flex-col items-center">
                  <div
                    className="overflow-hidden rounded-full border-2"
                    style={{
                      borderColor: isSpeaking ? "#E8C86A" : "rgba(137,170,204,0.4)",
                      boxShadow: isSpeaking ? "0 0 20px rgba(232,200,106,0.5)" : "none",
                    }}
                  >
                    {g.avatarVariant ? (
                      <MemberAvatar variant={g.avatarVariant} size={44} />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0B1020] text-sm text-text-primary">
                        {g.name.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <p className="mt-1 whitespace-nowrap text-[10px] text-text-primary/90">{g.name}</p>
                  <p className="text-[9px] text-muted">{g.mbti} · {g.role}</p>
                  {isSpeaking && (
                    <span className="text-[8px] uppercase tracking-widest text-[#E8C86A]">speaking</span>
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* 用户座位 */}
          <div className="absolute bottom-[4%] left-1/2 z-10 -translate-x-1/2">
            <div className="flex flex-col items-center">
              <div className="pixel-idle">
                <PixelPerson variant="user" size={54} />
              </div>
              <p className="mt-1 text-[10px] text-muted">{state.profile.name || "你"}（你）</p>
            </div>
          </div>
        </div>
        )}

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
                  <GhostButton onClick={() => setSpecified([recommendation.role])}>
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
                const label = def ? `${def.icon} ${def.label}` : `⬡ ${m.name ?? "来宾"}`;
                const hue = def?.hue ?? m.hue ?? "#89AACC";
                const isLast = i === session.messages.length - 1;
                return (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                    <div className="max-w-[85%]">
                      <p className="mb-1 text-[10px]" style={{ color: hue }}>
                        {label}
                      </p>
                      <div
                        className="rounded-3xl rounded-bl-md border px-5 py-3.5 text-sm leading-relaxed"
                        style={{ borderColor: `${hue}44`, background: "rgba(11,16,32,0.7)" }}
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
                      <span className="text-xs text-muted">
                        圆桌正在倾听…{queueRef.current.length > 0 && `（还有 ${queueRef.current.length} 条排队）`}
                      </span>
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
                onKeyDown={(e) => { if (e.key === "Enter") enqueueIC(icInput); }}
                placeholder={
                  specified.length === 1
                    ? `和${IC_ROLES[specified[0]].label}聊聊…`
                    : specified.length > 1
                      ? `和${specified.length}位成员一起聊…`
                      : "说什么都行，圆桌会判断谁来回应…"
                }
                className="flex-1 rounded-xl border border-stroke bg-bg px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-[#89AACC]/50"
              />
              <button
                onClick={() => enqueueIC(icInput)}
                disabled={!icInput.trim()}
                className="accent-gradient rounded-xl px-5 text-sm font-medium text-bg transition-opacity disabled:opacity-40"
              >
                发送
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* ── 右栏：推荐 / 邀请成员 / 记忆 / 讨论模式 ── */}
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
              const isSpec = specified.includes(key);
              return (
                <div
                  key={key}
                  className={`rounded-2xl border p-3 transition-colors ${
                    isSpec && !isMuted ? "border-[#89AACC]/50 bg-[rgba(137,170,204,0.08)]" : "border-stroke bg-bg/40"
                  } ${isMuted ? "opacity-45" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() =>
                        setSpecified(
                          isSpec ? specified.filter((k) => k !== key) : [...specified, key],
                        )
                      }
                      className="text-left"
                    >
                      <p className="text-xs text-text-primary">
                        {def.icon} {def.label}
                      </p>
                      <p className="text-[10px] text-muted">
                        {def.en} · <span style={{ color: def.hue }}>{def.mbti}</span>
                      </p>
                    </button>
                    <button
                      onClick={() => {
                        setMuted((m) => (isMuted ? m.filter((k) => k !== key) : [...m, key]));
                        if (isSpec) setSpecified(specified.filter((k) => k !== key));
                      }}
                      className="text-[9px] text-muted transition-colors hover:text-text-primary"
                    >
                      {isMuted ? "取消静音" : "静音"}
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted/80">{def.desc}</p>
                  <p className="mt-1.5 border-t border-stroke/60 pt-1.5 text-[10px] italic leading-relaxed text-muted/70">
                    {(() => {
                      const rel = roleRelationship(key);
                      return rel ? `TA 记得：${rel}` : "TA 还在认识你…";
                    })()}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* 来宾管理 */}
        {guestAgents.length > 0 && (
          <Card>
            <p className="mb-1 text-sm text-text-primary">来宾 · 已在圆桌</p>
            <p className="mb-3 text-[11px] text-muted">从人格网络邀请的成员，正在旁听圆桌讨论</p>
            <div className="space-y-2">
              {guestAgents.map((g) => (
                <div key={g.id} className={`rounded-xl border p-2.5 ${muted.includes(g.id) ? "border-stroke opacity-45" : "border-[#89AACC]/30 bg-bg/60"}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-text-primary">{g.name} <span className="text-[9px] text-muted">{g.mbti}</span></p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setMuted((m) => (m.includes(g.id) ? m.filter((k) => k !== g.id) : [...m, g.id]))}
                        className="text-[9px] text-muted hover:text-text-primary"
                      >
                        {muted.includes(g.id) ? "取消静音" : "静音"}
                      </button>
                      <button
                        onClick={() => dispatch({ type: "toggleRoundtableGuest", id: g.id })}
                        className="text-[9px] text-rose-400/80 hover:text-rose-400"
                      >
                        移出
                      </button>
                    </div>
                  </div>
                  <p className="mt-0.5 text-[9px] text-muted/70">{g.role} · 可交换：{g.gives.join("、")}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

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

        <Card>
          <p className="mb-1 text-sm text-text-primary">讨论模式</p>
          <p className="mb-3 text-[11px] text-muted">{mode === "auto" ? "圆桌自动判断谁来发言" : "全员一起讨论"}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode("auto")}
              className={`rounded-xl border px-3 py-2 text-[11px] transition-colors ${
                mode === "auto"
                  ? "border-[#89AACC]/50 bg-[rgba(137,170,204,0.08)] text-[#89AACC]"
                  : "border-stroke text-muted hover:text-text-primary"
              }`}
            >
              自动圆桌
            </button>
            <button
              onClick={() => setMode("all")}
              className={`rounded-xl border px-3 py-2 text-[11px] transition-colors ${
                mode === "all"
                  ? "border-[#89AACC]/50 bg-[rgba(137,170,204,0.08)] text-[#89AACC]"
                  : "border-stroke text-muted hover:text-text-primary"
              }`}
            >
              全员一起讨论
            </button>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-muted/70">
            可同时勾选多位成员——选中的会按顺序依次发言；全部取消勾选则恢复自动判断。
          </p>
        </Card>
      </div>

    </div>
  );
}
