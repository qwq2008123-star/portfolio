import { useState } from "react";
import { motion } from "framer-motion";
import { useOS, xpForLevel, LEVEL_TITLES } from "../store/OSContext";
import { Card, GhostButton, ProgressBar, SectionTitle } from "../components/ui";

// ─── 人生 RPG 成长系统：方向 → 等级路线 + XP + 技能树 + 成就 ───

const DIRECTIONS = ["AI 创业者", "技术专家", "内容创作者", "自由职业者"];

const LEVEL_PATHS: Record<string, string[]> = {
  "AI 创业者": ["学习 AI 基础", "完成 AI 项目", "参加比赛/发布产品", "建立团队", "创业"],
  技术专家: ["夯实基础", "完成代表作", "开源/分享", "社区影响力", "领域权威"],
  内容创作者: ["找到选题", "稳定更新", "形成风格", "积累受众", "商业化"],
  自由职业者: ["打磨技能", "接第一单", "稳定客源", "个人品牌", "自由定价"],
};

const SKILL_TREE: Record<string, string[]> = {
  创造力: ["灵感捕捉", "跨界联想", "作品化能力"],
  执行力: ["任务拆解", "深度工作", "交付闭环"],
  学习力: ["快速上手", "知识管理", "以教代学"],
  社交力: ["主动连接", "公开表达", "资源整合"],
  抗压性: ["情绪颗粒度", "不确定性耐受", "恢复力"],
  自律: ["习惯系统", "精力管理", "长期主义"],
};

