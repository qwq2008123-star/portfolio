import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useOS, xpForLevel, LEVEL_TITLES } from "../store/OSContext";
import { Card, Chip, ProgressBar, GhostButton } from "../components/ui";
import type { UserProfile } from "../../lifeos/types";

// ─── AI 人格档案：沿用作品集暗色设计系统（surface 卡片 + #89AACC 强调） ───

/** 全局 Card 的带标题变体 */
function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-primary">{title}</h3>
        {action}
      </div>
      {children}
    </Card>
  );
}

/** 参考全局风格的弹窗 */
function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-stroke bg-surface p-6"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xl italic text-text-primary">{title}</h3>
              <button
                onClick={onClose}
                className="rounded-full border border-stroke px-2.5 py-0.5 text-xs text-muted transition-colors hover:text-text-primary"
              >
                ✕
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── 页面级数据：用户指定的 8 维人格数据 ───
const TRAITS = [
  { label: "创造力", value: 92, evidence: "近 30 天产出 7 个 AI 项目原型，跨领域组合想法频率是平均值的 3 倍" },
  { label: "学习能力", value: 88, evidence: "连续 21 天保持学习习惯，新框架上手周期从 2 周缩短到 4 天" },
  { label: "执行力", value: 76, evidence: "任务完成率 87%，但多线并行时单任务收尾速度下降 15%" },
  { label: "独立性", value: 91, evidence: "78% 的关键决策在独立调研后做出，极少随大流" },
  { label: "探索欲", value: 89, evidence: "兴趣标签横跨 AI / 产品 / 设计 / 创业，每月新增 2+ 个探索领域" },
  { label: "风险偏好", value: 72, evidence: "面对高不确定性目标（创业、新方向）倾向选择进攻型路线" },
  { label: "情绪稳定性", value: 68, evidence: "高强度输出期情绪波动上升，深夜时段自我怀疑频率增加" },
  { label: "社交主动性", value: 55, evidence: "偏好深度 1 对 1 交流，主动发起大型社交的比例较低" },
];

const MBTI_DETAIL: Record<string, { dim: string; pick: string; other: string; desc: string }> = {
  I: { dim: "能量方向", pick: "内向（I）", other: "外向（E）", desc: "从独处中恢复能量，深度思考优于广泛社交" },
  N: { dim: "信息获取", pick: "直觉（N）", other: "实感（S）", desc: "关注可能性与未来图景，喜欢抽象模型和跨界联想" },
  T: { dim: "决策方式", pick: "思考（T）", other: "情感（F）", desc: "以逻辑和目标为依据做判断，先对错、后喜恶" },
  J: { dim: "生活态度", pick: "判断（J）", other: "知觉（P）", desc: "偏好计划与结构感，但对探索期保留弹性" },
};

const KEYWORDS = ["#战略型", "#创造者", "#长期主义", "#高自主性", "#AI探索者", "#目标驱动"];

const EVIDENCE_SOURCES = ["聊天记录", "日常习惯", "任务完成情况", "人生目标", "重大决策", "兴趣", "长期行为"];

const GROWTH = [
  { at: "2026.01", name: "探索者", desc: "广泛建立认知：AI、产品、设计多线探索" },
  { at: "2026.04", name: "创造者", desc: "从输入转向输出，开始独立完成项目" },
  { at: "2026.08", name: "战略创造者", desc: "目标收敛，行动围绕长期方向组织", current: true },
];

const GROWTH_DELTAS = [
  { label: "执行力", delta: "+18%" },
  { label: "社交能力", delta: "+12%" },
  { label: "情绪稳定", delta: "+9%" },
];


