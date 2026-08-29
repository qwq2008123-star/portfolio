import { useMemo, useState } from "react";
import { motion, AnimatePresence, useAnimationFrame } from "framer-motion";
import { useOS } from "../store/OSContext";
import { FIXED_MEMBERS, generateMatches } from "../engine/network";
import { createRng, hashString } from "../engine/random";
import { EmptyState, ProgressBar } from "../components/ui";
import { MemberAvatar } from "../components/MemberAvatar";
import type { MatchCandidate } from "../types";

// ─── AI 人格关系网络：人格星系可视化 ───
// 节点缓慢漂浮（Obsidian 图风格：悬停高亮直接关系、其余淡出）
// 关系线语言：实线=共同目标 · 渐变=人格互补 · 虚线=相似经历 · 粗线=导师 · 双线=学习伙伴

type GalaxyNode = {
  cand: MatchCandidate;
  layer: 2 | 3 | 4;
  bx: number; // 基准坐标（容器百分比），漂浮围绕基准进行
  by: number;
  size: number;
  hue: string;
};

type Edge = {
  a: string; // nodeId 或 "self"
  b: string;
  dashed: boolean;
  width: number;
  double: boolean;
  gradient: boolean;
  base: number; // 基础不透明度
};

function lineStyleFor(type: MatchCandidate["type"]) {
  switch (type) {
    case "行业导师":
      return { dashed: false, width: 2.6, double: false };
    case "学习伙伴":
      return { dashed: false, width: 1.5, double: true };
    case "创业伙伴":
      return { dashed: false, width: 1.5, double: false };
    default:
      return { dashed: true, width: 1.3, double: false };
  }
}

const HUES = ["#00D4FF", "#7C3AED", "#FF2D95", "#38BDF8", "#A78BFA", "#F472B6"];

