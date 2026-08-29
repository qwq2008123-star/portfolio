import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { clamp } from "../engine/random";

// ─── Life OS 共享 UI 原语（沿用作品集暗色设计系统） ───

export function Card({
  children,
  className = "",
  glow = false,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border border-stroke bg-surface/40 p-6 backdrop-blur-sm ${
        glow ? "shadow-[0_0_40px_-12px_rgba(137,170,204,0.25)]" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: ReactNode;
  sub?: string;
}) {
  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center gap-3">
        <span className="h-px w-8 bg-stroke" />
        <span className="text-xs uppercase tracking-[0.3em] text-muted">{eyebrow}</span>
      </div>
      <h1 className="text-3xl tracking-tight text-text-primary md:text-4xl">{title}</h1>
      {sub && <p className="mt-3 max-w-xl text-sm text-muted">{sub}</p>}
    </div>
  );
}

export function GradientButton({
  children,
  onClick,
  disabled = false,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`group relative rounded-full ${className}`}
    >
      <span
        aria-hidden="true"
        className="accent-gradient pointer-events-none absolute inset-[-2px] rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <span
        className={`relative inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all duration-300 ${
          disabled
            ? "cursor-not-allowed bg-stroke/30 text-muted"
            : "bg-text-primary text-bg hover:scale-[1.02] hover:bg-transparent hover:text-text-primary"
        }`}
      >
        {children}
      </span>
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  active = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-xs transition-colors duration-300 ${
        active
          ? "border-transparent bg-stroke/50 text-text-primary"
          : "border-stroke text-muted hover:text-text-primary"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-stroke/50 ${className}`}>
      <motion.div
        className="accent-gradient h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${clamp(value, 0, 100)}%` }}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ boxShadow: "0 0 8px rgba(137, 170, 204, 0.35)" }}
      />
    </div>
  );
}

/** SVG 圆环进度 */
export function ScoreRing({
  value,
  size = 96,
  label,
}: {
  value: number;
  size?: number;
  label?: string;
}) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-stroke" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * clamp(value, 0, 100)) / 100 }}
          transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#89AACC" />
            <stop offset="100%" stopColor="#4E85BF" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-xl italic text-text-primary">{Math.round(value)}</span>
        {label && <span className="text-[10px] uppercase tracking-widest text-muted">{label}</span>}
      </div>
    </div>
  );
}

/** 六维人格雷达图（纯 SVG） */
export function Radar({ traits, size = 260 }: { traits: { label: string; score: number }[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 42;
  const n = traits.length;
  const point = (i: number, ratio: number): [number, number] => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(angle) * radius * ratio, cy + Math.sin(angle) * radius * ratio];
  };
  const polygon = traits.map((t, i) => point(i, t.score / 100).join(",")).join(" ");

  return (
    <svg width={size} height={size} className="overflow-visible">
      {[0.25, 0.5, 0.75, 1].map((ratio) => (
        <polygon
          key={ratio}
          points={traits.map((_, i) => point(i, ratio).join(",")).join(" ")}
          fill="none"
          stroke="currentColor"
          className="text-stroke"
          strokeWidth="1"
        />
      ))}
      {traits.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="currentColor" className="text-stroke" strokeWidth="1" />;
      })}
      <motion.polygon
        points={polygon}
        fill="rgba(137,170,204,0.14)"
        stroke="#89AACC"
        strokeWidth="1.5"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ transformOrigin: "center" }}
      />
      {traits.map((t, i) => {
        const [x, y] = point(i, 1.22);
        return (
          <text
            key={t.label}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-current text-muted"
            fontSize="11"
          >
            {t.label} {Math.round(t.score)}
          </text>
        );
      })}
    </svg>
  );
}

/** AI 思考动画 */
export function Thinking({ text = "AI 正在思考" }: { text?: string }) {
  const steps = ["调取星图", "分析历史行为", "推演可能路径", "生成结论"];
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % steps.length), 600);
    return () => clearInterval(id);
  }, [steps.length]);
  return (
    <div className="flex flex-col items-center gap-3 py-10">
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
      <div className="text-center">
        <p className="text-sm text-text-primary">{text}…</p>
        <p className="mt-1 text-xs text-muted">{steps[step]}</p>
      </div>
    </div>
  );
}

/** 打字机输出（模拟 AI 流式回复）。
 * 进度按「真实流逝时间」计算：定时器即使被浏览器限流（后台标签页 / 长开页面），
 * 下一次触发也会直接跳到正确位置。热更新 / 父组件重渲染导致 effect 重跑时，
 * 从已显示的长度续播而不是从头再来，文本永远不会冻在半截。点击可立即显示全文。 */
export function TypeOut({ text, speed = 18, onDone }: { text: string; speed?: number; onDone?: () => void }) {
  const [shown, setShown] = useState("");
  const shownLenRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    // 文本被替换（而非续写）时重置进度；否则从当前长度续播
    if (!text.startsWith(text.slice(0, shownLenRef.current))) shownLenRef.current = 0;
    doneRef.current = false;
    const start = performance.now() - shownLenRef.current * speed;
    let timer = 0;
    const tick = () => {
      if (doneRef.current) return; // 已被点击跳过
      const chars = Math.min(Math.floor((performance.now() - start) / speed), text.length);
      shownLenRef.current = chars;
      setShown(text.slice(0, chars));
      if (chars >= text.length) {
        doneRef.current = true;
        onDone?.();
        return;
      }
      timer = window.setTimeout(tick, 50);
    };
    timer = window.setTimeout(tick, 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed]);

  const skip = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    shownLenRef.current = text.length;
    setShown(text);
    onDone?.();
  };

  const finished = shown.length >= text.length;
  return (
    <span className="whitespace-pre-wrap" onClick={skip}>
      {shown}
      {!finished && <span className="animate-pulse">▍</span>}
    </span>
  );
}

export function Chip({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "accent" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${
        tone === "accent"
          ? "border-transparent bg-[rgba(137,170,204,0.12)] text-[#89AACC]"
          : "border-stroke text-muted"
      }`}
    >
      {children}
    </span>
  );
}

export function EmptyState({ icon, title, sub, action }: { icon: string; title: string; sub: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-stroke py-16 text-center">
      <span className="text-4xl">{icon}</span>
      <p className="text-text-primary">{title}</p>
      <p className="max-w-sm text-sm text-muted">{sub}</p>
      {action}
    </div>
  );
}
