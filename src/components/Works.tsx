import { motion } from "framer-motion";

interface Project {
  title: string;
  image: string;
  alt: string;
  spanClass: string;
  aspectClass: string;
}

const PROJECTS: Project[] = [
  {
    title: "Automotive Motion",
    image:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1600&auto=format&fit=crop",
    alt: "Dark sports car in motion",
    spanClass: "md:col-span-7",
    aspectClass: "aspect-[4/3] md:aspect-[16/9]",
  },
  {
    title: "Urban Architecture",
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1600&auto=format&fit=crop",
    alt: "Modern skyscraper facade",
    spanClass: "md:col-span-5",
    aspectClass: "aspect-[4/3]",
  },
  {
    title: "Human Perspective",
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1600&auto=format&fit=crop",
    alt: "Portrait study",
    spanClass: "md:col-span-5",
    aspectClass: "aspect-[4/3]",
  },
  {
    title: "Brand Identity",
    image:
      "https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=1600&auto=format&fit=crop",
    alt: "Brand stationery flat lay",
    spanClass: "md:col-span-7",
    aspectClass: "aspect-[4/3] md:aspect-[16/9]",
  },
];

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
                Selected Work
              </span>
            </div>
            <h2 className="text-4xl leading-tight tracking-tight text-text-primary md:text-5xl lg:text-6xl">
              Featured <em className="font-display italic">projects</em>
            </h2>
            <p className="mt-4 max-w-md text-sm text-muted md:text-base">
              A selection of projects I&rsquo;ve worked on, from concept to
              launch.
            </p>
          </div>

          <a href="#work" className="hidden md:inline-flex">
            <span className="group relative rounded-full">
              <span
                aria-hidden="true"
                className="accent-gradient animated-gradient-border pointer-events-none absolute -inset-px rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />
              <span className="relative inline-flex items-center gap-2 rounded-full border border-stroke bg-bg px-5 py-2.5 text-sm text-muted transition-colors duration-300 group-hover:border-transparent group-hover:text-text-primary">
                View all work
                <span className="transition-transform duration-300 group-hover:translate-x-0.5">
                  <ArrowRight />
                </span>
              </span>
            </span>
          </a>
        </motion.div>

        {/* Bento grid */}
        <div className="mt-2 grid grid-cols-1 gap-5 md:grid-cols-12 md:gap-6">
          {PROJECTS.map((project, i) => (
            <motion.div
              key={project.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.8,
                delay: i * 0.08,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className={project.spanClass}
            >
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                aria-label={`View ${project.title}`}
                className={`group relative block overflow-hidden rounded-3xl border border-stroke bg-surface transition-colors duration-500 ${project.aspectClass}`}
              >
                <img
                  src={project.image}
                  alt={project.alt}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />

                {/* Halftone overlay */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-20 mix-blend-multiply"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle, #000 1px, transparent 1px)",
                    backgroundSize: "4px 4px",
                  }}
                />

                {/* Hover veil */}
                <div className="absolute inset-0 flex items-center justify-center bg-bg/70 opacity-0 backdrop-blur-lg transition-opacity duration-500 group-hover:opacity-100">
                  <span className="relative overflow-hidden rounded-full p-[1.5px]">
                    <span
                      aria-hidden="true"
                      className="accent-gradient animated-gradient-border absolute inset-0 rounded-full"
                    />
                    <span className="relative block whitespace-nowrap rounded-full bg-white px-6 py-3 text-sm text-black">
                      View —{" "}
                      <span className="font-display italic">
                        {project.title}
                      </span>
                    </span>
                  </span>
                </div>
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
