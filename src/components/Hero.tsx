import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useHlsVideo } from "../hooks/useHlsVideo";

const HLS_SRC =
  "https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8";

const ROLES = ["Creative", "Fullstack", "Founder", "Scholar"];
const ROLE_INTERVAL_MS = 2000;

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useHlsVideo(HLS_SRC);
  const [roleIndex, setRoleIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setRoleIndex((i) => (i + 1) % ROLES.length),
      ROLE_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".name-reveal", {
        opacity: 0,
        y: 50,
        duration: 1.2,
        delay: 0.1,
        ease: "power3.out",
      });
      gsap.from(".blur-in", {
        opacity: 0,
        filter: "blur(10px)",
        y: 20,
        duration: 1,
        stagger: 0.1,
        delay: 0.3,
        ease: "power3.out",
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="home"
      ref={sectionRef}
      className="relative flex h-screen min-h-[640px] w-full items-center justify-center overflow-hidden"
    >
      {/* Background HLS video */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        className="absolute left-1/2 top-1/2 h-auto min-h-full w-auto min-w-full -translate-x-1/2 -translate-y-1/2 object-cover"
      />
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-bg to-transparent" />

      {/* Centered content */}
      <div className="relative z-10 px-6 text-center">
        <p className="blur-in mb-8 text-xs uppercase tracking-[0.3em] text-muted">
          COLLECTION &rsquo;26
        </p>

        <h1 className="name-reveal mb-6 font-display text-6xl italic leading-[0.9] tracking-tight text-text-primary md:text-8xl lg:text-9xl">
          Michael Smith
        </h1>

        <p className="mb-6 text-base text-muted md:text-lg">
          A{" "}
          <span
            key={roleIndex}
            className="animate-role-fade-in inline-block font-display italic text-text-primary"
          >
            {ROLES[roleIndex]}
          </span>{" "}
          lives in Chicago.
        </p>

        <p className="mx-auto mb-12 max-w-md text-sm text-muted md:text-base">
          Designing seamless digital interactions by focusing on the unique
          nuances which bring systems to life.
        </p>

        <div className="inline-flex flex-wrap justify-center gap-4">
          {/* Solid CTA */}
          <a href="#work" className="group relative rounded-full">
            <span
              aria-hidden="true"
              className="accent-gradient pointer-events-none absolute inset-[-2px] rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />
            <span className="relative inline-block rounded-full bg-text-primary px-7 py-3.5 text-sm text-bg transition-all duration-300 hover:scale-105 hover:bg-bg hover:text-text-primary">
              See Works
            </span>
          </a>

          {/* Outlined CTA */}
          <a href="mailto:hello@michaelsmith.com" className="group relative rounded-full">
            <span
              aria-hidden="true"
              className="accent-gradient pointer-events-none absolute inset-[-2px] rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />
            <span className="relative inline-block rounded-full border-2 border-stroke bg-bg px-7 py-3.5 text-sm text-text-primary transition-all duration-300 hover:scale-105 hover:border-transparent">
              Reach out...
            </span>
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-3">
        <span className="text-xs uppercase tracking-[0.2em] text-muted">
          Scroll
        </span>
        <div className="relative h-10 w-px overflow-hidden bg-stroke">
          <span className="animate-scroll-down absolute inset-x-0 top-0 h-full bg-text-primary/80" />
        </div>
      </div>
    </section>
  );
}