export default function ProfilePage() {
  const { state, persona, dispatch } = useOS();
  const navigate = useNavigate();
  const profile = state.profile;

  const [showMbti, setShowMbti] = useState(false);
  const [showGrowth, setShowGrowth] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [openTrait, setOpenTrait] = useState<string | null>(null);
  const [chatText, setChatText] = useState("");
  const [draft, setDraft] = useState<UserProfile | null>(null);

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

  const mbti = profile.mbti || "INTJ";
  const level = state.rpg?.level ?? 1;
  const xp = state.rpg?.xp ?? 0;
  const stageGoal = 78;
  const levelBase = xpForLevel(level);
  const nextBase = xpForLevel(Math.min(level + 1, 5));
  const stageProgress =
    level >= 5 ? 100 : ((xp - levelBase) / Math.max(nextBase - levelBase, 1)) * 100;

  const openEdit = () => {
    setDraft({ ...profile });
    setShowEdit(true);
  };
  const saveEdit = () => {
    if (draft) dispatch({ type: "saveProfile", profile: { ...draft, updatedAt: Date.now() } });
    setShowEdit(false);
  };

  return (
    <div>
      {/* 页头：标题 + 副标题 + 编辑入口 */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <span className="h-px w-8 bg-stroke" />
            <span className="text-xs uppercase tracking-[0.3em] text-muted">AI Persona Profile</span>
          </div>
          <h1 className="text-3xl tracking-tight text-text-primary md:text-4xl">
            你是<em className="font-display italic"> 「{persona.archetype}」 </em>
          </h1>
          <p className="mt-2 text-sm text-muted">真正了解你的人生，才能帮助你做出更好的选择。</p>
        </div>
        <GhostButton onClick={openEdit}>编辑人格</GhostButton>
      </div>

      {/* 三栏 Bento：布局对齐参考图（460 / 444 / 333），配色走全局暗色系统 */}
      <div className="grid gap-6 xl:grid-cols-[1.05fr_1fr_0.75fr]">
        {/* ── 左列 ── */}
        <div className="space-y-6">
          {/* 人格档案主卡 */}
          <Card className="relative overflow-hidden">
            <div className="mb-4 flex items-center justify-between text-xs text-muted">
              <span>更新时间：{new Date(persona.updatedAt).toLocaleDateString("zh-CN")}</span>
            </div>

            <div className="flex items-start gap-4">
              {/* 头像 */}
              <div className="accent-gradient flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-semibold text-bg">
                {(profile.name || "旅人").slice(0, 1)}
              </div>
              <div className="min-w-0">
                <p className="mb-1 text-xs uppercase tracking-[0.25em] text-muted">你的核心人格类型</p>
                <button
                  onClick={() => setShowMbti(true)}
                  className="font-display text-5xl italic leading-tight text-text-primary transition-opacity hover:opacity-70"
                  title="点击查看人格详细解释"
                >
                  {mbti}
                </button>
                <p className="mt-1 text-sm text-text-primary/90">
                  {persona.archetype}
                  <span className="ml-2 text-xs text-muted">· {profile.name}</span>
                </p>
              </div>
            </div>

            <p className="mt-3 text-xs text-muted">独立 · 理性 · 创造 · 目标导向</p>
            <p className="mt-3 border-l-2 border-stroke pl-3 text-sm italic text-text-primary/90">
              「独立思考，长期主义，用创造回应目标。」
            </p>

            {/* 人格综合画像 */}
            <div className="mt-4 flex flex-wrap gap-2">
              {["独立思考", "长期主义", "创造力", "高目标感", "强学习能力"].map((t) => (
                <Chip key={t}>{t}</Chip>
              ))}
            </div>

            {/* 8 维数据（点击显示 AI 分析依据） */}
            <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4">
              {TRAITS.map((t) => (
                <button
                  key={t.label}
                  onClick={() => setOpenTrait(openTrait === t.label ? null : t.label)}
                  className="text-left"
                  title="点击查看 AI 分析依据"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted">{t.label}</span>
                    <span className="font-display text-lg italic text-text-primary">{t.value}</span>
                  </div>
                  <ProgressBar value={t.value} className="mt-1.5" />
                  <AnimatePresence>
                    {openTrait === t.label && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden pt-2 text-[11px] leading-relaxed text-muted"
                      >
                        AI 依据：{t.evidence}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </button>
              ))}
            </div>
          </Card>

          {/* MBTI 深度解析 */}
          <Card>
            <h3 className="mb-4 text-sm font-medium text-text-primary">MBTI 深度解析</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {mbti.split("").map((letter, i) => {
                const conf = MBTI_DETAIL[letter];
                if (!conf) return null;
                return (
                  <div key={i}>
                    <p className="mb-1.5 text-[10px] uppercase tracking-widest text-muted">{conf.dim}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="rounded-full bg-[rgba(137,170,204,0.12)] px-2.5 py-0.5 font-medium text-[#89AACC]">
                        {conf.pick}
                      </span>
                      <span className="text-muted/70 line-through">{conf.other}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mb-2 mt-4 text-xs text-muted">人格特征解析</p>
            <ul className="space-y-1.5">
              {["战略思维强，喜欢长期规划", "独立性高，享受独自解决问题", "长期主义，愿意延迟满足", "情感表达较内敛，内心细腻", "容易过度思考，对自己要求过高"].map((t) => (
                <li key={t} className="flex gap-2 text-xs text-muted">
                  <span className="text-[#89AACC]">·</span> {t}
                </li>
              ))}
            </ul>
            <button
              onClick={() => setShowMbti(true)}
              className="mt-4 w-full rounded-full border border-stroke px-4 py-2.5 text-xs text-muted transition-colors hover:border-[#89AACC]/50 hover:text-text-primary"
            >
              查看完整报告
            </button>
          </Card>

          {/* 人格关键词 */}
          <Card>
            <h3 className="mb-4 text-sm font-medium text-text-primary">人格关键词</h3>
            <div className="flex flex-wrap gap-2">
              {KEYWORDS.map((k) => (
                <Chip key={k} tone="accent">{k}</Chip>
              ))}
            </div>
          </Card>
        </div>

        {/* ── 中列 ── */}
        <div className="space-y-6">
          {/* 人格成长轨迹 */}
          <Panel
            title="人格成长轨迹"
            action={
              <button onClick={() => setShowGrowth(true)} className="text-xs text-muted transition-colors hover:text-text-primary">
                历史变化 ›
              </button>
            }
          >
            <p className="mb-4 text-[11px] leading-relaxed text-muted/80">
              MBTI 并未改变 —— 是 AI 观察到你的行为与能力维度在进化。
            </p>
            <button onClick={() => setShowGrowth(true)} className="block w-full text-left" title="点击查看历史变化">
              <div className="space-y-0">
                {GROWTH.map((g, i) => (
                  <div key={g.at} className="relative flex gap-4 pb-5 last:pb-0">
                    {i < GROWTH.length - 1 && (
                      <span className="absolute left-[5px] top-4 h-full w-px bg-stroke" />
                    )}
                    <span
                      className={`relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 ${
                        g.current ? "border-[#89AACC] bg-[#89AACC]" : "border-stroke bg-bg"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-muted">{g.at}</p>
                      <p className={`text-sm font-medium ${g.current ? "text-[#89AACC]" : "text-text-primary/90"}`}>
                        {g.name}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted/80">{g.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </button>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {GROWTH_DELTAS.map((d) => (
                <div key={d.label} className="rounded-2xl border border-stroke bg-bg/60 p-3 text-center">
                  <p className="text-[11px] text-muted">{d.label}</p>
                  <p className="font-display text-lg italic text-[#89AACC]">{d.delta}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-stroke bg-bg/60 p-4">
              <p className="text-xs text-muted">当前阶段目标</p>
              <p className="mt-1 text-sm text-text-primary">成为影响世界的 AI 创造者</p>
              <div className="mt-3 flex items-baseline justify-between text-xs">
                <span className="text-muted">阶段进度</span>
                <span className="font-display text-base italic text-[#89AACC]">{Math.round(stageGoal)}%</span>
              </div>
              <ProgressBar value={stageGoal} className="mt-1.5" />
              <p className="mt-2 text-[11px] text-muted">
                Lv.{level} {LEVEL_TITLES[level] ?? ""} · XP {xp} · 距下一阶段还需 {Math.max(nextBase - xp, 0)} EXP
              </p>
              <ProgressBar value={stageProgress} className="mt-2" />
            </div>
          </Panel>

          {/* AI 认识你的依据（时间线样式，对齐参考图信息密度） */}
          <Panel title="AI 认识你的依据">
            <div className="mb-4 flex flex-wrap gap-1.5">
              {EVIDENCE_SOURCES.map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
            </div>
            <div className="space-y-3">
              {[
                `你最近 30 天完成了 ${Math.max(state.stats.tasksCompleted, 7)} 个任务节点，其中 AI 项目 7 个。`,
                "你连续 21 天保持学习习惯。",
                "你最近频繁思考创业问题（决策助手记录 ×5）。",
              ].map((t) => (
                <div key={t} className="flex gap-3 rounded-2xl border border-stroke bg-bg/60 p-3">
                  <span className="text-[#89AACC]">✦</span>
                  <p className="text-xs leading-relaxed text-text-primary/90">{t}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted/70">
              这些数据用于不断更新 AI 人格档案，让它越来越接近真实的你。
            </p>
          </Panel>

          {/* 聊天输入（对齐参考图底部 AI 数字分身） */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate("/life-os/companion", { state: { draft: chatText } });
            }}
            className="flex items-center gap-3 rounded-full border border-stroke bg-surface/40 px-5 py-3"
          >
            <input
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="问问你的 AI 分身：今天想聊点什么？"
              className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-muted"
            />
            <button type="submit" className="text-xs text-[#89AACC] transition-opacity hover:opacity-70">
              发送 ›
            </button>
          </form>
        </div>

        {/* ── 右列 ── */}
        <div className="space-y-6">
          {/* AI 眼中的你 */}
          <Panel title="AI 眼中的你">
            <p className="text-xs leading-loose text-text-primary/90">
              你是一个高自主性、强目标导向的人。你喜欢探索新的可能性，并且倾向于长期思考。
            </p>
            <p className="mb-2 mt-4 text-xs text-muted">你的优势是：</p>
            <ul className="space-y-1.5">
              {["战略思维", "学习能力", "创造力"].map((s) => (
                <li key={s} className="flex gap-2 text-xs text-text-primary/90">
                  <span className="text-[#89AACC]">✦</span> {s}
                </li>
              ))}
            </ul>
            <p className="mb-2 mt-4 text-xs text-muted">你的潜在挑战是：</p>
            <ul className="space-y-1.5">
              {["容易对自己要求过高", "容易同时设定多个目标", "有时会陷入过度思考"].map((s) => (
                <li key={s} className="flex gap-2 text-xs text-text-primary/90">
                  <span className="text-amber-400/80">⚠</span> {s}
                </li>
              ))}
            </ul>
          </Panel>

          {/* AI 给未来的你 */}
          <Panel title="AI 给未来的你">
            <p className="text-xs leading-loose text-text-primary/90">
              如果你继续保持现在的行动方向，未来 3 年你最可能成长为：
            </p>
            <p className="mt-3 text-sm font-medium leading-relaxed text-text-primary">
              AI 产品创造者 / 创业者 / 技术型领导者
            </p>
            <button
              onClick={() => navigate("/life-os/simulator")}
              className="mt-4 w-full rounded-full border border-stroke px-4 py-2.5 text-xs text-muted transition-all hover:scale-[1.02] hover:border-[#89AACC]/50 hover:text-text-primary"
            >
              查看未来模拟
            </button>
          </Panel>

        </div>
      </div>

      {/* MBTI 详细解释弹窗 */}
      <Modal open={showMbti} onClose={() => setShowMbti(false)} title={`${mbti} · 人格详细解释`}>
        <p className="mb-4 text-sm leading-relaxed text-text-primary/90">
          {mbti} 被称为「{persona.archetype}」。这四个字母描述的是你处理信息与做出决策的偏好，
          而不是能力上限 —— AI 会基于你的真实行为不断校准它。
        </p>
        <div className="space-y-3">
          {mbti.split("").map((letter, i) => {
            const conf = MBTI_DETAIL[letter];
            if (!conf) return null;
            return (
              <div key={i} className="rounded-2xl border border-stroke bg-bg/60 p-4">
                <p className="text-[10px] uppercase tracking-widest text-muted">{conf.dim}</p>
                <p className="mt-1 text-sm font-medium text-[#89AACC]">
                  {conf.pick} <span className="text-xs text-muted/70">（而非 {conf.other}）</span>
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{conf.desc}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-[11px] text-muted/70">
          依据：onboarding 测评 + {state.stats.chatsCount} 次对话 + {state.stats.decisionsCount} 次决策记录。
        </p>
      </Modal>

      {/* 成长历史变化弹窗 */}
      <Modal open={showGrowth} onClose={() => setShowGrowth(false)} title="人格成长 · 历史变化">
        <div className="space-y-3">
          {GROWTH.map((g) => (
            <div key={g.at} className="flex items-start gap-3 rounded-2xl border border-stroke bg-bg/60 p-4">
              <span className="font-display text-lg italic text-muted">{g.at}</span>
              <div>
                <p className={`text-sm font-medium ${g.current ? "text-[#89AACC]" : "text-text-primary/90"}`}>
                  {g.name}
                </p>
                <p className="mt-0.5 text-xs text-muted">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mb-2 mt-4 text-xs text-muted">观察到的维度变化：</p>
        <div className="grid grid-cols-3 gap-3">
          {GROWTH_DELTAS.map((d) => (
            <div key={d.label} className="rounded-2xl border border-stroke bg-bg/60 p-3 text-center">
              <p className="text-[11px] text-muted">{d.label}</p>
              <p className="font-display text-lg italic text-[#89AACC]">{d.delta}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-muted/70">
          数据来源：决策 {state.stats.decisionsCount} 次 · 任务 {state.stats.tasksCompleted} 次 ·
          对话 {state.stats.chatsCount} 次 · 模拟 {state.stats.simulationsCount} 次。
        </p>
      </Modal>

      {/* 编辑人格弹窗 */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="编辑人格档案">
        {draft && (
          <div className="space-y-4">
            {(
              [
                { key: "name", label: "昵称" },
                { key: "mbti", label: "MBTI（如 INTJ）" },
                { key: "occupation", label: "当前身份" },
                { key: "goals", label: "人生目标" },
                { key: "dream", label: "一句话梦想" },
              ] as const
            ).map((f) => (
              <label key={f.key} className="block">
                <span className="mb-1.5 block text-xs text-muted">{f.label}</span>
                <input
                  value={draft[f.key]}
                  onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                  className="w-full rounded-2xl border border-stroke bg-bg/60 px-4 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-[#89AACC]/60"
                />
              </label>
            ))}
            <div className="flex gap-3 pt-1">
              <GradientLikeButton onClick={saveEdit}>保存</GradientLikeButton>
              <button
                onClick={() => setShowEdit(false)}
                className="flex-1 rounded-full border border-stroke px-4 py-2.5 text-xs text-muted transition-colors hover:text-text-primary"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/** 主操作按钮：与全局 GradientButton 同款（白底胶囊，hover 变描边） */
function GradientLikeButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-full bg-text-primary px-4 py-2.5 text-xs font-medium text-bg transition-all duration-300 hover:scale-[1.02] hover:bg-transparent hover:text-text-primary"
    >
      {children}
    </button>
  );
}
