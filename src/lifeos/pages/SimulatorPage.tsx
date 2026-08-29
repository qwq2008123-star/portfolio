import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOS } from "../store/OSContext";
import {
  DIM_META,
  simulateDeep,
  type DimKey,
  type SimResult,
  type SimRoute,
} from "../engine/simulator";
import { getLLM } from "../engine/llm";
import {
  Card,
  EmptyState,
  GhostButton,
  GradientButton,
  ProgressBar,
  SectionTitle,
} from "../components/ui";

// ─── AI 人生多维决策模拟器：看见不同选择之后的人生 ───

const EXAMPLES = [
  "我该不该创业？",
  "我要不要考研？",
  "我要不要出国？",
  "我要不要辞职？",
  "我要不要换城市？",
  "我要不要转专业？",
  "要不要继续这段感情？",
  "要不要做自由职业？",
  "我要不要休学？",
];

const THINK_STAGES = [
  "正在理解你的当前状态…",
  "结合人格档案推演人生路线…",
  "模拟关键事件与连锁反应…",
  "生成风险闭环与行动建议…",
];

const AXIS_META: Array<{ key: keyof SimRoute["axes"]; label: string; invert?: boolean }> = [
  { key: "opportunity", label: "机会收益" },
  { key: "growth", label: "成长速度" },
  { key: "risk", label: "风险水平" },
  { key: "stress", label: "压力水平" },
  { key: "freedom", label: "自由度" },
];

const TONE_STYLE: Record<string, { border: string; text: string; dot: string }> = {
  optimistic: { border: "border-emerald-400/40", text: "text-emerald-400", dot: "🟢" },
  baseline: { border: "border-amber-400/40", text: "text-amber-400", dot: "🟡" },
  stress: { border: "border-rose-400/40", text: "text-rose-400", dot: "🔴" },
};

const EVENT_BADGE: Record<string, string> = { warning: "⚠️", good: "🟢", decision: "🎲" };

function SectionLabel({ children }: { children: string }) {
  return <p className="mb-2.5 text-[10px] uppercase tracking-[0.25em] text-muted">{children}</p>;
}

