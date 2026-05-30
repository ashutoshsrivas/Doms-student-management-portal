'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  FiArrowUpRight,
  FiArrowRight,
  FiArrowDown,
  FiLinkedin,
  FiFacebook,
  FiInstagram,
  FiYoutube,
  FiTwitter,
  FiPlus,
  FiMapPin,
  FiPhone,
  FiMail,
} from 'react-icons/fi';
import AnnouncementsSection from './components/Announcements/AnnouncementsSection';

/* ──────────────────────────────────────────────────────────────
   GESoM Landing — Editorial Modernist
   Aesthetic: deep ink navy + warm ivory + refined antique gold.
   Display: Fraunces (axes: opsz, SOFT)
   Body: Manrope
   ────────────────────────────────────────────────────────────── */

const INK = '#0a1f3d';
const INK_DEEP = '#06152a';
const IVORY = '#f6f1e7';
const IVORY_DEEP = '#ede5d3';
const GOLD = '#b88a3e';
const GOLD_SOFT = '#d9b878';

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [openProgram, setOpenProgram] = useState<number | null>(0);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.play().catch(() => {});
  }, []);

  /* ── data ─────────────────────────────────────────────────── */

  const programs = [
    {
      code: '01',
      name: 'Master of Business Administration',
      short: 'MBA',
      duration: '2 Years · Full-Time',
      blurb:
        'A rigorous, broad-based program building the analytical, leadership and decision-making instincts of a modern general manager.',
      specializations: [
        'Marketing',
        'Finance',
        'Human Resources',
        'Operations',
        'Business Analytics',
        'International Business',
      ],
    },
    {
      code: '02',
      name: 'MBA IMPACT',
      short: 'Industry-Integrated',
      duration: '2 Years · Cohort-Based',
      blurb:
        'An industry-immersive MBA built with corporate partners — live projects, on-site residencies and mentor-led capstone work.',
      specializations: [
        'Live Industry Projects',
        'Senior Mentor Network',
        'Quarterly Residencies',
        'Capstone Consulting',
      ],
    },
    {
      code: '03',
      name: 'MBA in AI & Data Science',
      short: 'Tech × Strategy',
      duration: '2 Years · STEM-Aligned',
      blurb:
        'For the next generation of leaders fluent in machine learning, data products and the strategic implications of intelligent systems.',
      specializations: [
        'Applied Machine Learning',
        'Decision Analytics',
        'AI Product Strategy',
        'Data-Driven Marketing',
      ],
    },
    {
      code: '04',
      name: 'Doctoral Programme — Ph.D.',
      short: 'Research',
      duration: 'Min. 3 Years',
      blurb:
        'A research-intensive doctorate for scholars and practitioners building original work at the frontier of management thought.',
      specializations: [
        'Strategy & Organization',
        'Finance & Economics',
        'Marketing & Consumer Behavior',
        'OB & Human Resources',
      ],
    },
  ];

  const stats = [
    { fig: '20+', cap: 'Years of academic excellence' },
    { fig: '100%', cap: 'Placement record, 2024 cohort' },
    { fig: '₹15.4 L', cap: 'Highest package, 2025' },
    { fig: '29', cap: 'Active corporate partners' },
  ];

  const pillars = [
    {
      n: 'I',
      title: 'A faculty drawn from research and practice.',
      body: 'Professors trained at leading institutes — IIMs, IITs and global universities — supported by a roster of senior industry mentors.',
    },
    {
      n: 'II',
      title: 'A curriculum built for the next economy.',
      body: 'Case-based pedagogy, live consulting work, and structured exposure to analytics, AI and emerging business models.',
    },
    {
      n: 'III',
      title: 'A campus that earns the work.',
      body: 'Modern lecture theatres, syndicate rooms, a finance lab, an analytics suite and one of the largest management libraries in the region.',
    },
  ];

  const placements = [
    { name: 'Dikshant Sharma', program: 'MBA · Finance', pkg: '₹15.4 L', year: '2025' },
    { name: 'Vanshika Kakkar', program: 'MBA · Marketing', pkg: '₹10.2 L', year: '2025' },
    { name: 'Shreyansh Rohilla', program: 'MBA IMPACT', pkg: '₹10.2 L', year: '2025' },
  ];

  const recruiters = [
    'Deloitte', 'EY', 'KPMG', 'HDFC Bank', 'ICICI Bank', 'TCS',
    'Infosys', 'Wipro', 'Accenture', 'Cognizant', 'Tech Mahindra', 'Genpact',
    'Capgemini', 'Berger Paints', 'Asian Paints', 'Bajaj Allianz',
  ];

  const contacts = [
    {
      Icon: FiMapPin,
      title: 'Visit',
      lines: [
        '566/6, Bell Road, Clement Town,',
        'Dehradun, Uttarakhand 248002',
      ],
    },
    {
      Icon: FiPhone,
      title: 'Admissions',
      lines: ['1800 890 6027', '1800 270 1280'],
    },
    {
      Icon: FiMail,
      title: 'Write',
      lines: ['admissions@geu.ac.in'],
    },
  ];

  return (
    <div className="gesom-root">
      {/* ───────── Type + theme ───────── */}
      <style jsx global>{`
        .gesom-root {
          --ink: ${INK};
          --ink-deep: ${INK_DEEP};
          --ivory: ${IVORY};
          --ivory-deep: ${IVORY_DEEP};
          --gold: ${GOLD};
          --gold-soft: ${GOLD_SOFT};
          background: var(--ivory);
          color: var(--ink);
          font-family: var(--font-manrope), 'Manrope', system-ui, sans-serif;
          font-feature-settings: 'ss01', 'ss02', 'cv11';
          -webkit-font-smoothing: antialiased;
        }
        .gesom-root .serif {
          font-family: var(--font-fraunces), 'Fraunces', Georgia, serif;
          font-feature-settings: 'ss01', 'ss03', 'ss05';
          letter-spacing: -0.015em;
        }
        .gesom-root .grain {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.06;
          mix-blend-mode: multiply;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
        }
        .gesom-root .rule {
          height: 1px;
          background: linear-gradient(to right, transparent, ${INK}33, transparent);
        }
        .gesom-root .rule-gold {
          height: 1px;
          background: linear-gradient(to right, ${GOLD}88, ${GOLD}22 60%, transparent);
        }
        .gesom-root .display-tight {
          line-height: 0.96;
          letter-spacing: -0.03em;
        }
        .gesom-root .marquee {
          animation: gesom-marquee 38s linear infinite;
        }
        @keyframes gesom-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .gesom-root .reveal {
          opacity: 0;
          transform: translateY(14px);
          animation: gesom-reveal 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
        }
        @keyframes gesom-reveal {
          to { opacity: 1; transform: translateY(0); }
        }
        .gesom-root .reveal-1 { animation-delay: 0.10s; }
        .gesom-root .reveal-2 { animation-delay: 0.22s; }
        .gesom-root .reveal-3 { animation-delay: 0.34s; }
        .gesom-root .reveal-4 { animation-delay: 0.46s; }
        .gesom-root .reveal-5 { animation-delay: 0.58s; }
        .gesom-root .reveal-6 { animation-delay: 0.70s; }
        .gesom-root .link-line {
          background-image: linear-gradient(currentColor, currentColor);
          background-size: 100% 1px;
          background-repeat: no-repeat;
          background-position: 0 100%;
          transition: background-size 0.45s cubic-bezier(0.2, 0.7, 0.2, 1);
        }
        .gesom-root .link-line:hover {
          background-size: 0% 1px;
          background-position: 100% 100%;
        }
        .gesom-root .arrow-icon {
          transition: transform 0.35s cubic-bezier(0.2, 0.7, 0.2, 1);
        }
        .group:hover .gesom-root .arrow-icon,
        .gesom-root .group:hover .arrow-icon {
          transform: translate(2px, -2px);
        }
        .gesom-root .num {
          font-variant-numeric: tabular-nums lining-nums;
        }
        .gesom-root .scribe-tag {
          font-family: var(--font-manrope), 'Manrope', sans-serif;
          font-weight: 500;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          font-size: 11px;
        }
      `}</style>

      {/* ─────────────────────── Nav ─────────────────────── */}
      <header className="sticky top-0 z-50 bg-[var(--ivory)]/85 backdrop-blur-md border-b border-[var(--ink)]/10">
        <div className="max-w-[1380px] mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-baseline gap-3">
            <span className="serif text-[26px] font-semibold tracking-tight text-[var(--ink)] leading-none">
              GES<span className="italic font-medium" style={{ fontVariationSettings: '"SOFT" 100' }}>o</span>M
            </span>
            <span className="scribe-tag text-[var(--ink)]/55 hidden sm:inline">
              Est. 2006 · Dehradun
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-9 text-[13px] font-medium text-[var(--ink)]/75">
            <a href="#programs"  className="link-line">Programmes</a>
            <a href="#pillars"   className="link-line">The Difference</a>
            <a href="#placements" className="link-line">Placements</a>
            <a href="#about"     className="link-line">About</a>
            <a href="#contact"   className="link-line">Contact</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-[var(--ink)] link-line"
            >
              Sign in
            </Link>
            <a
              href="https://apply.geu.ac.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--ink)] hover:bg-[var(--ink-deep)] text-[var(--ivory)] text-[13px] font-semibold rounded-full transition"
            >
              Apply 2026
              <FiArrowUpRight className="arrow-icon" />
            </a>
          </div>
        </div>
      </header>

      {/* ─────────────────────── Hero ─────────────────────── */}
      <section className="relative overflow-hidden bg-[var(--ink-deep)]">
        {/* Cinematic video on right; ivory editorial column on left */}
        <div className="absolute inset-0">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover opacity-90"
            autoPlay
            muted
            loop
            playsInline
            poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 600'%3E%3Crect fill='%23061528' width='1200' height='600'/%3E%3C/svg%3E"
          >
            <source
              src="https://geu.ac.in/uploads/page_section_attributes/VDd0PpwcgWvddNdkOK823B05H1KhyNeAHiNIAJXO.mp4"
              type="video/mp4"
            />
            <source src="/video.mp4" type="video/mp4" />
          </video>
          {/* Ivory drape on left third */}
          <div className="absolute inset-y-0 left-0 w-full lg:w-[58%] bg-gradient-to-r from-[var(--ivory)] via-[var(--ivory)]/95 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink-deep)]/40 via-transparent to-transparent" />
          <div className="grain" />
        </div>

        <div className="relative max-w-[1380px] mx-auto px-6 lg:px-12 pt-14 lg:pt-24 pb-14 lg:pb-28 grid lg:grid-cols-12 gap-10 items-end min-h-[88vh]">
          {/* Eyebrow rail */}
          <div className="lg:col-span-7 xl:col-span-7">
            <div className="reveal reveal-1 flex items-center gap-4 mb-10">
              <span className="block w-10 h-px bg-[var(--gold)]" />
              <span className="scribe-tag text-[var(--ink)]/75">
                Graphic Era · School of Management
              </span>
            </div>

            <h1 className="reveal reveal-2 serif display-tight text-[clamp(56px,9vw,128px)] font-medium text-[var(--ink)]">
              The school
              <br />
              <span className="italic font-light" style={{ fontVariationSettings: '"SOFT" 100, "opsz" 144' }}>
                of leaders
              </span>
              <br />
              <span className="text-[var(--ink)]/70">in the making.</span>
            </h1>

            <div className="reveal reveal-3 mt-10 max-w-xl">
              <p className="text-[17px] leading-relaxed text-[var(--ink)]/75">
                For two decades the Graphic Era School of Management has trained
                the country&rsquo;s general managers, founders and analysts —
                with a curriculum that prizes rigour over rhetoric, and a
                faculty drawn equally from research and practice.
              </p>
            </div>

            <div className="reveal reveal-4 mt-10 flex flex-wrap items-center gap-5">
              <a
                href="https://apply.geu.ac.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3 px-7 py-4 bg-[var(--ink)] text-[var(--ivory)] rounded-full text-[14px] font-semibold tracking-wide hover:bg-[var(--ink-deep)] transition"
              >
                Begin your application
                <FiArrowUpRight className="arrow-icon" />
              </a>
              <a
                href="#programs"
                className="group inline-flex items-center gap-3 text-[14px] font-medium text-[var(--ink)]"
              >
                <span className="link-line">View the programmes</span>
                <FiArrowRight className="arrow-icon" />
              </a>
            </div>

            <div className="reveal reveal-5 mt-16 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 max-w-2xl border-t border-[var(--ink)]/15 pt-7">
              {stats.map((s) => (
                <div key={s.cap}>
                  <p className="serif num text-[28px] sm:text-[34px] font-semibold text-[var(--ink)] leading-none">
                    {s.fig}
                  </p>
                  <p className="mt-2 text-[11px] leading-snug text-[var(--ink)]/55 uppercase tracking-[0.16em]">
                    {s.cap}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right-rail editorial caption sitting over video */}
          <div className="hidden lg:flex lg:col-span-5 xl:col-span-5 self-end justify-end">
            <div className="reveal reveal-6 max-w-[280px] text-right text-[var(--ivory)]">
              <span className="scribe-tag text-[var(--gold-soft)]">Volume XX · 2006 — 2026</span>
              <p className="serif italic text-[22px] leading-snug mt-4 text-[var(--ivory)]/90">
                &ldquo;A management school is judged by the work of its
                graduates, not the words of its prospectus.&rdquo;
              </p>
              <p className="scribe-tag mt-3 text-[var(--ivory)]/55">
                — Office of the Director
              </p>
            </div>
          </div>
        </div>

        {/* Bottom rule + scroll cue */}
        <div className="relative">
          <div className="absolute -top-px left-0 right-0 h-px bg-[var(--ink)]/15" />
          <a
            href="#programs"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[var(--ivory)]/70 hover:text-[var(--gold-soft)] transition"
          >
            <span className="scribe-tag">Continue</span>
            <FiArrowDown className="animate-bounce" />
          </a>
        </div>
      </section>

      {/* ─────────────────────── Marquee ─────────────────────── */}
      <section className="bg-[var(--ink)] text-[var(--ivory)]/85 py-5 overflow-hidden border-y border-[var(--gold)]/20">
        <div className="flex marquee whitespace-nowrap">
          {[...Array(2)].map((_, j) => (
            <div key={j} className="flex items-center gap-12 px-6 shrink-0">
              {recruiters.concat(recruiters.slice(0, 6)).map((r, i) => (
                <span key={`${j}-${i}`} className="flex items-center gap-12">
                  <span className="serif italic text-[19px] font-light text-[var(--ivory)]/85">
                    {r}
                  </span>
                  <span className="text-[var(--gold-soft)]/40">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────── Programmes ─────────────────────── */}
      <section id="programs" className="relative py-24 lg:py-36 bg-[var(--ivory)]">
        <div className="max-w-[1380px] mx-auto px-6 lg:px-12">
          {/* Section heading — asymmetric editorial */}
          <div className="grid lg:grid-cols-12 gap-10 mb-16 lg:mb-24">
            <div className="lg:col-span-3">
              <span className="scribe-tag text-[var(--gold)]">§ I — Programmes</span>
              <div className="rule-gold mt-3 max-w-[80px]" />
            </div>
            <div className="lg:col-span-9">
              <h2 className="serif display-tight text-[clamp(40px,5.5vw,76px)] font-medium text-[var(--ink)]">
                Four programmes.
                <br />
                <span className="italic font-light" style={{ fontVariationSettings: '"SOFT" 100' }}>
                  One philosophy
                </span>
                <span className="text-[var(--gold)]">.</span>
              </h2>
              <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-[var(--ink)]/70">
                Each programme answers a different question — but all of them
                are built on the same conviction: that management is a
                discipline, not a vocabulary.
              </p>
            </div>
          </div>

          {/* Programmes accordion-list */}
          <div className="border-t border-[var(--ink)]/15">
            {programs.map((p, i) => {
              const open = openProgram === i;
              return (
                <div
                  key={p.code}
                  className="border-b border-[var(--ink)]/15 group"
                >
                  <button
                    onClick={() => setOpenProgram(open ? null : i)}
                    className="w-full grid lg:grid-cols-12 gap-6 py-8 lg:py-10 text-left items-baseline transition hover:bg-[var(--ivory-deep)]/40 px-2 -mx-2 rounded-sm"
                  >
                    <div className="lg:col-span-1 num scribe-tag text-[var(--gold)]">
                      {p.code}
                    </div>
                    <div className="lg:col-span-7">
                      <h3 className="serif text-[28px] lg:text-[40px] font-medium text-[var(--ink)] leading-[1.05]">
                        {p.name}
                      </h3>
                    </div>
                    <div className="lg:col-span-3 flex flex-col gap-1">
                      <span className="scribe-tag text-[var(--ink)]/55">
                        {p.short}
                      </span>
                      <span className="text-[14px] text-[var(--ink)]/75 font-medium">
                        {p.duration}
                      </span>
                    </div>
                    <div className="lg:col-span-1 flex justify-end">
                      <span
                        className={`w-10 h-10 rounded-full border border-[var(--ink)]/30 flex items-center justify-center text-[var(--ink)] transition ${
                          open ? 'bg-[var(--ink)] text-[var(--ivory)] rotate-45' : ''
                        }`}
                      >
                        <FiPlus />
                      </span>
                    </div>
                  </button>

                  {/* Drawer */}
                  <div
                    className="grid transition-[grid-template-rows,opacity] duration-500 ease-out"
                    style={{
                      gridTemplateRows: open ? '1fr' : '0fr',
                      opacity: open ? 1 : 0,
                    }}
                  >
                    <div className="overflow-hidden">
                      <div className="grid lg:grid-cols-12 gap-6 pb-10 lg:pb-14">
                        <div className="lg:col-span-1" />
                        <div className="lg:col-span-7">
                          <p className="serif italic text-[20px] lg:text-[24px] text-[var(--ink)]/80 leading-snug max-w-2xl">
                            {p.blurb}
                          </p>
                        </div>
                        <div className="lg:col-span-4">
                          <p className="scribe-tag text-[var(--ink)]/55 mb-4">
                            Tracks & Focus Areas
                          </p>
                          <ul className="space-y-2.5">
                            {p.specializations.map((s) => (
                              <li
                                key={s}
                                className="flex items-center gap-3 text-[14px] text-[var(--ink)]/85"
                              >
                                <span className="w-1 h-1 rounded-full bg-[var(--gold)]" />
                                {s}
                              </li>
                            ))}
                          </ul>
                          <a
                            href="https://apply.geu.ac.in/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group inline-flex items-center gap-2 mt-7 text-[13px] font-semibold text-[var(--ink)]"
                          >
                            <span className="link-line">Apply to this programme</span>
                            <FiArrowUpRight className="arrow-icon" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────── Pillars ─────────────────────── */}
      <section id="pillars" className="relative bg-[var(--ivory-deep)] py-24 lg:py-36 overflow-hidden">
        <div className="grain" />
        <div className="relative max-w-[1380px] mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-12 gap-10 mb-16">
            <div className="lg:col-span-3">
              <span className="scribe-tag text-[var(--gold)]">§ II — The Difference</span>
              <div className="rule-gold mt-3 max-w-[80px]" />
            </div>
            <div className="lg:col-span-9">
              <h2 className="serif display-tight text-[clamp(40px,5vw,68px)] font-medium text-[var(--ink)] max-w-4xl">
                A school built on three things, in equal measure.
              </h2>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-[var(--ink)]/10 border border-[var(--ink)]/10">
            {pillars.map((p) => (
              <div
                key={p.n}
                className="group bg-[var(--ivory-deep)] p-10 lg:p-12 hover:bg-[var(--ivory)] transition-colors duration-500"
              >
                <div className="flex items-start justify-between mb-10">
                  <span className="serif italic text-[44px] font-light text-[var(--gold)] leading-none">
                    {p.n}
                  </span>
                  <span className="w-9 h-9 rounded-full border border-[var(--ink)]/20 flex items-center justify-center text-[var(--ink)]/40 group-hover:bg-[var(--ink)] group-hover:text-[var(--ivory)] group-hover:border-[var(--ink)] transition">
                    <FiArrowUpRight size={15} />
                  </span>
                </div>
                <h3 className="serif text-[24px] lg:text-[28px] font-medium text-[var(--ink)] leading-snug mb-6 max-w-xs">
                  {p.title}
                </h3>
                <p className="text-[15px] leading-relaxed text-[var(--ink)]/65">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────── About — split ─────────────────────── */}
      <section id="about" className="bg-[var(--ink-deep)] text-[var(--ivory)] py-24 lg:py-36 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(184,138,62,0.18),transparent_55%)]" />
        <div className="grain" />
        <div className="relative max-w-[1380px] mx-auto px-6 lg:px-12 grid lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          <div className="lg:col-span-7">
            <span className="scribe-tag text-[var(--gold-soft)]">§ III — About GESoM</span>
            <div className="rule-gold mt-3 max-w-[80px]" />
            <h2 className="serif display-tight text-[clamp(38px,5vw,68px)] font-medium mt-8 leading-[1.02]">
              Shaping future business leaders,
              <span className="italic font-light text-[var(--gold-soft)]" style={{ fontVariationSettings: '"SOFT" 100' }}>
                {' '}one cohort at a time.
              </span>
            </h2>
            <div className="mt-10 space-y-5 max-w-2xl text-[16px] lg:text-[17px] text-[var(--ivory)]/75 leading-relaxed">
              <p>
                The Graphic Era School of Management was founded in 2006 to
                build a different kind of business education in Northern India
                — analytically demanding, internationally minded, and
                anchored in the realities of Indian enterprise.
              </p>
              <p>
                Twenty years on, GESoM remains a school where research-led
                teaching meets a corporate network of nearly thirty active
                recruiters, and where two decades of alumni are now shaping
                organisations across banking, consulting, technology and
                entrepreneurship.
              </p>
            </div>

            <div className="mt-12 grid sm:grid-cols-3 gap-6">
              {[
                { k: 'Faculty', v: '25+ doctorates' },
                { k: 'Alumni', v: '4,000+ globally' },
                { k: 'Recognition', v: 'NAAC A+ · NBA' },
              ].map((x) => (
                <div key={x.k} className="border-t border-[var(--ivory)]/15 pt-4">
                  <p className="scribe-tag text-[var(--gold-soft)]">{x.k}</p>
                  <p className="serif text-[22px] font-medium mt-2">{x.v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right pull-quote slab */}
          <div className="lg:col-span-5">
            <div className="relative">
              <div className="absolute -inset-4 bg-[var(--gold)]/15 blur-3xl rounded-full" />
              <figure className="relative bg-[var(--ivory)] text-[var(--ink)] p-10 lg:p-12 rounded-sm border-l-2 border-[var(--gold)]">
                <span className="serif italic text-[80px] leading-none text-[var(--gold)] block -mb-6">
                  &ldquo;
                </span>
                <blockquote className="serif text-[24px] lg:text-[28px] leading-[1.25] font-medium text-[var(--ink)]">
                  We don&rsquo;t graduate students who chase opportunity.
                  We graduate the people who manufacture it.
                </blockquote>
                <figcaption className="mt-8 pt-6 border-t border-[var(--ink)]/15">
                  <p className="serif text-[16px] font-semibold text-[var(--ink)]">
                    Office of the Dean
                  </p>
                  <p className="scribe-tag text-[var(--ink)]/55 mt-1">
                    GESoM · Dehradun
                  </p>
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────── Placements ─────────────────────── */}
      <section id="placements" className="bg-[var(--ivory)] py-24 lg:py-36">
        <div className="max-w-[1380px] mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-12 gap-10 mb-16">
            <div className="lg:col-span-3">
              <span className="scribe-tag text-[var(--gold)]">§ IV — Placements</span>
              <div className="rule-gold mt-3 max-w-[80px]" />
            </div>
            <div className="lg:col-span-9 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
              <h2 className="serif display-tight text-[clamp(40px,5vw,68px)] font-medium text-[var(--ink)] max-w-3xl">
                Where the class of <span className="num">2025</span> went to work.
              </h2>
              <p className="scribe-tag text-[var(--ink)]/55 max-w-xs">
                A small selection — three offers among many, across consulting,
                finance and analytics.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-[var(--ink)]/12 border border-[var(--ink)]/12">
            {placements.map((p) => (
              <article
                key={p.name}
                className="bg-[var(--ivory)] p-10 hover:bg-[var(--ivory-deep)] transition-colors duration-300"
              >
                <div className="flex items-start justify-between mb-8">
                  <span className="scribe-tag text-[var(--ink)]/55">
                    Class of {p.year}
                  </span>
                  <FiArrowUpRight className="text-[var(--gold)]" />
                </div>
                <p className="serif text-[26px] font-medium text-[var(--ink)] leading-tight">
                  {p.name}
                </p>
                <p className="mt-1 text-[14px] text-[var(--ink)]/65">
                  {p.program}
                </p>
                <div className="mt-8 pt-6 border-t border-[var(--ink)]/15">
                  <p className="scribe-tag text-[var(--ink)]/55 mb-2">Offer</p>
                  <p className="serif num text-[42px] font-semibold text-[var(--ink)] leading-none">
                    {p.pkg}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-20 text-center">
            <p className="serif italic text-[20px] text-[var(--ink)]/65 max-w-2xl mx-auto leading-snug">
              &ldquo;The first job a GESoM graduate takes is the job they were
              prepared for. The next ten are the ones we couldn&rsquo;t
              foresee.&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────── Big CTA ─────────────────────── */}
      <section className="relative bg-[var(--ink-deep)] text-[var(--ivory)] py-28 lg:py-40 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(184,138,62,0.18),transparent_60%)]" />
        <div className="grain" />
        <div className="relative max-w-5xl mx-auto px-6 lg:px-12 text-center">
          <span className="scribe-tag text-[var(--gold-soft)]">
            Admissions 2026 — now open
          </span>
          <h2 className="serif display-tight text-[clamp(48px,7vw,108px)] font-medium mt-8 leading-[0.98]">
            Apply to the
            <br />
            <span className="italic font-light text-[var(--gold-soft)]" style={{ fontVariationSettings: '"SOFT" 100' }}>
              class of 2028
            </span>
            <span className="text-[var(--ivory)]">.</span>
          </h2>
          <p className="mt-8 max-w-xl mx-auto text-[16px] lg:text-[17px] text-[var(--ivory)]/70 leading-relaxed">
            Submit your application online. Our admissions office responds to
            every enquiry within five working days.
          </p>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-5">
            <a
              href="https://apply.geu.ac.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 px-9 py-4 bg-[var(--gold)] hover:bg-[var(--gold-soft)] text-[var(--ink-deep)] rounded-full text-[14px] font-semibold tracking-wide transition shadow-[0_20px_60px_-20px_rgba(184,138,62,0.6)]"
            >
              Begin your application
              <FiArrowUpRight className="arrow-icon" />
            </a>
            <a
              href="#contact"
              className="group inline-flex items-center gap-3 px-9 py-4 border border-[var(--ivory)]/30 hover:border-[var(--gold-soft)] hover:text-[var(--gold-soft)] rounded-full text-[14px] font-semibold tracking-wide transition"
            >
              <span className="link-line">Talk to admissions</span>
              <FiArrowRight className="arrow-icon" />
            </a>
          </div>
        </div>
      </section>

      {/* ─────────────────────── Contact ─────────────────────── */}
      <section id="contact" className="bg-[var(--ivory)] py-24 lg:py-32">
        <div className="max-w-[1380px] mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-12 gap-10 mb-14">
            <div className="lg:col-span-3">
              <span className="scribe-tag text-[var(--gold)]">§ V — Contact</span>
              <div className="rule-gold mt-3 max-w-[80px]" />
            </div>
            <div className="lg:col-span-9">
              <h2 className="serif display-tight text-[clamp(36px,4.5vw,56px)] font-medium text-[var(--ink)]">
                Speak with us.
              </h2>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-[var(--ink)]/12 border border-[var(--ink)]/12">
            {contacts.map((c) => {
              const { Icon } = c;
              return (
                <div
                  key={c.title}
                  className="bg-[var(--ivory)] p-10 hover:bg-[var(--ivory-deep)] transition-colors"
                >
                  <div className="flex items-center justify-between mb-8">
                    <span className="w-11 h-11 rounded-full bg-[var(--ink)] text-[var(--gold-soft)] flex items-center justify-center">
                      <Icon size={17} />
                    </span>
                    <span className="scribe-tag text-[var(--ink)]/40">
                      {c.title}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {c.lines.map((l) => (
                      <p key={l} className="serif text-[20px] font-medium text-[var(--ink)] leading-snug">
                        {l}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────── Announcements ─────────────────────── */}
      <div className="bg-[var(--ivory-deep)] border-t border-[var(--ink)]/10">
        <AnnouncementsSection />
      </div>

      {/* ─────────────────────── Footer ─────────────────────── */}
      <footer className="bg-[var(--ink-deep)] text-[var(--ivory)]/80 relative overflow-hidden">
        <div className="grain" />
        <div className="relative max-w-[1380px] mx-auto px-6 lg:px-12 pt-20 pb-12">
          <div className="grid lg:grid-cols-12 gap-12 mb-16">
            <div className="lg:col-span-5">
              <p className="serif text-[48px] lg:text-[64px] font-medium text-[var(--ivory)] leading-none">
                GES<span className="italic font-light text-[var(--gold-soft)]" style={{ fontVariationSettings: '"SOFT" 100' }}>o</span>M
              </p>
              <p className="scribe-tag mt-4 text-[var(--gold-soft)]">
                Graphic Era · School of Management
              </p>
              <p className="mt-8 max-w-md text-[15px] leading-relaxed text-[var(--ivory)]/65">
                A school of management in Dehradun, India — preparing analysts,
                managers, founders and scholars since 2006.
              </p>
            </div>

            <div className="lg:col-span-3">
              <p className="scribe-tag text-[var(--gold-soft)]/70 mb-5">Site</p>
              <ul className="space-y-3 text-[14px]">
                <li><a href="#programs" className="link-line">Programmes</a></li>
                <li><a href="#pillars" className="link-line">The Difference</a></li>
                <li><a href="#placements" className="link-line">Placements</a></li>
                <li><a href="#about" className="link-line">About GESoM</a></li>
                <li><a href="#contact" className="link-line">Contact</a></li>
              </ul>
            </div>

            <div className="lg:col-span-4">
              <p className="scribe-tag text-[var(--gold-soft)]/70 mb-5">Get in touch</p>
              <p className="serif text-[20px] text-[var(--ivory)] mb-1">
                admissions@geu.ac.in
              </p>
              <p className="serif num text-[20px] text-[var(--ivory)]">
                1800 890 6027
              </p>
              <div className="flex gap-2.5 mt-7">
                {[
                  { Icon: FiLinkedin, href: 'https://www.linkedin.com/school/graphic-era-official' },
                  { Icon: FiFacebook, href: 'https://www.facebook.com/geuofficial/' },
                  { Icon: FiInstagram, href: 'https://www.facebook.com/geuofficial/' },
                  { Icon: FiYoutube, href: 'https://www.facebook.com/geuofficial/' },
                  { Icon: FiTwitter, href: 'https://www.facebook.com/geuofficial/' },
                ].map(({ Icon, href }, i) => (
                  <a
                    key={i}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full border border-[var(--ivory)]/20 hover:bg-[var(--gold)] hover:border-[var(--gold)] hover:text-[var(--ink-deep)] flex items-center justify-center transition"
                  >
                    <Icon size={14} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="rule" />
          <div className="pt-7 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-[12px] text-[var(--ivory)]/45">
            <p>© 2026 Graphic Era School of Management. All rights reserved.</p>
            <p className="scribe-tag">GESoM Portal · v2026.1</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
