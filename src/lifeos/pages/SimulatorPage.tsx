import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useOS } from "../store/OSContext";
import { simulateFutures } from "../engine/simulator";
import type { FutureRoute, Horizon } from "../types";
import {
  Card,
  EmptyState,
  GhostButton,
  GradientButton,
  ProgressBar,
  SectionTitle,
  Thinking,
} from "../components/ui";

// ─── AI 未来模拟器：输入选择 → 生成 3 条路线 × 3/5/10 年推演 ───

const EXAMPLES = ["我要不要考研？", "要不要辞职创业？", "该不该换城市去深圳发展？", "要不要转行学 AI？"];

const HORIZONS: { key: Horizon; label: string }[] = [
  { key: "3", label: "3 年后" },
  { key: "5", label: "5 年后" },
  { key: "10", label: "10 年后" },
];

export default function SimulatorPage() {
  const { state, persona, dispatch } = useOS();
  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState<"input" | "thinking" | "done">("input");
  const [routes, setRoutes] = useState<FutureRoute[]>([]);
  const [active, setActive] = useState<FutureRoute | null>(null);
  const [horizon, setHorizon] = useState<Horizon>("3");

  const run = (q: string) => {
    if (!q.trim() || !state.profile || !persona) return;
    setQuestion(q);
    setPhase("thinking");
    setRoutes([]);
    setActive(null);
    setTimeout(() => {
      const result = simulateFutures(q, state.profile!, persona);
      setRoutes(result);
      setActive(result[0]);
      setPhase("done");
      dispatch({ type: "countSimulation" });
    }, 2400);
  };

  if (!state.profile || !persona) {
    return (
      <EmptyState
        icon="∿"
        title="需要先建立人格档案"
        sub="未来模拟基于你的 AI 人格模型推演，档案越完整，模拟越贴近真实的你。"
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Future Simulator"
        title={
          <>
            模拟你的<em className="font-display italic"> 未来路线 </em>
          </>
        }
        sub="AI 不是预测未来，而是帮你理解：不同选择可能带来的结果、风险与概率。"
      />

      {/* 输入区 */}
      <Card>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="输入你正在纠结的选择，例如：「我要不要考研？」"
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
            开始模拟
          </GradientButton>
        </div>
      </Card>

      <AnimatePresence mode="wait">
        {phase === "thinking" && (
          <motion.div key="thinking" exit={{ opacity: 0 }}>
            <Card>
              <Thinking text="正在基于你的人格模型推演未来" />
            </Card>
          </motion.div>
        )}

        {phase === "done" && routes.length > 0 && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* 路线选择 */}
            <div className="grid gap-4 md:grid-cols-3">
              {routes.map((r, i) => (
                <motion.button
                  key={r.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.12 }}
                  onClick={() => setActive(r)}
                  className={`rounded-3xl border p-5 text-left transition-all duration-300 ${
                    active?.id === r.id
                      ? "border-[#89AACC]/50 bg-surface/60"
                      : "border-stroke bg-surface/20 hover:border-stroke/80"
                  }`}
                >
                  <p className="font-display text-lg italic text-text-primary">{r.name}</p>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">{r.summary}</p>
                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-[11px] text-muted">
                      <span>成功概率（AI 评估）</span>
                      <span className="text-text-primary">{r.successRate}%</span>
                    </div>
                    <ProgressBar value={r.successRate} />
                  </div>
                </motion.button>
              ))}
            </div>

            {/* 选中路线详情 */}
            {active && (
              <motion.div key={active.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <Card glow>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display text-2xl italic">{active.name}</h3>
                      <p className="mt-1 text-sm text-muted">{active.summary}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-3xl italic text-[#89AACC]">{active.successRate}%</p>
                      <p className="text-[10px] uppercase tracking-widest text-muted">成功概率</p>
                    </div>
                  </div>

                  {/* 时间轴切换 */}
                  <div className="mt-6 flex gap-2">
                    {HORIZONS.map((h) => (
                      <GhostButton key={h.key} active={horizon === h.key} onClick={() => setHorizon(h.key)}>
                        {h.label}
                      </GhostButton>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={horizon}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      className="mt-4 grid gap-4 sm:grid-cols-3"
                    >
                      <MiniBlock title="职业发展" text={active.years[horizon].career} />
                      <MiniBlock title="能力变化" text={active.years[horizon].ability} />
                      <MiniBlock title="收入趋势" text={active.years[horizon].income} />
                    </motion.div>
                  </AnimatePresence>

                  <div className="mt-6 grid gap-6 sm:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-[0.25em] text-amber-400/80">风险</p>
                      <ul className="space-y-1.5">
                        {active.risks.map((r) => (
                          <li key={r} className="text-sm text-muted">⚠ {r}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-[0.25em] text-amber-400/80">可能遇到的问题</p>
                      <ul className="space-y-1.5">
                        {active.problems.map((p) => (
                          <li key={p} className="text-sm text-muted">· {p}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <p className="mt-6 rounded-xl border border-stroke bg-bg/60 p-3 text-[11px] leading-relaxed text-muted">
                    提示：以上为基于你人格档案的推演，不是对未来的预言。真实结果取决于你的行动。
                  </p>
                </Card>
              </motion.div>
            )}

            <p className="text-center text-xs text-muted">
              想基于某条路线做正式决策？去
              <Link to="/life-os/decisions" className="mx-1 text-[#89AACC] hover:text-text-primary">决策助手</Link>
              生成完整决策报告。
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MiniBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-stroke bg-bg/60 p-4">
      <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-muted">{title}</p>
      <p className="text-sm leading-relaxed text-text-primary/90">{text}</p>
    </div>
  );
}
