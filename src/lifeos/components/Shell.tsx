import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useOS, xpForLevel, LEVEL_TITLES } from "../store/OSContext";
import { ProgressBar } from "./ui";

const NAV = [
  { to: "/life-os", label: "总览", icon: "◈", end: true },
  { to: "/life-os/decisions", label: "决策助手", icon: "⚖" },
  { to: "/life-os/simulator", label: "未来模拟器", icon: "∿" },
  { to: "/life-os/profile", label: "人格档案", icon: "◉" },
  { to: "/life-os/companion", label: "情绪陪伴", icon: "☾" },
  { to: "/life-os/network", label: "人格网络", icon: "⬡" },
];

const TITLES: Record<string, string> = {
  "/life-os": "总览",
  "/life-os/profile": "AI 人格档案",
  "/life-os/simulator": "AI 未来模拟器",
  "/life-os/decisions": "AI 人生决策助手",
  "/life-os/companion": "AI 情绪陪伴",
  "/life-os/network": "AI 人格生态网络",
};

export default function Shell() {
  const { state, persona, dispatch } = useOS();
  const location = useLocation();
  const navigate = useNavigate();
  const level = state.rpg?.level ?? 1;
  const xp = state.rpg?.xp ?? 0;
  const levelBase = xpForLevel(level);
  const nextBase = xpForLevel(level + 1);
  const xpProgress =
    level >= 5 ? 100 : ((xp - levelBase) / Math.max(nextBase - levelBase, 1)) * 100;

  const logout = () => {
    dispatch({ type: "logout" });
    navigate("/life-os/login");
  };

  return (
    <div className="flex min-h-screen bg-bg text-text-primary">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-stroke bg-surface/30 px-5 py-6 backdrop-blur-md lg:flex">
        <div className="mb-8 flex items-center gap-3">
          <span className="accent-gradient flex h-9 w-9 items-center justify-center rounded-xl font-display text-sm italic text-bg">
            OS
          </span>
          <div>
            <p className="font-display text-lg italic leading-none">AI Life OS</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-muted">
              Second Brain
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-200 ${
                  isActive
                    ? "bg-stroke/50 text-text-primary"
                    : "text-muted hover:bg-stroke/30 hover:text-text-primary"
                }`
              }
            >
              <span className="w-4 text-center text-xs opacity-70">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* 用户卡 + 成长进度 */}
        <div className="mt-6 rounded-2xl border border-stroke bg-bg/60 p-4">
          <div className="flex items-center justify-between">
            <p className="truncate text-sm">{state.account?.name ?? "旅人"}</p>
            <span className="font-display text-xs italic text-[#89AACC]">
              Lv.{level} {LEVEL_TITLES[level]}
            </span>
          </div>
          <ProgressBar value={xpProgress} className="mt-3" />
          <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
            <span>XP {xp}</span>
            <button onClick={logout} className="transition-colors hover:text-text-primary">
              退出
            </button>
          </div>
        </div>

        <Link
          to="/"
          className="mt-4 text-center text-[11px] text-muted transition-colors hover:text-text-primary"
        >
          ← 返回作品集
        </Link>
      </aside>

      {/* 主区域 */}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stroke bg-bg/80 px-6 py-4 backdrop-blur-md">
          <h2 className="font-display text-lg italic">{TITLES[location.pathname] ?? "AI Life OS"}</h2>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-full border border-stroke px-3 py-1 text-xs text-muted">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-green-400" />
              </span>
              {persona ? `引擎在线 · 画像完善度 ${persona.completion}%` : "引擎在线"}
            </span>
          </div>
        </header>

        {/* 移动端导航 */}
        <nav className="flex gap-2 overflow-x-auto border-b border-stroke px-4 py-3 lg:hidden">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  isActive
                    ? "border-transparent bg-stroke/50 text-text-primary"
                    : "border-stroke text-muted"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 px-6 py-8 md:px-10">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="mx-auto max-w-[1080px]"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