export default function RPGPage() {
  const { state, persona, dispatch } = useOS();
  const [selected, setSelected] = useState<string>("");

  const rpg = state.rpg;
  const level = rpg?.level ?? 1;
  const xp = rpg?.xp ?? 0;
  const levelBase = xpForLevel(level);
  const nextBase = xpForLevel(level + 1);
  const xpProgress = level >= 5 ? 100 : ((xp - levelBase) / Math.max(nextBase - levelBase, 1)) * 100;
  const path = rpg ? (LEVEL_PATHS[rpg.direction] ?? LEVEL_PATHS[DIRECTIONS[0]]) : null;

  const topTraits = persona
    ? [...persona.traits].sort((a, b) => b.score - a.score).slice(0, 3)
    : [];

  const start = (direction: string) => {
    setSelected(direction);
    setTimeout(() => dispatch({ type: "initRPG", direction }), 400);
  };

  if (!rpg) {
    return (
      <div className="space-y-6">
        <SectionTitle
          eyebrow="Life RPG"
          title={
            <>
              把人生变成<em className="font-display italic"> 升级路线 </em>
            </>
          }
          sub="选择一个人生方向，AI 生成 5 级成长路线。完成任务获得 XP，解锁技能与成就。"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {DIRECTIONS.map((d, i) => (
            <motion.button
              key={d}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => start(d)}
              className={`rounded-3xl border p-6 text-left transition-all duration-300 ${
                selected === d
                  ? "border-[#89AACC]/50 bg-[rgba(137,170,204,0.08)]"
                  : "border-stroke bg-surface/20 hover:border-[#89AACC]/40"
              }`}
            >
              <p className="font-display text-2xl italic">{d}</p>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                {(LEVEL_PATHS[d] ?? []).join(" → ")}
              </p>
              <p className="mt-4 text-xs text-[#89AACC]">
                {selected === d ? "启动中…" : "选择此方向 →"}
              </p>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Life RPG"
        title={
          <>
            <em className="font-display italic">{rpg.direction}</em> 的成长之路
          </>
        }
      />

      {/* 等级 + XP */}
      <Card glow>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-display text-3xl italic text-[#89AACC]">
              Lv.{level} <span className="text-xl">{LEVEL_TITLES[level]}</span>
            </p>
            <p className="mt-1 text-xs text-muted">
              {level >= 5 ? "已达最高等级，继续积累 XP 巩固成就" : `距离下一级还需 ${nextBase - xp} XP`}
            </p>
          </div>
          <div className="min-w-48 flex-1">
            <ProgressBar value={xpProgress} />
            <p className="mt-1.5 text-right text-[11px] text-muted">XP {xp}</p>
          </div>
        </div>

        {/* 5 级路线 */}
        {path && (
          <div className="mt-8 flex flex-col gap-0 sm:flex-row sm:items-start sm:gap-0">
            {path.map((node, i) => {
              const nodeLevel = i + 1;
              const reached = level >= nodeLevel;
              const current = level === nodeLevel;
              return (
                <div key={node} className="flex items-start gap-3 sm:flex-1 sm:flex-col sm:items-center sm:text-center">
                  <div className="flex flex-col items-center">
                    <motion.span
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-display text-sm italic ${
                        current
                          ? "accent-gradient border-transparent text-bg"
                          : reached
                            ? "border-[#89AACC]/60 text-[#89AACC]"
                            : "border-stroke text-muted"
                      }`}
                    >
                      {reached ? "✓" : nodeLevel}
                    </motion.span>
                    {i < path.length - 1 && (
                      <span className={`h-6 w-px sm:h-px sm:w-full ${reached ? "bg-[#89AACC]/50" : "bg-stroke"}`} />
                    )}
                  </div>
                  <div className="pb-4 sm:pb-0 sm:pt-3">
                    <p className={`text-sm ${reached ? "text-text-primary" : "text-muted"}`}>{node}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-widest text-muted">Level {nodeLevel}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 技能树（来自人格优势） */}
        <Card>
          <p className="mb-1 text-sm text-text-primary">技能树</p>
          <p className="mb-4 text-[11px] text-muted">基于你的人格优势生成，完成任务自动点亮</p>
          <div className="space-y-4">
            {topTraits.map((trait) => {
              const skills = SKILL_TREE[trait.label] ?? [];
              const unlockedCount = Math.min(skills.length, Math.floor(trait.score / 34));
              return (
                <div key={trait.label}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.25em] text-muted">{trait.label}</p>
                    <span className="text-[10px] text-muted">{trait.score}</span>
                  </div>
                  <div className="flex gap-2">
                    {skills.map((s, i) => (
                      <span
                        key={s}
                        className={`flex-1 rounded-xl border px-2 py-2 text-center text-[11px] transition-colors ${
                          i < unlockedCount
                            ? "border-[#89AACC]/40 bg-[rgba(137,170,204,0.08)] text-text-primary"
                            : "border-stroke text-muted/60"
                        }`}
                      >
                        {i < unlockedCount ? "✦ " : "○ "}
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* 成就 */}
        <Card>
          <p className="mb-1 text-sm text-text-primary">成就系统</p>
          <p className="mb-4 text-[11px] text-muted">
            已解锁 {rpg.achievements.length} 项
          </p>
          <div className="flex flex-wrap gap-2">
            {["启程者", "第一步", "十项全能", "决策者", "抉择大师", "深度对话", "时间旅人", "三级跳", "Level 2", "Level 3", "Level 4", "Level 5"].map((a) => {
              const unlocked = rpg.achievements.includes(a);
              return (
                <span
                  key={a}
                  className={`rounded-full border px-3.5 py-1.5 text-xs transition-colors ${
                    unlocked
                      ? "border-transparent bg-[rgba(137,170,204,0.12)] text-[#89AACC]"
                      : "border-stroke text-muted/50"
                  }`}
                >
                  {unlocked ? "🏆" : "🔒"} {a}
                </span>
              );
            })}
          </div>

          {/* 成长记录 */}
          <div className="mt-6 border-t border-stroke pt-4">
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-muted">成长记录</p>
            <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
              {state.memories
                .filter((m) => m.kind === "task" || m.kind === "rpg")
                .slice(0, 8)
                .map((m) => (
                  <p key={m.id} className="text-xs leading-relaxed text-muted">
                    <span className="mr-2 text-muted/50">
                      {new Date(m.at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {m.text}
                  </p>
                ))}
              {state.memories.filter((m) => m.kind === "task" || m.kind === "rpg").length === 0 && (
                <p className="text-xs text-muted">去「生活管理」完成任务，开始记录成长。</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-center">
        <GhostButton
          onClick={() => {
            if (confirm("重新选择人生方向将重置 RPG 等级（保留其他数据），确定？")) {
              dispatch({ type: "initRPG", direction: "" });
            }
          }}
        >
          重新选择人生方向
        </GhostButton>
      </div>
    </div>
  );
}
