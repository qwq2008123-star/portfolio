import { motion } from "framer-motion";

interface Entry {
  title: string;
  meta: string;
  image: string;
}

const ENTRIES: Entry[] = [
  {
    title: "Designing with Motion in Mind",
    meta: "5 min read · Aug 12, 2026",
    image:
      "https://images.unsplash.com/photo-1558655146-d09347e92766?q=80&w=400&auto=format&fit=crop",
  },
  {
    title: "Typography Is the Interface",
    meta: "4 min read · Jul 28, 2026",
    image:
      "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?q=80&w=400&auto=format&fit=crop",
  },
  {
    title: "Shipping Side Projects",
    meta: "6 min read · Jun 30, 2026",
    image:
      "https://images.unsplash.com/photo-1493421419110-74f4e85ba126?q=80&w=400&auto=format&fit=crop",
  },
  {
    title: "Notes on Creative Endurance",
    meta: "3 min read · Jun 03, 2026",
    image:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=400&auto=format&fit=crop",
  },
];

function ArrowUpRight() {
  return (
    <svg
      width="20"
      height="20"
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

export default function Journal() {
  return (
    <section id="journal" className="bg-bg py-16 md:py-24">
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
                Recent Thoughts
              </span>
            </div>
            <h2 className="text-4xl leading-tight tracking-tight text-text-primary md:text-5xl lg:text-6xl">
              Recent <em className="font-display italic">thoughts</em>
            </h2>
            <p className="mt-4 max-w-md text-sm text-muted md:text-base">
              Notes on design, code, and the craft of building for the web.
            </p>
          </div>

          <a href="#journal" className="hidden md:inline-flex">
            <span className="group relative rounded-full">
              <span
                aria-hidden="true"
                className="accent-gradient animated-gradient-border pointer-events-none absolute -inset-px rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />
              <span className="relative inline-flex items-center gap-2 rounded-full border border-stroke bg-bg px-5 py-2.5 text-sm text-muted transition-colors duration-300 group-hover:border-transparent group-hover:text-text-primary">
                View all
                <span className="transition-transform duration-300 group-hover:translate-x-0.5">
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
                </span>
              </span>
            </span>
          </a>
        </motion.div>

        {/* Entries */}
        <div className="mt-2 space-y-4">
          {ENTRIES.map((entry, i) => (
            <motion.div
              key={entry.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.8,
                delay: i * 0.06,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            >
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="group flex items-center gap-4 rounded-[40px] border border-stroke bg-surface/30 p-4 transition-colors duration-300 hover:bg-surface sm:gap-6 sm:rounded-full"
              >
                <img
                  src={entry.image}
                  alt=""
                  loading="lazy"
                  className="h-16 w-16 shrink-0 rounded-full object-cover sm:h-20 sm:w-20"
                />
                <div className="min-w-0">
                  <h3 className="truncate text-base text-text-primary sm:text-lg md:text-xl">
                    {entry.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted">{entry.meta}</p>
                </div>
                <span className="ml-auto mr-2 shrink-0 text-muted transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-text-primary sm:mr-4">
                  <ArrowUpRight />
                </span>
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
