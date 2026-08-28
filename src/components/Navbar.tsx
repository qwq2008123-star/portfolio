import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const LINKS = [
  { label: "Home", href: "#home" },
  { label: "Work", href: "#work" },
  { label: "Resume", href: "#contact" },
  { label: "Life OS", href: "/life-os" },
];

function isInternal(href: string): boolean {
  return href.startsWith("/");
}

function ArrowUpRight({ size = 12 }: { size?: number }) {
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

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("Home");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex justify-center px-4 pt-4 md:pt-6">
      <nav
        className={`inline-flex items-center rounded-full border border-white/10 bg-surface px-2 py-2 backdrop-blur-md transition-shadow duration-300 ${
          scrolled ? "shadow-md shadow-black/10" : ""
        }`}
      >
        {/* Logo — gradient ring reverses direction on hover */}
        <a
          href="#home"
          aria-label="Home"
          className="group relative block h-9 w-9 shrink-0 rounded-full transition-transform duration-300 hover:scale-110"
        >
          <span className="accent-gradient absolute inset-0 rounded-full" />
          <span className="accent-gradient-reverse absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <span className="absolute inset-[2px] flex items-center justify-center rounded-full bg-bg">
            <span className="font-display text-[13px] italic leading-none text-text-primary">
              JA
            </span>
          </span>
        </a>

        <span className="mx-1 hidden h-5 w-px bg-stroke sm:block" />

        {LINKS.map((link) =>
          isInternal(link.href) ? (
            <Link
              key={link.label}
              to={link.href}
              className="rounded-full px-3 py-1.5 text-xs transition-colors duration-300 sm:px-4 sm:py-2 sm:text-sm text-muted hover:bg-stroke/50 hover:text-text-primary"
            >
              {link.label}
            </Link>
          ) : (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setActive(link.label)}
              className={`rounded-full px-3 py-1.5 text-xs transition-colors duration-300 sm:px-4 sm:py-2 sm:text-sm ${
                active === link.label
                  ? "bg-stroke/50 text-text-primary"
                  : "text-muted hover:bg-stroke/50 hover:text-text-primary"
              }`}
            >
              {link.label}
            </a>
          ),
        )}

        <span className="mx-1 hidden h-5 w-px bg-stroke sm:block" />

        {/* Say hi — gradient ring appears behind on hover */}
        <a
          href="mailto:hello@michaelsmith.com"
          className="group relative overflow-hidden rounded-full"
        >
          <span
            aria-hidden="true"
            className="accent-gradient pointer-events-none absolute inset-[-2px] rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
          <span className="relative flex items-center gap-1 rounded-full bg-surface px-4 py-1.5 text-xs text-text-primary backdrop-blur-md transition-colors duration-300 group-hover:bg-surface sm:px-4 sm:py-2 sm:text-sm">
            Say hi
            <ArrowUpRight />
          </span>
        </a>
      </nav>
    </header>
  );
}
