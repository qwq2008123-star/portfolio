import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AnimatePresence, motion } from "framer-motion";

interface Item {
  src: string;
  alt: string;
}

const ITEMS: Item[] = [
  {
    src: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=900&h=900&auto=format&fit=crop",
    alt: "Ocean wave study",
  },
  {
    src: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=900&h=900&auto=format&fit=crop",
    alt: "Foggy ridge",
  },
  {
    src: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=900&h=900&auto=format&fit=crop",
    alt: "Forest road",
  },
  {
    src: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?q=80&w=900&h=900&auto=format&fit=crop",
    alt: "Golden Gate at dusk",
  },
  {
    src: "https://images.unsplash.com/photo-1470813740244-df37b8c1edcb?q=80&w=900&h=900&auto=format&fit=crop",
    alt: "Starry night sky",
  },
  {
    src: "https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?q=80&w=900&h=900&auto=format&fit=crop",
    alt: "Milky way",
  },
];

export default function Explorations() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const col1Ref = useRef<HTMLDivElement>(null);
  const col2Ref = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<Item | null>(null);

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

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox]);

  const firstColumn = ITEMS.slice(0, 3);
  const secondColumn = ITEMS.slice(3);

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
        <a href="#" onClick={(e) => e.preventDefault()} className="mt-8 inline-flex">
          <span className="group relative rounded-full">
            <span
              aria-hidden="true"
              className="accent-gradient pointer-events-none absolute inset-[-2px] rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />
            <span className="relative inline-flex items-center gap-2 rounded-full border border-stroke bg-bg px-6 py-3 text-sm text-muted transition-colors duration-300 group-hover:border-transparent group-hover:text-text-primary">
              Dribbble
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

      {/* Layer 2 — parallax image columns */}
      <div className="pointer-events-none absolute inset-0 z-20">
        <div className="mx-auto grid h-full max-w-[1400px] grid-cols-2 gap-12 px-6 md:gap-40">
          <div
            ref={col1Ref}
            className="flex flex-col items-start gap-12 pt-[12vh] md:gap-40"
          >
            {firstColumn.map((item, i) => (
              <button
                key={item.src}
                type="button"
                aria-label={`Open ${item.alt}`}
                onClick={() => setLightbox(item)}
                className="group pointer-events-auto block aspect-square w-full max-w-[320px] cursor-pointer overflow-hidden rounded-3xl border border-stroke"
                style={{ transform: `rotate(${i % 2 === 0 ? "-3deg" : "2.5deg"})` }}
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </button>
            ))}
          </div>
          <div
            ref={col2Ref}
            className="flex flex-col items-start gap-12 pt-[45vh] md:gap-40"
          >
            {secondColumn.map((item, i) => (
              <button
                key={item.src}
                type="button"
                aria-label={`Open ${item.alt}`}
                onClick={() => setLightbox(item)}
                className="group pointer-events-auto block aspect-square w-full max-w-[320px] cursor-pointer overflow-hidden rounded-3xl border border-stroke"
                style={{ transform: `rotate(${i % 2 === 0 ? "-3deg" : "2.5deg"})` }}
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/90 p-6 backdrop-blur-sm"
            onClick={() => setLightbox(null)}
          >
            <motion.img
              src={lightbox.src.replace("w=900&h=900", "w=1600&h=1600")}
              alt={lightbox.alt}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
            />
            <button
              type="button"
              aria-label="Close lightbox"
              onClick={() => setLightbox(null)}
              className="absolute right-6 top-6 text-white/70 transition-colors hover:text-white"
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