export default function SimulatorPage() {
  const { state, persona, dispatch } = useOS();
  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState<"input" | "thinking" | "done">("input");
  const [result, setResult] = useState<SimResult | null>(null);
  const [activeRoute, setActiveRoute] = useState(0);
  const [openEvent, setOpenEvent] = useState<number | null>(0);
  const [elapsed, setElapsed] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);

  // 思考阶段动画计时
  useEffect(() => {
    if (phase !== "thinking") return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const run = async (q: string) => {
    if (!q.trim() || !state.profile || !persona || phase === "thinking") return;
    setQuestion(q);
    setPhase("thinking");
    setResult(null);
    try {
      const res = await simulateDeep(q, state.profile, persona);
      setResult(res);
      setActiveRoute(0);
      setOpenEvent(0);
      setPhase("done");
      dispatch({ type: "countSimulation" });
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    } catch {
      setPhase("input");
    }
  };

  if (!state.profile || !persona) {
    return (
      <EmptyState
        icon="∿"
        title="需要先建立人格档案"
        sub="模拟器会基于你的人格、目标、能力与处境推演不同选择的人生路径。"
      />
    );
  }

  const route: SimRoute | null = result?.routes[activeRoute] ?? null;
  const thinkStage = THINK_STAGES[Math.min(Math.floor(elapsed / 8), THINK_STAGES.length - 1)];

  return (
    <div>
      <SectionTitle
        eyebrow="Future Simulator"
        title={
          <>
            看见不同选择背后的<em className="font-display italic"> 人生 </em>
          </>
        }
        sub="不是预测未来，也不是替你决定——基于你的人格、目标与处境，模拟每条路线的人生路径、关键事件、代价与成长。"
      />

      {/* 输入区 */}
      <Card>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="输入困扰你的人生选择，例如：「我该不该创业？」"
          className="min-h-16 w-full resize-none rounded-xl border border-stroke bg-bg px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-[#89AACC]/50"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void run(question);
            }
          }}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setQuestion(ex)}
                disabled={phase === "thinking"}
                className="rounded-full border border-stroke px-2.5 py-1 text-[10px] text-muted transition-colors hover:border-[#89AACC]/50 hover:text-text-primary disabled:opacity-40"
              >
                {ex}
              </button>
            ))}
          </div>
          <GradientButton onClick={() => void run(question)} disabled={phase === "thinking" || !question.trim()}>
            {phase === "thinking" ? "模拟中…" : "开始人生模拟"}
          </GradientButton>
        </div>
      </Card>

      {/* 思考中 */}
      {phase === "thinking" && (
        <Card className="mt-6">
          <div className="flex flex-col items-center gap-3 py-8">
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
            <p className="text-sm text-text-primary">{thinkStage}</p>
            <p className="text-xs tabular-nums text-muted">
              {elapsed}s · 深度模拟需要 20-60 秒，请稍候
            </p>
            <div className="w-56">
              <ProgressBar value={Math.min(elapsed * 2.2, 92)} />
            </div>
          </div>
        </Card>
      )}

      {/* 结果 */}
      {phase === "done" && result && route && (
        <div ref={resultRef} className="mt-6 space-y-6">
          {/* 结果头 */}
          <Card glow>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-muted">模拟结果</p>
                <h2 className="mt-1 font-display text-2xl italic text-text-primary">「{result.question}」</h2>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] ${
                    result.by === "remote" ? "border-[#89AACC]/40 text-[#89AACC]" : "border-stroke text-muted"
                  }`}
                >
                  {result.by === "remote" ? `⚡ ${getLLM().name}` : "本地推演引擎"}
                </span>
                <GhostButton onClick={() => setPhase("input")}>重新模拟</GhostButton>
              </div>
            </div>
            {result.understanding && (
              <div className="mt-4 rounded-2xl border border-stroke bg-bg/60 p-4">
                <SectionLabel>AI 对你当前状态的理解</SectionLabel>
                <p className="text-xs leading-relaxed text-text-primary/90">{result.understanding}</p>
              </div>
            )}
          </Card>

          {/* 路线切换 + 五维对比 */}
          <Card>
            <SectionLabel>人生路线（点击切换）</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {result.routes.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setActiveRoute(i);
                    setOpenEvent(0);
                  }}
                  className={`rounded-2xl border px-4 py-2.5 text-left transition-colors ${
                    i === activeRoute
                      ? "border-[#89AACC]/60 bg-[rgba(137,170,204,0.1)]"
                      : "border-stroke hover:border-[#89AACC]/40"
                  }`}
                >
                  <p className={`text-sm ${i === activeRoute ? "text-[#89AACC]" : "text-text-primary/80"}`}>{r.name}</p>
                  <p className="mt-0.5 max-w-[220px] truncate text-[10px] text-muted">{r.summary}</p>
                </button>
              ))}
            </div>

            {/* 五维对比 */}
            <div className="mt-5 space-y-2.5">
              {AXIS_META.map((a) => (
                <div key={a.key}>
                  <div className="mb-1 flex items-center justify-between text-[10px] text-muted">
                    <span>{a.label}</span>
                    <div className="flex gap-3">
                      {result.routes.map((r, i) => (
                        <span
                          key={r.id}
                          className={`w-10 text-right tabular-nums ${i === activeRoute ? "text-[#89AACC]" : ""}`}
                        >
                          {r.axes[a.key]}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {result.routes.map((r, i) => (
                      <div key={r.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-stroke/50">
                        <motion.div
                          className={`h-full rounded-full ${i === activeRoute ? "accent-gradient" : "bg-stroke"}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${r.axes[a.key]}%` }}
                          transition={{ duration: 0.7 }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 三种未来 */}
          <Card>
            <SectionLabel>三种未来 · 不是预测，是基于当前信息的情景模拟</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-3">
              {route.futures.map((f) => {
                const style = TONE_STYLE[f.tone] ?? TONE_STYLE.baseline;
                return (
                  <div key={f.tone} className={`rounded-2xl border ${style.border} bg-bg/60 p-4`}>
                    <p className={`text-xs font-medium ${style.text}`}>
                      {style.dot} {f.label}
                    </p>
                    <p className="mt-2 text-[11px] leading-relaxed text-text-primary/90">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* 10 维人生变化 */}
          <Card>
            <SectionLabel>这条路线的 10 个人生维度</SectionLabel>
            <div className="grid gap-3 md:grid-cols-2">
              {DIM_META.map(({ key, title, icon }) => (
                <DimCard dimKey={key} title={title} icon={icon} route={route} />
              ))}
            </div>
          </Card>

          {/* 关键事件模拟 */}
          <Card>
            <SectionLabel>关键事件模拟 · 未来不是一条直线</SectionLabel>
            <div className="space-y-3">
              {route.events.map((ev, i) => {
                const open = openEvent === i;
                return (
                  <div key={i} className="rounded-2xl border border-stroke bg-bg/60">
                    <button
                      onClick={() => setOpenEvent(open ? null : i)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    >
                      <span className="text-base">{EVENT_BADGE[ev.kind] ?? "⚠️"}</span>
                      <span className="shrink-0 rounded-full border border-stroke px-2 py-0.5 text-[10px] text-muted">
                        {ev.time}
                      </span>
                      <span className="flex-1 text-xs text-text-primary/90">{ev.title}</span>
                      <span className="text-muted">{open ? "−" : "+"}</span>
                    </button>
                    <AnimatePresence>
                      {open && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2 border-t border-stroke px-4 py-3">
                            {ev.choices.map((c, ci) => (
                              <div key={ci} className="flex gap-2.5">
                                <span className="shrink-0 font-display text-xs italic text-[#89AACC]">
                                  {c.label.split(" · ")[0]}
                                </span>
                                <div className="text-[11px] leading-relaxed">
                                  <p className="text-text-primary/90">{c.label.split(" · ").slice(1).join(" · ") || c.label}</p>
                                  <p className="text-muted">→ {c.outcome}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* 蝴蝶效应 */}
          <Card>
            <SectionLabel>蝴蝶效应 · 一个决定如何波及整个人生</SectionLabel>
            <div>
              {route.butterfly.map((step, i) => (
                <div key={i} className="relative flex items-start gap-3 pb-3 last:pb-0">
                  {i < route.butterfly.length - 1 && (
                    <span className="absolute left-[7px] top-5 h-full w-px bg-stroke" />
                  )}
                  <span
                    className={`relative mt-1 h-[15px] w-[15px] shrink-0 rounded-full border text-center text-[9px] leading-[13px] ${
                      i === 0 ? "border-[#89AACC] text-[#89AACC]" : "border-stroke text-muted"
                    }`}
                  >
                    {i === 0 ? "始" : i}
                  </span>
                  <p className="text-xs leading-relaxed text-text-primary/90">{step}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* 人生地图 */}
          <Card>
            <SectionLabel>3 / 5 / 10 年人生地图</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {route.lifeMap.map((s) => (
                <div key={s.period} className="rounded-2xl border border-stroke bg-bg/60 p-4">
                  <p className="text-[10px] text-muted">{s.period}</p>
                  <p className="mt-0.5 text-sm font-medium text-[#89AACC]">{s.name}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.keywords.map((k) => (
                      <span key={k} className="rounded-full bg-[rgba(137,170,204,0.1)] px-2 py-0.5 text-[9px] text-[#89AACC]">
                        {k}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted">{s.desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] italic text-muted">
              10 年后的你，不一定只是「成功」或「失败」——而是这条路可能把你变成什么样的人。
            </p>
          </Card>

          {/* 风险闭环 */}
          <Card>
            <SectionLabel>如何降低风险 · 风险 → 原因 → 预警信号 → 解决方案</SectionLabel>
            <div className="grid gap-3 md:grid-cols-2">
              {route.risks.map((r) => (
                <div key={r.risk} className="rounded-2xl border border-stroke bg-bg/60 p-4">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-rose-400">⚠ {r.risk}</p>
                  <div className="mt-2.5 space-y-1.5 text-[11px] leading-relaxed">
                    <p className="text-muted"><span className="text-text-primary/80">为什么：</span>{r.cause}</p>
                    <p className="text-muted"><span className="text-text-primary/80">预警信号：</span>{r.signal}</p>
                    <p className="text-muted"><span className="text-[#89AACC]">解决方案：</span>{r.solution}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 现在应该怎么做 */}
          <Card>
            <SectionLabel>回到现在 · 如果你准备选择这条路线</SectionLabel>
            <div className="grid gap-3 md:grid-cols-2">
              <ActionBlock title="现在就做" items={route.actions.now} accent />
              <ActionBlock title="做决定前，先验证" items={route.actions.verify} />
              <ActionBlock title="你的止损线" items={route.actions.stopLoss} warn />
              <ActionBlock title="未来 30 天" items={route.actions.d30} />
              <ActionBlock title="未来 90 天" items={route.actions.d90} />
            </div>
            <p className="mt-5 border-t border-stroke pt-4 text-[11px] leading-relaxed text-muted">
              以上不是对未来的预测，而是基于你当前信息生成的情景模拟。真正的走向，由你接下来的每一个动作决定。
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}

function DimCard({ dimKey, title, icon, route }: { dimKey: DimKey; title: string; icon: string; route: SimRoute }) {
  const points = route.dims[dimKey] ?? [];
  return (
    <div className="rounded-2xl border border-stroke bg-bg/60 p-4">
      <p className="flex items-center gap-2 text-xs font-medium text-text-primary">
        <span className="text-[#89AACC]">{icon}</span> {title}
      </p>
      <ul className="mt-2 space-y-1.5">
        {points.map((p) => (
          <li key={p} className="flex gap-1.5 text-[11px] leading-relaxed text-muted">
            <span className="text-muted/50">·</span> {p}
          </li>
        ))}
      </ul>
      {dimKey === "finance" && route.financePrep.length > 0 && (
        <div className="mt-2.5 rounded-xl border border-[#89AACC]/25 bg-[rgba(137,170,204,0.06)] p-2.5">
          <p className="text-[10px] text-[#89AACC]">现在应该提前准备：</p>
          <ul className="mt-1 space-y-0.5">
            {route.financePrep.map((p) => (
              <li key={p} className="text-[10px] text-muted">· {p}</li>
            ))}
          </ul>
        </div>
      )}
      {dimKey === "ability" && route.abilityCore && (
        <p className="mt-2.5 text-[10px] leading-relaxed text-[#89AACC]">✦ 核心竞争力：{route.abilityCore}</p>
      )}
    </div>
  );
}

function ActionBlock({ title, items, accent = false, warn = false }: { title: string; items: string[]; accent?: boolean; warn?: boolean }) {
  if (!items.length) return null;
  return (
    <div className={`rounded-2xl border p-4 ${warn ? "border-rose-400/30" : accent ? "border-[#89AACC]/30" : "border-stroke"} bg-bg/60`}>
      <p className={`mb-2 text-xs font-medium ${warn ? "text-rose-400" : accent ? "text-[#89AACC]" : "text-text-primary"}`}>
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-text-primary/90">
            <span className="text-muted/60">{i + 1}.</span> {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