// ─── 程序化扁平插画风头像（参考 Humaaans 风格：pastel 底 + 细描边 + 多样发型/肤色/服装） ───
function ToonAvatar({ seed, size }: { seed: string; size: number }) {
  const h = hashString(seed);
  const BG = ["#FDE8D0", "#DCEFC8", "#D9D2F0", "#FDF3C7", "#CDE4F7", "#C8F0EA", "#E8D5C0", "#F5D5DA", "#BFE8D9"];
  const SKIN = ["#FFDFC4", "#F3C9A5", "#C68642", "#8D5524"];
  const HAIR = ["#2F2A26", "#4A3421", "#1E293B", "#B04A5A", "#6D28D9", "#9CA3AF", "#C2410C", "#0F766E", "#E9C46A"];
  const CLOTH = ["#3B82F6", "#9CA3AF", "#B45309", "#DC2626", "#F9A8D4", "#F4F4F5", "#166534", "#FBBF24", "#7C3AED"];
  const bg = BG[h % BG.length];
  const skin = SKIN[(h >> 2) % SKIN.length];
  const hair = HAIR[(h >> 4) % HAIR.length];
  const cloth = CLOTH[(h >> 6) % CLOTH.length];
  const hairStyle = (h >> 8) % 8; // 卷发/碎发/马尾/长卷/短寸/脏辫/灰白侧分/波波头
  const clothStyle = (h >> 10) % 5; // T恤/卫衣/夹克/高领/衬衫
  const beard = (h >> 12) % 4 === 0;
  const glasses = (h >> 13) % 4 === 0;
  const earring = (h >> 14) % 5 === 0;
  const wink = (h >> 15) % 6 === 0;
  const outline = "#3A3A3A";
  const sw = 0.9;


  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="rounded-full">
      {/* pastel 底 */}
      <circle cx="32" cy="32" r="32" fill={bg} />

      {/* 后层长发 / 马尾 / 卷发底 */}
      {hairStyle === 3 && <path d="M15 32 Q13 12 32 11 Q51 12 49 32 L49 46 Q45 50 41 47 L41 30 Z M23 30 L23 47 Q19 50 15 46 Z" fill={hair} />}
      {hairStyle === 2 && (
        <>
          <path d="M18 26 Q19 12 32 11.5 Q45 12 46 26 L46 30 L18 30 Z" fill={hair} />
          <path d="M44 22 Q54 26 52 42 Q51 46 47 45 Q50 34 43 27 Z" fill={hair} />
        </>
      )}
      {hairStyle === 5 && <path d="M17 30 Q17 12 32 11 Q47 12 47 30 L47 30 L17 30 Z" fill={hair} />}

      {/* 颈部 */}
      <rect x="28" y="37" width="8" height="9" rx="3" fill={skin} />

      {/* 肩部衣服 */}
      <path d="M7 66 Q13 48 25 46 L39 46 Q51 48 57 66 Z" fill={cloth} stroke={outline} strokeWidth={sw} />
      {clothStyle === 0 && (
        <path d="M25 46 Q32 51 39 46" fill="none" stroke={outline} strokeWidth={sw} />
      )}
      {clothStyle === 1 && (
        <>
          <path d="M25 46 Q32 53 39 46" fill="none" stroke={outline} strokeWidth={sw} />
          <path d="M28 50 L28 60 M36 50 L36 60" stroke={outline} strokeWidth={sw} strokeLinecap="round" />
        </>
      )}
      {clothStyle === 2 && (
        <>
          <path d="M25 46 L32 58 L39 46" fill="none" stroke={outline} strokeWidth={sw} />
          <rect x="29" y="47" width="6" height="12" fill="#F4F4F5" stroke={outline} strokeWidth={sw * 0.7} />
        </>
      )}
      {clothStyle === 3 && <rect x="26" y="44" width="12" height="8" rx="3" fill={cloth} stroke={outline} strokeWidth={sw} />}
      {clothStyle === 4 && (
        <>
          <path d="M25 46 L29 46 L32 52 L35 46 L39 46" fill="#F4F4F5" stroke={outline} strokeWidth={sw} />
          <circle cx="32" cy="58" r="0.8" fill={outline} />
        </>
      )}

      {/* 脸 */}
      <ellipse cx="32" cy="27" rx="12.5" ry="13.2" fill={skin} stroke={outline} strokeWidth={sw} />
      {/* 耳朵 + 耳饰 */}
      <circle cx="19.5" cy="28" r="2.2" fill={skin} stroke={outline} strokeWidth={sw} />
      <circle cx="44.5" cy="28" r="2.2" fill={skin} stroke={outline} strokeWidth={sw} />
      {earring && <circle cx="44.5" cy="31" r="1" fill="#FBBF24" stroke={outline} strokeWidth={sw * 0.6} />}

      {/* 前层发型 */}
      {hairStyle === 0 && (
        <g fill={hair}>
          <circle cx="24" cy="17" r="6.5" />
          <circle cx="32" cy="13.5" r="7" />
          <circle cx="40" cy="17" r="6.5" />
          <circle cx="18.5" cy="23" r="5" />
          <circle cx="45.5" cy="23" r="5" />
          <circle cx="20" cy="28.5" r="3.6" />
          <circle cx="44" cy="28.5" r="3.6" />
        </g>
      )}
      {hairStyle === 1 && (
        <path d="M19 26 L21.5 15 L26 21 L31 12.5 L36 20.5 L41.5 14.5 L45 26 Q41 17.5 32 17.5 Q23 17.5 19 26 Z" fill={hair} stroke={outline} strokeWidth={sw} />
      )}
      {hairStyle === 2 && (
        <path d="M18.5 27 Q19 13 32 12.5 Q45 13 45.5 27 Q40 18.5 32 18.5 Q24 18.5 18.5 27 Z" fill={hair} stroke={outline} strokeWidth={sw} />
      )}
      {hairStyle === 3 && (
        <path d="M18.5 26 Q20 13 32 12.5 Q44 13 45.5 26 Q41 18 32 18 Q23 18 18.5 26 Z" fill={hair} stroke={outline} strokeWidth={sw} />
      )}
      {hairStyle === 4 && (
        <path d="M20 24 Q21 13.5 32 13 Q43 13.5 44 24 Q38 18.5 32 18.5 Q26 18.5 20 24 Z" fill={hair} stroke={outline} strokeWidth={sw} />
      )}
      {hairStyle === 5 && (
        <>
          <path d="M18.5 26 Q19 12.5 32 12 Q45 12.5 45.5 26 L45.5 30 Q44 38 42.5 30 L42.5 22 Q36 18 28 20 L21.5 22 L21.5 30 Q20 38 18.5 30 Z" fill={hair} stroke={outline} strokeWidth={sw * 0.7} />
          {/* 两条辫子 */}
          <g fill={hair} stroke={outline} strokeWidth={sw * 0.6}>
            <circle cx="20" cy="33" r="2.4" /><circle cx="20" cy="38" r="2.2" /><circle cx="20.5" cy="43" r="2" />
            <circle cx="44" cy="33" r="2.4" /><circle cx="44" cy="38" r="2.2" /><circle cx="43.5" cy="43" r="2" />
          </g>
        </>
      )}
      {hairStyle === 6 && (
        <>
          <path d="M19.5 25 Q20 13.5 32 13 Q44 13.5 44.5 25 L44 23 Q36 15 26 19 L20 23 Z" fill={hair} stroke={outline} strokeWidth={sw} />
          <path d="M34 14.5 L44 21" stroke="#E5E7EB" strokeWidth={sw} />
        </>
      )}
      {hairStyle === 7 && (
        <path d="M18.5 28 Q18 13 32 12.5 Q46 13 45.5 28 Q45 36 42 37 Q43.5 30 41.5 24 Q35 20.5 26 23 L22.5 26 Q21 31 22 37 Q19 36 18.5 28 Z" fill={hair} stroke={outline} strokeWidth={sw} />
      )}

      {/* 眉毛 */}
      <path d="M24.2 22.6 Q26.4 21.5 28.6 22.4" stroke={outline} strokeWidth={sw} fill="none" strokeLinecap="round" />
      <path d="M35.4 22.4 Q37.6 21.5 39.8 22.6" stroke={outline} strokeWidth={sw} fill="none" strokeLinecap="round" />
      {/* 眼睛 */}
      {wink ? (
        <path d="M25.4 26.4 Q27 28 28.6 26.4 M35.4 26.4 Q37 28 38.6 26.4" stroke={outline} strokeWidth={sw + 0.2} fill="none" strokeLinecap="round" />
      ) : (
        <g fill={outline}>
          <circle cx="27" cy="26.8" r="1.55" />
          <circle cx="37" cy="26.8" r="1.55" />
          <circle cx="27.5" cy="26.3" r="0.5" fill="#fff" />
          <circle cx="37.5" cy="26.3" r="0.5" fill="#fff" />
        </g>
      )}
      {/* 鼻子 */}
      <path d="M31.6 29.5 Q33 31.4 31.6 32.2" stroke={outline} strokeWidth={sw} fill="none" strokeLinecap="round" />
      {/* 胡子 */}
      {beard && (
        <path d="M24.5 30.5 Q25 39 32 39.5 Q39 39 39.5 30.5 Q37 34.5 32 34.5 Q27 34.5 24.5 30.5 Z" fill={hair} opacity="0.92" />
      )}
      {/* 嘴 */}
      <path d="M29.2 34.2 Q32 36.6 34.8 34.2" stroke={outline} strokeWidth={sw + 0.1} fill="none" strokeLinecap="round" />
      {/* 腮红 */}
      <circle cx="23.4" cy="31" r="1.9" fill="#F87171" opacity="0.35" />
      <circle cx="40.6" cy="31" r="1.9" fill="#F87171" opacity="0.35" />
      {/* 眼镜 */}
      {glasses && (
        <g stroke={outline} strokeWidth={sw} fill="none">
          <rect x="22.6" y="24" width="8.6" height="6" rx="2.4" />
          <rect x="32.8" y="24" width="8.6" height="6" rx="2.4" />
          <line x1="31.2" y1="26.6" x2="32.8" y2="26.6" />
        </g>
      )}
    </svg>
  );
}

