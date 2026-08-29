import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// ─── 视觉语言：自绘渐变面板（深空 / 霓虹 / 暖光 / 星尘 / 呼吸 / 极光） ───

interface Visual {
  title: string;
  en: string;
  background: string;
}

const VISUALS: Visual[] = [
  {
    title: "深空",
    en: "Deep Space",
    background: "radial-gradient(circle at 30% 30%, #312e81 0%, #0b1020 68%)",
  },
  {
    title: "霓虹",
    en: "Neon",
    background:
      "linear-gradient(135deg, rgba(0,212,255,0.35) 0%, rgba(255,45,149,0.35) 100%), #0b1020",
  },
  {
    title: "暖光",
    en: "Warmth",
    background:
      "radial-gradient(circle at 50% 40%, rgba(232,200,106,0.45) 0%, #171208 72%)",
  },
  {
    title: "星尘",
    en: "Stardust",
    background:
      "radial-gradient(circle at 70% 22%, rgba(255,255,255,0.55) 0%, transparent 2.5%)," +
      "radial-gradient(circle at 28% 58%, rgba(255,255,255,0.4) 0%, transparent 2%)," +
      "radial-gradient(circle at 55% 38%, rgba(137,170,204,0.45) 0%, transparent 2%)," +
      "radial-gradient(circle at 42% 78%, rgba(255,255,255,0.3) 0%, transparent 2%)," +
      "#070609",
  },
  {
    title: "呼吸",
    en: "Glow",
    background:
      "radial-gradient(circle at 50% 50%, rgba(137,170,204,0.35) 0%, #0a0f1e 66%)",
  },
  {
    title: "极光",
    en: "Aurora",
    background:
      "linear-gradient(160deg, rgba(52,211,153,0.3) 0%, rgba(124,58,237,0.35) 58%, #0b1020 100%)",
  },
];

export default function Explorations() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const col1Ref = useRef<HTMLDivElement>(null);
  const col2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const section = sectionRef.current;
    const content = contentRef.current;
    const col1 = col1Ref.current;
    const col2 = col2Ref.current;
    if (!section || !content || !col1 || !col2) return;

    const ctx = gsap.context(() => {
      // Pin the center content while columns scroll over it
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        pin: content,
        pinSpacing: false,
      });

      // Parallax drift — columns move in opposite directions
      gsap.fromTo(
        col1,
        { y: -60 },
        {
          y: 140,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        },
      );
      gsap.fromTo(
        col2,
        { y: 120 },
        {
          y: -160,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        },
      );
    }, section);

    return () => ctx.revert();
  }, []);

  const firstColumn = VISUALS.slice(0, 3);
  const secondColumn = VISUALS.slice(3);

  const tile = (v: Visual, i: number) => (
    <div
      key={v.en}
      className="flex aspect-square w-full max-w-[320px] items-center justify-center overflow-hidden rounded-[28px] border border-white/10"
      style={{ background: v.background, transform: `rotate(${i % 2 === 0 ? "-2.5deg" : "2deg"})` }}
    >
      <div className="text-center">
        <p className="text-[10px] uppercase tracking-[0.35em] text-white/50">{v.en}</p>
        <p className="mt-2 font-display text-2xl italic text-white/85">{v.title}</p>
      </div>
    </div>
  );

  return (
    <section
      id="explorations"
      ref={sectionRef}
      className="relative min-h-[300vh] overflow-hidden bg-bg"
    >
      {/* Layer 1 — pinned center content */}
      <div
        ref={contentRef}
        className="relative z-10 flex h-screen flex-col items-center justify-center px-6 text-center"
      >
        <div className="mb-5 flex items-center justify-center gap-3">
          <span className="h-px w-8 bg-stroke" />
          <span className="text-xs uppercase tracking-[0.3em] text-muted">
            Visual Language
          </span>
        </div>
        <h2 className="text-4xl leading-tight tracking-tight text-text-primary md:text-5xl lg:text-6xl">
          为思考而生的<em className="font-display italic">视觉语言</em>
        </h2>
        <p className="mt-4 max-w-md text-sm text-muted md:text-base">
          深空、霓虹与呼吸感的光——系统的视觉氛围沉淀。
        </p>
        <a href="/life-os" className="mt-8 inline-flex">
          <span className="group relative rounded-full">
            <span
              aria-hidden="true"
              className="accent-gradient pointer-events-none absolute inset-[-2px] rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />
            <span className="relative inline-flex items-center gap-2 rounded-full border border-stroke bg-bg px-6 py-3 text-sm text-muted transition-colors duration-300 group-hover:border-transparent group-hover:text-text-primary">
              进入系统
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M7 17L17 7M9 7h8v8" />
              </svg>
            </span>
          </span>
        </a>
      </div>

      {/* Layer 2 — parallax visual columns */}
      <div className="pointer-events-none absolute inset-0 z-20">
        <div className="mx-auto grid h-full max-w-[1400px] grid-cols-2 gap-12 px-6 md:gap-40">
          <div
            ref={col1Ref}
            className="flex flex-col items-start gap-12 pt-[12vh] md:gap-40"
          >
            {firstColumn.map((v, i) => tile(v, i))}
          </div>
          <div
            ref={col2Ref}
            className="flex flex-col items-start gap-12 pt-[45vh] md:gap-40"
          >
            {secondColumn.map((v, i) => tile(v, i + 1))}
          </div>
        </div>
      </div>
    </section>
  );
}
