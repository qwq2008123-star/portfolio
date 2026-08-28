import { useNavigate } from "react-router-dom";
import { useOS } from "../store/OSContext";
import { Card, Chip, ProgressBar, Radar, SectionTitle } from "../components/ui";

// ─── AI 人格档案：画像总览 + 六维雷达 + 持续更新入口 ───

export default function ProfilePage() {
  const { state, persona } = useOS();
  const navigate = useNavigate();
  const profile = state.profile;

  if (!profile || !persona) {
    return (
      <div className="py-10 text-center text-muted">
        尚未建立人格档案。
        <button onClick={() => navigate("/life-os/onboarding")} className="ml-2 text-[#89AACC] hover:text-text-primary">
          去建立 →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="AI Persona Profile"
        title={
          <>
            你是<em className="font-display italic"> 「{persona.archetype}」 </em>
          </>
        }
        sub={`画像更新于 ${new Date(persona.updatedAt).toLocaleString("zh-CN", { hour12: false })} · 随使用持续进化`}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* 雷达图 */}
        <Card className="flex flex-col items-center justify-center lg:col-span-2">
          <Radar traits={persona.traits} />
          <p className="mt-6 text-center text-xs leading-relaxed text-muted">
            {persona.tagline}
          </p>
        </Card>

        {/* 画像详情 */}
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-muted">思维模式</p>
            <p className="text-sm leading-relaxed text-text-primary/90">{persona.thinkingStyle}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.25em] text-muted">行为习惯</p>
                <ul className="space-y-1.5">
                  {persona.habits.map((h) => (
                    <li key={h} className="text-sm text-muted">· {h}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.25em] text-muted">核心价值观</p>
                <div className="flex flex-wrap gap-2">
                  {persona.values.map((v) => (
                    <Chip key={v} tone="accent">{v}</Chip>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <p className="mb-3 text-xs uppercase tracking-[0.25em] text-[#89AACC]">优势能力</p>
              <ul className="space-y-2">
                {persona.strengths.map((s) => (
                  <li key={s} className="flex gap-2 text-sm text-muted">
                    <span className="text-[#89AACC]">✦</span> {s}
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <p className="mb-3 text-xs uppercase tracking-[0.25em] text-amber-400/80">潜在风险</p>
              <ul className="space-y-2">
                {persona.risks.map((r) => (
                  <li key={r} className="flex gap-2 text-sm text-muted">
                    <span className="text-amber-400/80">⚠</span> {r}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </div>

      {/* 模型完善度 */}
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="mb-2 flex justify-between text-xs text-muted">
              <span>AI 对你的了解程度</span>
              <span>{persona.completion}%</span>
            </div>
            <ProgressBar value={persona.completion} />
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              完善度来自：档案完整度 + 决策 {state.stats.decisionsCount} 次 + 任务 {state.stats.tasksCompleted} 次
              + 对话 {state.stats.chatsCount} 次 + 模拟 {state.stats.simulationsCount} 次。
              每一次交互都会让画像更接近真实的你。
            </p>
          </div>
          <button
            onClick={() => navigate("/life-os/onboarding")}
            className="shrink-0 rounded-full border border-stroke px-5 py-2.5 text-sm text-muted transition-colors hover:border-[#89AACC]/50 hover:text-text-primary"
          >
            更新档案
          </button>
        </div>
      </Card>
    </div>
  );
}