// ─── 人物人格档案数据层：按 seed 确定性生成（同一人物刷新不变） ───
const SERVICE_POOL = [
  { name: "AI 产品设计", price: 28, helps: ["产品定位", "MVP 设计", "AI 功能设计", "用户流程设计"] },
  { name: "创业经验", price: 26, helps: ["商业模式梳理", "冷启动策略", "团队搭建", "融资准备"] },
  { name: "考研经验", price: 22, helps: ["择校规划", "复习节奏", "复试准备", "心态调整"] },
  { name: "Python 学习", price: 15, helps: ["入门路径", "项目实战", "代码 Review", "调试技巧"] },
  { name: "产品经理经验", price: 20, helps: ["需求分析", "PRD 写作", "版本规划", "数据驱动迭代"] },
  { name: "Hackathon 经验", price: 18, helps: ["选题策略", "48 小时节奏", "Demo 打磨", "路演表达"] },
  { name: "简历优化", price: 14, helps: ["项目描述改写", "亮点提炼", "模拟面试", "投递策略"] },
  { name: "商业计划书", price: 24, helps: ["框架搭建", "市场分析", "财务模型", "故事线打磨"] },
  { name: "UI 设计", price: 20, helps: ["设计系统", "交互动效", "可用性走查", "作品集指导"] },
  { name: "项目指导", price: 22, helps: ["范围拆解", "里程碑设定", "风险管理", "复盘方法"] },
];

function buildDossier(cand: MatchCandidate) {
  const rng = createRng(hashString(cand.id + "dossier"));
  const clamp = (v: number) => Math.max(42, Math.min(98, Math.round(v)));

  // 性格五维（围绕匹配度浮动）
  const traits = [
    { label: "战略思维", score: clamp(cand.matchScore + rng.range(-8, 8)) },
    { label: "创造力", score: clamp(cand.matchScore + rng.range(-12, 10)) },
    { label: "执行力", score: clamp(cand.matchScore + rng.range(-14, 6)) },
    { label: "社交能力", score: clamp(cand.matchScore - rng.range(5, 28)) },
    { label: "长期主义", score: clamp(cand.matchScore + rng.range(-4, 10)) },
  ];

  // 可提供的服务（固定成员用定制服务，其余随机）
  const services: Array<{ name: string; helps: string[]; price?: number }> =
    cand.customServices ?? rng.shuffle([...SERVICE_POOL]).slice(0, 4 + (rng.range(0, 2) | 0));

  // 帮助数据（固定成员用真实累计数）
  const helped = cand.helpedCount ?? Math.round(rng.range(46, 286));
  const helpStats = [
    { label: "帮助过", value: `${helped} 人` },
    { label: "获得感谢", value: `${Math.round(helped * rng.range(0.6, 0.9))} 次` },
    { label: "平均评分", value: rng.range(4.6, 5).toFixed(1) },
    { label: "连续活跃", value: `${Math.round(rng.range(21, 320))} 天` },
  ];

  // 帮助记录
  const records = rng.shuffle([
    `帮助 ${Math.round(rng.range(2, 9))} 名大三学生完成考研规划`,
    `指导 ${Math.round(rng.range(6, 18))} 名用户完成 AI 项目`,
    `参与 ${Math.round(rng.range(3, 8))} 个 Hackathon 项目`,
    `帮助 ${Math.round(rng.range(4, 12))} 名用户修改产品方案`,
    `陪伴 ${Math.round(rng.range(3, 10))} 位伙伴完成阶段性目标`,
  ]).slice(0, 4);

  // 可信度（平台行为数据）
  const credibility = [
    { label: "人格一致性", score: clamp(rng.range(84, 97)) },
    { label: "长期活跃度", score: clamp(rng.range(78, 96)) },
    { label: "任务完成率", score: clamp(rng.range(86, 98)) },
    { label: "社区贡献度", score: clamp(rng.range(80, 95)) },
  ];

  // 人生时间轴
  const timeline = rng.shuffle([
    ["2022", "本科毕业"],
    ["2023", `进入${rng.pick(["AI", "互联网", "设计", "教育"])}行业`],
    ["2024", rng.pick(["开始独立项目", "完成第一个产品", "拿到种子轮"])],
    ["2025", rng.pick(["参加 3 次 Hackathon", "完成 12 个交付项目", "组建 4 人小团队"])],
    ["2026", `成为${rng.pick(["AI 创业导师", "社区核心成员", "领域答疑人"])}`],
  ]).slice(0, 5).sort((a, b) => a[0].localeCompare(b[0]));

  // 在线状态
  const online = rng.range(0, 1) < 0.4;
  const lastActive = online ? null : `${Math.round(rng.range(1, 23))} 小时前`;

  // 个性化介绍
  const intro = `一个正在做${cand.role}的${cand.mbti}，目前${
    cand.type === "创业伙伴" ? "在寻找志同道合的伙伴" : cand.type === "行业导师" ? "愿意把自己的经验讲给别人听" : "在持续学习和输出"
  }。擅长${services[0].name.replace("经验", "")}和${services[1].name.replace("经验", "")}。过去一年完成了 ${Math.round(rng.range(2, 9))} 个项目，参加过 ${Math.round(rng.range(1, 6))} 次 Hackathon。`;

  return { traits, services, helpStats, records, credibility, timeline, online, lastActive, intro, helped };
}

const RECOMMEND_BY_TYPE: Record<MatchCandidate["type"], string> = {
  行业导师: "TA 比你早几年走过这条路，能帮你看到下一段路上的岔口。",
  创业伙伴: "TA 的目标与阶段和你高度互补，适合并肩把事情做成。",
  学习伙伴: "你们的学习节奏和目标同向，互相拉着前进不容易掉队。",
  兴趣朋友: "相似的经历和节奏，让你们更容易同频。",
};

