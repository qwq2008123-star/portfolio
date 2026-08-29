import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface Module {
  title: string;
  en: string;
  desc: string;
  icon: string;
  href: string;
  spanClass: string;
}

const MODULES: Module[] = [
  {
    title: "内心圆桌",
    en: "Inner Circle",
    desc: "母亲、导师、朋友、内在小孩与未来的自己——五位 AI 陪伴角色围桌而坐，理解你的情绪，动态轮流发言。",
    icon: "🪑",
    href: "/life-os/companion",
    spanClass: "md:col-span-7",
  },
  {
    title: "未来模拟器",
    en: "Future Simulator",
    desc: "把「该不该」变成看得见的人生：多条路线 × 10 维变化 × 关键事件剧情 × 三种未来。",
    icon: "∿",
    href: "/life-os/simulator",
    spanClass: "md:col-span-5",
  },
  {
    title: "人格档案",
    en: "Persona Profile",
    desc: "随使用进化的动态人格：能力维度、成长轨迹，以及 AI 认识你的全部依据。",
    icon: "◉",
    href: "/life-os/profile",
    spanClass: "md:col-span-5",
  },
  {
    title: "决策助手",
    en: "Daily Assistant",
    desc: "按你的「日常计划（弹性版）」一步到位拍板今天的小选择：吃什么、去哪、怎么安排。",
    icon: "⚖",
    href: "/life-os/decisions",
    spanClass: "md:col-span-7",
  },
  {
    title: "人格网络",
    en: "Persona Network",
    desc: "星系状的人际生态：按人格匹配伙伴，浏览服务与价目，付费即可建立连接。",
    icon: "⬡",
    href: "/life-os/network",
    spanClass: "md:col-span-7",
  },
  {
    title: "成长系统",
    en: "Growth",
    desc: "XP、等级与成就贯穿全产品——每一次对话、连接与模拟，都在塑造你的档案。",
    icon: "✦",
    href: "/life-os",
    spanClass: "md:col-span-5",
  },
];

export default function Works() {
  return (
    <section id="work" className="bg-bg py-12 md:py-16">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 lg:px-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true, margin: "-100px" }}
          className="mb-10 flex flex-col gap-8 md:mb-14 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <div className="mb-5 flex items-center gap-3">
              <span className="h-px w-8 bg-stroke" />
              <span className="text-xs uppercase tracking-[0.3em] text-muted">
                System Modules
              </span>
            </div>
            <h2 className="text-4xl leading-tight tracking-tight text-text-primary md:text-5xl lg:text-6xl">
              六大核心<em className="font-display italic">模块</em>
            </h2>
            <p className="mt-4 max-w-md text-sm text-muted md:text-base">
              从情绪陪伴到未来模拟——每个模块都认识你，共同组成你的第二大脑。
            </p>
          </div>

          <Link to="/life-os" className="hidden md:inline-flex">
            <span className="group relative rounded-full">
              <span
                aria-hidden="true"
                className="accent-gradient animated-gradient-border pointer-events-none absolute -inset-px rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />
              <span className="relative inline-flex items-center gap-2 rounded-full border border-stroke bg-bg px-5 py-2.5 text-sm text-muted transition-colors duration-300 group-hover:border-transparent group-hover:text-text-primary">
                进入系统
                <span className="transition-transform duration-300 group-hover:translate-x-0.5">
                  <ArrowRight />
                </span>
              </span>
            </span>
          </Link>
        </motion.div>

        {/* Bento grid */}
        <div className="mt-2 grid grid-cols-1 gap-5 md:grid-cols-12 md:gap-6">
          {MODULES.map((mod, i) => (
            <motion.div
              key={mod.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.8,
                delay: i * 0.08,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className={mod.spanClass}
            >
              <Link
                to={mod.href}
                className={`group relative flex h-full min-h-[190px] flex-col justify-between overflow-hidden rounded-3xl border border-stroke bg-surface p-7 transition-colors duration-300 hover:border-[#89AACC]/40`}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-20 transition-opacity duration-500 group-hover:opacity-40"
                  style={{ background: "radial-gradient(circle, rgba(137,170,204,0.5), transparent 70%)" }}
                />
                <div className="flex items-start justify-between">
                  <span className="text-3xl">{mod.icon}</span>
                  <span className="text-[10px] uppercase tracking-[0.25em] text-muted">{mod.en}</span>
                </div>
                <div className="mt-6">
                  <h3 className="text-xl text-text-primary">{mod.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted">{mod.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs text-[#89AACC] transition-transform duration-300 group-hover:translate-x-1">
                    进入模块 <ArrowRight />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ArrowRight() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
