import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useOS } from "../store/OSContext";
import { generateMatches } from "../engine/network";
import { Card, EmptyState, GhostButton, ScoreRing, SectionTitle } from "../components/ui";
import type { MatchCandidate } from "../types";

// ─── AI 人格生态网络：人格/目标/兴趣/经历/阶段多维匹配 ───

const FILTERS: Array<"全部" | MatchCandidate["type"]> = [
  "全部",
  "学习伙伴",
  "创业伙伴",
  "行业导师",
  "兴趣朋友",
];

export default function NetworkPage() {
  const { state, persona, dispatch } = useOS();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("全部");
  const [connected, setConnected] = useState<string[]>([]);
  const [sentToast, setSentToast] = useState<string | null>(null);

  const matches = useMemo(
    () => (state.profile && persona ? generateMatches(state.profile, persona) : []),
    [state.profile, persona],
  );

  const visible =
    filter === "全部" ? matches : matches.filter((m) => m.type === filter);

  const connect = (c: MatchCandidate) => {
    if (connected.includes(c.id)) return;
    setConnected((ids) => [...ids, c.id]);
    setSentToast(`已向 ${c.name} 发送连接申请（${c.type}）`);
    dispatch({ type: "addXp", amount: 10, reason: `连接了${c.type}${c.name}` });
    setTimeout(() => setSentToast(null), 2400);
  };

  if (!state.profile || !persona) {
    return (
      <EmptyState
        icon="⬡"
        title="需要先建立人格档案"
        sub="人格网络通过人格、目标、兴趣、经历与阶段进行多维匹配。"
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Persona Network"
        title={
          <>
            找到<em className="font-display italic"> 同频的人 </em>
          </>
        }
        sub="不是简单社交——AI 基于人格互补、目标同向、兴趣重叠、阶段相邻进行匹配。"
      />

      {/* 筛选 */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <GhostButton key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f}
          </GhostButton>
        ))}
      </div>

      {/* 匹配列表 */}
      <div className="grid gap-5 md:grid-cols-2">
        {visible.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="flex gap-5">
              <div className="flex flex-col items-center gap-2">
                <ScoreRing value={c.matchScore} size={84} label="匹配" />
                <span className="rounded-full border border-stroke px-2.5 py-0.5 text-[10px] text-muted">
                  {c.type}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-display text-xl italic">{c.name}</p>
                  <p className="truncate text-xs text-muted">{c.role}</p>
                </div>
                <p className="mt-0.5 text-[11px] text-muted/70">{c.archetype}</p>
                <ul className="mt-3 space-y-1">
                  {c.reasons.map((r) => (
                    <li key={r} className="text-xs leading-relaxed text-muted">
                      <span className="mr-1.5 text-[#89AACC]">✦</span>
                      {r}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => connect(c)}
                  disabled={connected.includes(c.id)}
                  className={`mt-4 rounded-full border px-4 py-1.5 text-xs transition-colors ${
                    connected.includes(c.id)
                      ? "border-transparent bg-[rgba(137,170,204,0.12)] text-[#89AACC]"
                      : "border-stroke text-muted hover:border-[#89AACC]/50 hover:text-text-primary"
                  }`}
                >
                  {connected.includes(c.id) ? "✓ 已发送连接" : "发送连接"}
                </button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Toast */}
      {sentToast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[#89AACC]/40 bg-surface px-5 py-2.5 text-sm text-text-primary shadow-lg backdrop-blur-md"
        >
          {sentToast}
        </motion.div>
      )}
    </div>
  );
}