// ─── 人物人格档案抽屉 ───
function DossierDrawer({
  cand,
  hue,
  neighbors,
  connected,
  onConnect,
  onClose,
}: {
  cand: MatchCandidate;
  hue: string;
  neighbors: Array<{ name: string; relation: string }>;
  connected: boolean;
  onConnect: () => void;
  onClose: () => void;
}) {
  const [openService, setOpenService] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [paid, setPaid] = useState<string[]>([]);
  const d = useMemo(() => buildDossier(cand), [cand]);
  const cheapest = d.services.reduce(
    (a, b) => ((a.price ?? 99) <= (b.price ?? 99) ? a : b),
    d.services[0],
  );
  const minPrice = cheapest?.price ?? 0;
  const primaryLabel =
    cand.type === "行业导师" ? "向 TA 请教"
    : cand.type === "创业伙伴" ? "邀请成为项目伙伴"
    : cand.type === "学习伙伴" ? "邀请一起学习"
    : "认识 TA";

  return (
    <motion.aside
      key="dossier"
      initial={{ x: 60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 60, opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="absolute inset-y-0 right-0 z-30 w-[420px] max-w-[92vw] overflow-y-auto border-l border-stroke bg-[#0B1020]/92 backdrop-blur-xl"
    >
      <div className="p-6">
        {/* 头部：头像 + 身份 */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-full p-[2.5px]" style={{ background: `linear-gradient(135deg, ${hue}, transparent 65%)`, boxShadow: `0 0 26px ${hue}55` }}>
              <div className="h-20 w-20 overflow-hidden rounded-full border border-stroke/80 bg-[#0B1020]">
                {cand.avatarVariant ? (
                  <MemberAvatar variant={cand.avatarVariant} size={76} />
                ) : (
                  <ToonAvatar seed={cand.name + cand.mbti} size={76} />
                )}
              </div>
            </div>
            <div>
              <p className="font-display text-2xl italic text-text-primary">{cand.name}</p>
              <p className="mt-0.5 text-xs tracking-widest text-[#89AACC]">{cand.mbti}</p>
              <p className="text-[11px] text-muted">{cand.archetype}</p>
              <p className="text-[11px] text-muted">{cand.role}</p>
              {d.online ? (
                <p className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  在线
                </p>
              ) : (
                <p className="mt-1 text-[10px] text-muted">最近活跃：{d.lastActive}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button onClick={onClose} className="rounded-full border border-stroke px-2 py-0.5 text-xs text-muted hover:text-text-primary">✕</button>
            <p className="font-display text-3xl italic text-[#89AACC]">
              {cand.matchScore}%<span className="ml-1 text-[10px] not-italic text-muted">匹配</span>
            </p>
          </div>
        </div>

        {/* TA 是什么样的人 */}
        <section className="mt-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-muted">TA 是什么样的人？</p>
          <p className="mb-3 text-xs text-text-primary/90">
            {cand.mbti} · {cand.archetype}——{["独立思考", "长期主义", "高目标感", "逻辑分析", "创造力"].join(" · ")}
          </p>
          <div className="space-y-2.5">
            {d.traits.map((t) => (
              <div key={t.label}>
                <div className="mb-1 flex justify-between text-[11px]">
                  <span className="text-muted">{t.label}</span>
                  <span className="font-display italic text-[#89AACC]">{t.score}%</span>
                </div>
                <ProgressBar value={t.score} />
              </div>
            ))}
          </div>
        </section>

        {/* 关于 TA */}
        <section className="mt-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-muted">关于 TA</p>
          <p className="rounded-2xl border border-stroke bg-bg/60 p-4 text-xs leading-relaxed text-text-primary/90">{d.intro}</p>
        </section>

        {/* 服务价目：付费后才能联系 TA */}
        <section className="mt-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-muted">服务价目 · 付费后即可联系 TA</p>
          <div className="space-y-1.5 rounded-2xl border border-[#E8C86A]/30 bg-[rgba(232,200,106,0.05)] p-3">
            {d.services.map((sv) => {
              const isPaid = paid.includes(sv.name);
              return (
                <div key={sv.name} className="flex items-center justify-between rounded-xl px-2 py-1.5">
                  <span className={`text-xs ${isPaid ? "text-[#89AACC]" : "text-text-primary/90"}`}>
                    {isPaid && <span className="mr-1.5 text-emerald-400">✓</span>}
                    {sv.name}
                  </span>
                  <div className="flex items-center gap-2.5">
                    <span className="font-display text-sm italic text-[#E8C86A]">¥{sv.price}</span>
                    {isPaid ? (
                      <span className="text-[10px] text-emerald-400">已支付</span>
                    ) : (
                      <button
                        onClick={() => setPaid((p) => [...p, sv.name])}
                        className="rounded-full border border-[#E8C86A]/50 px-2.5 py-0.5 text-[10px] text-[#E8C86A] transition-colors hover:bg-[rgba(232,200,106,0.12)]"
                      >
                        付费
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <p className="px-2 pt-1 text-[9px] text-muted/70">演示环境 · 点击付费即模拟完成支付</p>
          </div>
        </section>

        {/* TA 可以提供什么 */}
        <section className="mt-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-muted">TA 可以提供什么？</p>
          <div className="flex flex-wrap gap-2">
            {d.services.map((s) => (
              <button
                key={s.name}
                onClick={() => setOpenService(openService === s.name ? null : s.name)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                  openService === s.name
                    ? "border-transparent bg-[rgba(137,170,204,0.15)] text-[#89AACC]"
                    : "border-stroke text-muted hover:border-[#89AACC]/50 hover:text-text-primary"
                }`}
              >
                {s.name}
                {s.price != null && (
                  <span className="font-display italic text-[10px] text-[#E8C86A]">¥{s.price}</span>
                )}
              </button>
            ))}
          </div>
          <AnimatePresence>
            {openService && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 rounded-2xl border border-[#89AACC]/25 bg-[rgba(137,170,204,0.06)] p-4">
                  <p className="text-[10px] text-[#89AACC]">
                    TA 可以帮助你
                    {d.services.find((sv) => sv.name === openService)?.price != null && (
                      <span className="ml-1.5 text-[#E8C86A]">
                        · 单次 ¥{d.services.find((sv) => sv.name === openService)?.price}
                      </span>
                    )}
                    ：
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {d.services.find((s) => s.name === openService)?.helps.map((h) => (
                      <li key={h} className="text-[11px] text-text-primary/90">· {h}</li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* 帮助过多少人 */}
        <section className="mt-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-muted">TA 帮助过多少人？</p>
          <p className="font-display text-4xl italic text-[#89AACC]">
            {d.helped}<span className="ml-1.5 text-xs not-italic text-muted">人获得过 TA 的帮助</span>
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {d.helpStats.slice(1).map((s) => (
              <div key={s.label} className="rounded-xl border border-stroke bg-bg/60 p-2.5 text-center">
                <p className="text-[9px] text-muted">{s.label}</p>
                <p className="mt-0.5 text-sm text-text-primary">{s.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 帮助记录 */}
        <section className="mt-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-muted">帮助记录</p>
          <ul className="space-y-1.5">
            {d.records.map((r) => (
              <li key={r} className="flex gap-2 text-[11px] leading-relaxed text-text-primary/90">
                <span className="text-emerald-400">✓</span> {r}
              </li>
            ))}
          </ul>
        </section>

        {/* 人格可信度 */}
        <section className="mt-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-muted">人格可信度</p>
          <div className="space-y-2.5 rounded-2xl border border-stroke bg-bg/60 p-4">
            {d.credibility.map((c) => (
              <div key={c.label}>
                <div className="mb-1 flex justify-between text-[11px]">
                  <span className="text-muted">{c.label}</span>
                  <span className="text-[#89AACC]">{c.score}%</span>
                </div>
                <ProgressBar value={c.score} />
              </div>
            ))}
            <p className="pt-1 text-[10px] text-muted/70">以上数据来自 TA 在平台中的真实行为记录。</p>
          </div>
        </section>

        {/* TA 走过的路 */}
        <section className="mt-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-muted">TA 走过的路</p>
          <div>
            {d.timeline.map(([year, event], i) => (
              <div key={year + event} className="relative flex gap-3 pb-3 last:pb-0">
                {i < d.timeline.length - 1 && <span className="absolute left-[4px] top-3.5 h-full w-px bg-stroke" />}
                <span className="relative mt-1.5 h-[9px] w-[9px] shrink-0 rounded-full border-2 border-[#89AACC] bg-[#89AACC]/40" />
                <div>
                  <p className="text-[10px] text-muted">{year}</p>
                  <p className="text-xs text-text-primary/90">{event}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 为什么 AI 推荐 TA */}
        <section className="mt-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-muted">为什么 AI 推荐 TA？</p>
          <div className="rounded-2xl border border-[#89AACC]/25 bg-[rgba(137,170,204,0.06)] p-4">
            <p className="text-[11px] leading-relaxed text-muted">AI 分析你们的人格、目标和经历后发现：</p>
            <ol className="mt-2 space-y-1">
              {cand.reasons.slice(0, 3).map((r, i) => (
                <li key={r} className="text-[11px] leading-relaxed text-text-primary/90">
                  <span className="mr-1.5 font-display italic text-[#89AACC]">{["①", "②", "③", "④"][i]}</span>{r}
                </li>
              ))}
            </ol>
            <p className="mt-3 border-t border-stroke pt-2.5 text-[11px] leading-relaxed text-[#89AACC]">
              {RECOMMEND_BY_TYPE[cand.type]}
            </p>
          </div>
        </section>

        {/* TA 的人格关系网络（第二层） */}
        <section className="mt-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-muted">TA 的人格关系网络</p>
          <div className="flex flex-wrap gap-2">
            {neighbors.map((n) => (
              <span key={n.name + n.relation} className="rounded-full border border-stroke px-3 py-1 text-[10px] text-muted">
                {n.relation} · {n.name}
              </span>
            ))}
            <span className="rounded-full border border-stroke px-3 py-1 text-[10px] text-muted">
              TA 帮助过的人 · {d.helped} 人
            </span>
          </div>
        </section>

        {/* 行动按钮 */}
        <div className="sticky bottom-0 mt-6 flex gap-2.5 bg-gradient-to-t from-[#0B1020] via-[#0B1020]/95 to-transparent py-4">
          <button
            onClick={() => {
              if (connected) return;
              // 第一次点击 = 支付最低价服务，解锁联系
              if (paid.length === 0 && cheapest) {
                setPaid([cheapest.name]);
                return;
              }
              onConnect();
            }}
            disabled={connected}
            className={`flex-1 rounded-full px-4 py-3 text-xs font-medium transition-all ${
              connected
                ? "cursor-default bg-[rgba(137,170,204,0.12)] text-[#89AACC]"
                : paid.length === 0
                  ? "bg-[#E8C86A]/90 text-[#0B1020] hover:scale-[1.02] hover:bg-[#E8C86A]"
                  : "bg-text-primary text-bg hover:scale-[1.02]"
            }`}
          >
            {connected
              ? "✓ 已发送连接"
              : paid.length === 0
                ? <>¥{minPrice} · 解锁联系 TA</>
                : `${primaryLabel}（已付 ¥${d.services.filter((sv) => paid.includes(sv.name)).reduce((sum, sv) => sum + (sv.price ?? 0), 0)}）`}
          </button>
          <button
            onClick={() => setFavorite((f) => !f)}
            className={`rounded-full border px-4 py-3 text-xs transition-colors ${
              favorite ? "border-[#89AACC]/50 text-[#89AACC]" : "border-stroke text-muted hover:text-text-primary"
            }`}
          >
            {favorite ? "★ 已收藏" : "☆ 收藏"}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}

// ─── 星系画布：自带动画时钟，节点漂浮 + 连线实时跟随 ───
function GalaxyCanvas({
  nodes,
  edges,
  selfName,
  selfMbti,
  selfArchetype,
  connected,
  focusId,
  onSelect,
  helpCounts,
}: {
  nodes: GalaxyNode[];
  edges: Edge[];
  selfName: string;
  selfMbti: string;
  selfArchetype: string;
  connected: string[];
  focusId: string | null;
  onSelect: (id: string | "self" | null) => void;
  helpCounts: Map<string, number>;
}) {
  const [t, setT] = useState(0);
  const [hover, setHover] = useState<string | "self" | null>(null);
  useAnimationFrame((time) => setT(time));

  const floatSeeds = useMemo(
    () =>
      nodes.map((_, i) => ({
        ax: 0.9 + (i % 3) * 0.25,
        ay: 0.7 + (i % 4) * 0.2,
        sx: 0.00025 + (i % 5) * 0.00006,
        sy: 0.00022 + (i % 3) * 0.00007,
        px: (i * 1.7) % 6.28,
        py: (i * 2.3) % 6.28,
      })),
    [nodes],
  );

  // 当前帧坐标
  const selfPos = useMemo(() => ({ x: 50, y: 50 }), []);
  const selfFloat = {
    x: selfPos.x + Math.sin(t * 0.00018) * 0.7,
    y: selfPos.y + Math.cos(t * 0.00021) * 0.55,
  };
  const pos = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>([["self", selfFloat]]);
    nodes.forEach((n, i) => {
      const s = floatSeeds[i];
      map.set(n.cand.id, {
        x: n.bx + Math.sin(t * s.sx + s.px) * s.ax,
        y: n.by + Math.cos(t * s.sy + s.py) * s.ay,
      });
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, nodes, floatSeeds]);

  // 边集合由父层传入（抽屉需要读取节点关系）

  const focus = hover ?? focusId;
  const lit = (id: string) => (focus ? id === focus || edges.some((e) => (e.a === focus && e.b === id) || (e.b === focus && e.a === id)) : true);

  return (
    <>
      {/* 关系线（Obsidian 风格：悬停高亮直接关系，其余淡出） */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="line-grad-top" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00D4FF" />
            <stop offset="100%" stopColor="#FF2D95" />
          </linearGradient>
          <filter id="line-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="0.9" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {edges.map((e, i) => {
          const pa = pos.get(e.a);
          const pb = pos.get(e.b);
          if (!pa || !pb) return null;
          const related = !focus || e.a === focus || e.b === focus;
          const opacity = focus ? (related ? Math.min(e.base + 0.45, 0.95) : 0.04) : e.base;
          const stroke = e.gradient && (!focus || related) ? "url(#line-grad-top)" : "#89AACC";
          const common = {
            x1: pa.x,
            y1: pa.y,
            x2: pb.x,
            y2: pb.y,
            stroke,
            strokeWidth: related && focus ? e.width + 0.6 : e.width,
            strokeDasharray: e.dashed ? "1.6 1.6" : undefined,
            opacity,
            filter: "url(#line-glow)",
            vectorEffect: "non-scaling-stroke" as const,
          };
          return (
            <g key={i}>
              {e.double && <line {...common} transform="rotate(1.2 50 50)" opacity={opacity * 0.6} />}
              <line {...common} />
            </g>
          );
        })}
      </svg>

      {/* 中心：用户本人 */}
      <button
        onClick={() => onSelect("self")}
        onMouseEnter={() => setHover("self")}
        onMouseLeave={() => setHover(null)}
        className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 focus:outline-none"
        style={{ left: `${selfFloat.x}%`, top: `${selfFloat.y}%`, opacity: lit("self") ? 1 : 0.35, transition: "opacity 0.3s" }}
      >
        <div className="flex flex-col items-center">
          <div className="relative">
            <motion.div
              aria-hidden
              className="absolute -inset-3 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(137,170,204,0.35), transparent 70%)" }}
              animate={{ scale: [1, 1.12, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="accent-gradient relative flex h-24 w-24 items-center justify-center rounded-full p-[3px] shadow-[0_0_44px_rgba(137,170,204,0.45)]">
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#0A0F1E]">
                <ToonAvatar seed={selfName + selfMbti} size={90} />
              </div>
            </div>
          </div>
          <p className="mt-3 font-display text-lg italic text-text-primary">{selfName}</p>
          <p className="text-[10px] tracking-widest text-[#89AACC]">{selfMbti}</p>
          <p className="mt-0.5 text-[10px] text-muted">{selfArchetype}</p>
          <span className="mt-1.5 rounded-full border border-[#89AACC]/40 px-2 py-0.5 text-[9px] text-[#89AACC]">
            核心 · 你
          </span>
        </div>
      </button>

      {/* 外围节点（漂浮） */}
      {nodes.map((n, i) => {
        const p = pos.get(n.cand.id);
        if (!p) return null;
        const isConnected = connected.includes(n.cand.id);
        const isLit = lit(n.cand.id);
        return (
          <motion.button
            key={n.cand.id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: isLit ? 1 : 0.3, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.07, duration: 0.5 }}
            onClick={() => onSelect(n.cand.id)}
            onMouseEnter={() => setHover(n.cand.id)}
            onMouseLeave={() => setHover(null)}
            className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 focus:outline-none"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
            }}
          >
            <div className="flex flex-col items-center">
              <div
                className="rounded-full p-[2px] transition-transform duration-300 group-hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${n.hue}88, transparent 60%)`,
                  boxShadow: `0 0 14px ${n.hue}55`,
                }}
              >
                <div
                  className="flex items-center justify-center overflow-hidden rounded-full border border-stroke/80 bg-[#0B1020]/85 backdrop-blur-md"
                  style={{ width: n.size, height: n.size }}
                >
                  {n.cand.avatarVariant ? (
                    <MemberAvatar variant={n.cand.avatarVariant} size={n.size - 4} />
                  ) : (
                    <ToonAvatar seed={n.cand.name + n.cand.mbti} size={n.size - 4} />
                  )}
                </div>
              </div>
              <p className="mt-1.5 whitespace-nowrap text-[11px] text-text-primary/90">{n.cand.name}</p>
              <p className="whitespace-nowrap text-[9px] text-muted">
                {n.cand.mbti} · {n.cand.role}
              </p>
              <p className="font-display text-[11px] italic" style={{ color: n.hue }}>
                {n.cand.matchScore}%
              </p>
              {helpCounts.get(n.cand.id) !== undefined && (
                <p className="whitespace-nowrap text-[9px] text-muted/90">
                  ✳ 帮助 {helpCounts.get(n.cand.id)} 人
                </p>
              )}
              {(() => {
                const prices = (n.cand.customServices ?? [])
                  .map((sv) => sv.price)
                  .filter((p): p is number => typeof p === "number");
                if (!prices.length) return null;
                const min = Math.min(...prices);
                const max = Math.max(...prices);
                return (
                  <p className="whitespace-nowrap text-[9px] font-medium text-[#E8C86A]">
                    {min === max ? `服务 ¥${min}` : `服务 ¥${min}~${max}`}
                  </p>
                );
              })()}
              {isConnected && (
                <span className="mt-0.5 rounded-full bg-[rgba(137,170,204,0.15)] px-1.5 text-[8px] text-[#89AACC]">
                  ✓ 已连接
                </span>
              )}
            </div>
          </motion.button>
        );
      })}
    </>
  );
}

/** 布局疏散：把过近的节点互相推开（中心头像作为固定障碍物），避免头像叠在一起 */
function relaxLayout(nodes: GalaxyNode[]) {
  const W = 1080, H = 640, PAD = 46;
  const center = { x: 50, y: 50 };
  const all = [
    { x: (center.x / 100) * W, y: (center.y / 100) * H, rad: 112, fixed: true }, // 覆盖头像+下方文字块
    ...nodes.map((n) => ({
      x: (n.bx / 100) * W,
      y: (n.by / 100) * H,
      rad: n.size / 2 + PAD,
      fixed: false,
    })),
  ];
  for (let iter = 0; iter < 140; iter++) {
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const A = all[i], B = all[j];
        let dx = B.x - A.x, dy = B.y - A.y;
        let d = Math.hypot(dx, dy);
        const min = A.rad + B.rad;
        if (d >= min) continue;
        if (d < 0.01) { dx = 1; dy = 0; d = 1; }
        const push = (min - d) / 2;
        const ux = dx / d, uy = dy / d;
        if (!A.fixed) { A.x -= ux * push; A.y -= uy * push; }
        if (!B.fixed) { B.x += ux * push; B.y += uy * push; }
      }
    }
    // 边界约束：节点和下方文字都要留在画布内
    for (let i = 1; i < all.length; i++) {
      all[i].x = Math.max(58, Math.min(W - 58, all[i].x));
      all[i].y = Math.max(44, Math.min(H - 74, all[i].y));
    }
  }
  nodes.forEach((n, i) => {
    n.bx = (all[i + 1].x / W) * 100;
    n.by = (all[i + 1].y / H) * 100;
  });
}

export default function NetworkPage() {
  const { state, persona, dispatch } = useOS();
  const [connected, setConnected] = useState<string[]>([]);
  const [active, setActive] = useState<string | "self" | null>(null);
  const [sentToast, setSentToast] = useState<string | null>(null);

  const matches = useMemo(
    () => (state.profile && persona ? generateMatches(state.profile, persona) : []),
    [state.profile, persona],
  );

  // ── 星系布局：L2 高匹配(前4) / L3 潜在人脉(后4) / L4 弱关系(合成2个) ──
  const nodes = useMemo<GalaxyNode[]>(() => {
    if (!state.profile) return [];
    const rng = createRng(hashString(state.profile.name + "galaxy"));

    const l2 = matches.slice(0, 4);
    const l3 = matches.slice(4, 8);
    const WEAK_ROLES = ["独立音乐人", "山系户外玩家", "播客主播", "飞盘俱乐部主理人"];
    const weak: MatchCandidate[] = [0, 1].map((i) => {
      const name = `${rng.pick(["洛", "祁"])}${rng.pick(["之野", "一帆", "知夏", "沐风"])}`;
      return {
        id: `weak-${i}-${hashString(name)}`,
        name,
        role: rng.pick(WEAK_ROLES),
        archetype: "潜在发现",
        mbti: rng.pick(["ESFP", "ISTP", "ENFJ", "INFP"]),
        type: "兴趣朋友" as const,
        matchScore: Math.round(rng.range(38, 52)),
        reasons: ["弱关系：出现于你的扩展人脉圈，可能有潜在交集"],
        connected: false,
      };
    });

    const ring = (
      list: MatchCandidate[],
      layer: 2 | 3 | 4,
      radius: number,
      size: number,
    ): GalaxyNode[] =>
      list.map((cand, i) => {
        const angle = (rng.range(0, 360) + (360 / list.length) * i) * (Math.PI / 180);
        return {
          cand,
          layer,
          bx: 50 + Math.cos(angle) * radius,
          by: 50 + Math.sin(angle) * radius * 0.86,
          size: size + rng.range(-4, 4),
          hue: HUES[(hashString(cand.id) + i) % HUES.length],
        };
      });

    // 固定成员外环（避开弱关系节点的角度区间）
    const fixedNodes: GalaxyNode[] = FIXED_MEMBERS.map((cand, i) => {
      const angle = ((i * 40 + 12 + rng.range(-6, 6)) * Math.PI) / 180;
      return {
        cand,
        layer: 3,
        bx: 50 + Math.cos(angle) * 44,
        by: 50 + Math.sin(angle) * 44 * 0.86,
        size: 56 + rng.range(-3, 3),
        hue: HUES[(hashString(cand.id) + i) % HUES.length],
      };
    });
    const all = [...ring(l2, 2, 21, 66), ...ring(l3, 3, 33, 56), ...fixedNodes, ...ring(weak, 4, 44, 46)];
    relaxLayout(all);
    return all;
  }, [state.profile, matches]);

  // ── 边集合：中心→每个节点 + 少量外围交叉（抽屉与画布共用） ──
  const edges = useMemo<Edge[]>(() => {
    const list: Edge[] = [];
    nodes.forEach((n) => {
      const style = lineStyleFor(n.cand.type);
      const isTop = n === nodes[0];
      list.push({
        a: "self",
        b: n.cand.id,
        ...style,
        gradient: isTop,
        base: n.layer === 2 ? 0.5 : n.layer === 3 ? 0.3 : 0.18,
      });
    });
    const l2 = nodes.filter((n) => n.layer === 2);
    const l3 = nodes.filter((n) => n.layer === 3);
    if (l2[0] && l2[1]) list.push({ a: l2[0].cand.id, b: l2[1].cand.id, ...lineStyleFor(l2[0].cand.type), gradient: false, base: 0.16 });
    if (l2[2] && l3[0]) list.push({ a: l2[2].cand.id, b: l3[0].cand.id, ...lineStyleFor(l2[2].cand.type), gradient: false, base: 0.14 });
    if (l3[1] && l3[2]) list.push({ a: l3[1].cand.id, b: l3[2].cand.id, dashed: true, width: 1.2, double: false, gradient: false, base: 0.12 });
    return list;
  }, [nodes]);

  // 选中人物的直接关系（第二层网络展示用）
  const activeNode = active && active !== "self" ? nodes.find((n) => n.cand.id === active) ?? null : null;
  const neighbors = useMemo(() => {
    if (!active || active === "self") return [];
    return edges
      .filter((e) => e.a === active || e.b === active)
      .map((e) => {
        const otherId = e.a === active ? e.b : e.a;
        if (otherId === "self") return { name: "你", relation: "核心连接" };
        const other = nodes.find((n) => n.cand.id === otherId);
        return other ? { name: other.cand.name, relation: other.cand.type } : null;
      })
      .filter((x): x is { name: string; relation: string } => x !== null);
  }, [active, edges, nodes]);

  // 每个人物在社区中的互助数据（节点徽标 + 社区汇总）
  const helpCounts = useMemo(() => {
    const map = new Map<string, number>();
    nodes.forEach((n) => map.set(n.cand.id, buildDossier(n.cand).helped));
    return map;
  }, [nodes]);
  const communityTotal = useMemo(
    () => [...helpCounts.values()].reduce((a, b) => a + b, 0),
    [helpCounts],
  );

  const connect = (c: MatchCandidate) => {
    if (connected.includes(c.id)) return;
    setConnected((ids) => [...ids, c.id]);
    setSentToast(`已向 ${c.name} 发送连接申请（${c.type}）`);
    dispatch({ type: "addXp", amount: 10, reason: `连接了${c.type}${c.name}` });
    setTimeout(() => setSentToast(null), 2400);
  };

  const particles = useMemo(() => {
    const rng = createRng(20260828);
    return [...Array(20)].map((_, i) => ({
      left: rng.range(2, 98),
      top: rng.range(2, 98),
      size: rng.range(1.5, 3.5),
      hue: i % 3 === 0 ? "#FF2D95" : i % 3 === 1 ? "#7C3AED" : "#00D4FF",
      delay: rng.range(0, 6),
      duration: rng.range(4, 9),
    }));
  }, []);

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
    <div>
      {/* 标题 + 图例 */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <span className="h-px w-8 bg-stroke" />
            <span className="text-xs uppercase tracking-[0.3em] text-muted">Persona Network</span>
          </div>
          <h1 className="text-3xl tracking-tight text-text-primary md:text-4xl">
            你的人格<em className="font-display italic"> 星系 </em>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-muted">
          <span className="flex items-center gap-1.5">
            <svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="#89AACC" strokeWidth="1.4" /></svg>
            共同目标
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="22" height="6">
              <defs><linearGradient id="lg-leg"><stop offset="0%" stopColor="#00D4FF" /><stop offset="100%" stopColor="#FF2D95" /></linearGradient></defs>
              <line x1="0" y1="3" x2="22" y2="3" stroke="url(#lg-leg)" strokeWidth="1.4" />
            </svg>
            人格互补
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="#89AACC" strokeWidth="1.2" strokeDasharray="3 3" /></svg>
            相似经历
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="#89AACC" strokeWidth="2.6" /></svg>
            导师
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="22" height="8"><line x1="0" y1="2" x2="22" y2="2" stroke="#89AACC" strokeWidth="1" /><line x1="0" y1="6" x2="22" y2="6" stroke="#89AACC" strokeWidth="1" /></svg>
            学习伙伴
          </span>
        </div>
      </div>

      {/* 星系画布 */}
      <div
        className="relative h-[560px] overflow-hidden rounded-3xl border border-stroke md:h-[640px]"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(124,58,237,0.10), transparent 55%)," +
            "radial-gradient(ellipse at 72% 75%, rgba(0,212,255,0.07), transparent 55%)," +
            "radial-gradient(ellipse at 50% 50%, rgba(137,170,204,0.05), transparent 60%)," +
            "#05070F",
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(137,170,204,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(137,170,204,0.5) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        {particles.map((p, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="absolute rounded-full"
            style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size, background: p.hue, opacity: 0.35 }}
            animate={{ y: [0, -14, 0], opacity: [0.15, 0.45, 0.15] }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

        <GalaxyCanvas
          nodes={nodes}
          edges={edges}
          selfName={state.profile.name || "你"}
          selfMbti={state.profile.mbti}
          selfArchetype={persona.archetype}
          connected={connected}
          focusId={active}
          onSelect={(id) => setActive(id)}
          helpCounts={helpCounts}
        />

        {/* 第二层关系网络提示（选中人物时显示） */}
        {activeNode && (
          <div className="absolute right-4 top-4 z-20 text-right">
            <p className="text-[10px] tracking-[0.25em] text-[#89AACC]/80">TA 的人格关系网络</p>
            <p className="mt-0.5 text-[9px] text-muted/70">
              {neighbors.map((n) => n.name).join(" · ")}（高亮）
            </p>
          </div>
        )}

        {/* 自己的迷你面板 */}
        <AnimatePresence>
          {active === "self" && (
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.25 }}
              className="absolute bottom-4 right-4 z-20 w-72 rounded-2xl border border-stroke bg-[#0B1020]/90 p-5 backdrop-blur-xl"
            >
              <div>
                <div className="flex items-center justify-between">
                  <p className="font-display text-lg italic text-text-primary">{state.profile.name || "你"}</p>
                  <button onClick={() => setActive(null)} className="text-xs text-muted hover:text-text-primary">✕</button>
                </div>
                <p className="mt-0.5 text-[10px] text-muted">
                  {state.profile.mbti} · {persona.archetype}
                </p>
                <p className="mt-3 text-xs leading-relaxed text-muted">
                  你是这张网络的核心。AI 基于你的人格、目标、兴趣与阶段，持续为你寻找真正同频的人。
                </p>
                <p className="mt-3 text-[10px] text-[#89AACC]">画像完善度 {persona.completion}% · 连接 {connected.length} 人</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 人物人格档案抽屉 */}
        <AnimatePresence>
          {activeNode && (
            <DossierDrawer
              key={activeNode.cand.id}
              cand={activeNode.cand}
              hue={activeNode.hue}
              neighbors={neighbors}
              connected={connected.includes(activeNode.cand.id)}
              onConnect={() => connect(activeNode.cand)}
              onClose={() => setActive(null)}
            />
          )}
        </AnimatePresence>

        <div className="absolute left-4 top-4 space-y-1 text-[9px] text-muted/70">
          <p>● 内环 · 高匹配</p>
          <p>● 中环 · 潜在人脉</p>
          <p>● 外环 · 社区成员 / 弱关系</p>
          <p className="pt-1 text-[#89AACC]/80">✳ 社区累计互助 {communityTotal} 人次</p>
        </div>
      </div>

      <AnimatePresence>
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
      </AnimatePresence>
    </div>
  );
}
