import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useHlsVideo } from "../hooks/useHlsVideo";

const HLS_SRC =
  "https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8";

const MARQUEE_TEXT = "BUILDING THE FUTURE • ".repeat(10);

const SOCIALS = ["Twitter", "LinkedIn", "Dribbble", "GitHub"];

function ArrowUpRight({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
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
  );
}

export default function Contact() {
  const trackRef = useRef<HTMLDivElement>(null);
  const videoRef = useHlsVideo(HLS_SRC);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const tween = gsap.to(track, {
      xPercent: -50,
      duration: 40,
      ease: "none",
      repeat: -1,
    });

    return () => {
      tween.kill();
    };
  }, []);

  return (
    <footer
      id="contact"
      className="relative overflow-hidden bg-bg pb-8 pt-16 md:pb-12 md:pt-20"
    >
      {/* Background HLS video — flipped vertically */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="absolute left-1/2 top-1/2 h-auto min-h-full w-auto min-w-full -translate-x-1/2 -translate-y-1/2 scale-y-[-1] object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute left-0 right-0 top-0 h-32 bg-gradient-to-b from-bg to-transparent" />
      </div>

      {/* Marquee */}
      <div className="relative z-10 select-none overflow-hidden">
        <div
          ref={trackRef}
          className="flex w-max whitespace-nowrap will-change-transform"
        >
          <span className="shrink-0 whitespace-pre pr-4 font-display text-4xl uppercase italic tracking-tight text-text-primary/90 sm:text-5xl md:text-7xl">
            {MARQUEE_TEXT}
          </span>
          <span className="shrink-0 whitespace-pre pr-4 font-display text-4xl uppercase italic tracking-tight text-text-primary/90 sm:text-5xl md:text-7xl">
            {MARQUEE_TEXT}
          </span>
        </div>
      </div>

      {/* CTA */}
      <div className="relative z-10 mt-12 flex flex-col items-center gap-6 px-6">
        <span className="text-xs uppercase tracking-[0.3em] text-muted">
          Have a project in mind?
        </span>
        <a href="mailto:hello@michaelsmith.com" className="inline-flex">
          <span className="group relative rounded-full">
            <span
              aria-hidden="true"
              className="accent-gradient pointer-events-none absolute inset-[-2px] rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />
            <span className="relative inline-flex items-center gap-2 rounded-full bg-text-primary px-9 py-4 text-base font-medium text-bg transition-colors duration-300 group-hover:bg-transparent group-hover:text-text-primary md:text-lg">
              hello@michaelsmith.com
              <ArrowUpRight />
            </span>
          </span>
        </a>
      </div>

      {/* Footer bar */}
      <div className="relative z-10 mt-16 border-t border-white/10 md:mt-20">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 px-6 pt-8 md:flex-row">
          <nav className="flex items-center gap-6">
            {SOCIALS.map((social) => (
              <a
                key={social}
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-sm text-muted transition-colors duration-300 hover:text-text-primary"
              >
                {social}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
            </span>
            Available for projects
          </div>
        </div>
      </div>
    </footer>
  );
}
