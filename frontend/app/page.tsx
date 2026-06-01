'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  FiArrowUpRight,
  FiArrowRight,
  FiPlus,
  FiMapPin,
  FiPhone,
  FiMail,
  FiLinkedin,
  FiFacebook,
  FiInstagram,
  FiYoutube,
  FiMenu,
  FiX,
} from 'react-icons/fi';
import AnnouncementsSection from './components/Announcements/AnnouncementsSection';

/* ──────────────────────────────────────────────────────────────
   GESoM Landing — Minimal, formal, iOS-style. Content from API.
   Display: Cormorant Garamond · Body: Inter
   ────────────────────────────────────────────────────────────── */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const ASSETS = {
  logo: 'https://geu.ac.in/frontend/assets/images/geu-logo.webp',
  banner:
    'https://geu.ac.in/uploads/pages/DntHgRFyE9nzmmFPhm05JFH3ZgWhKlZ6b7pzM94E.webp',
  video:
    'https://geu.ac.in/uploads/page_section_attributes/VDd0PpwcgWvddNdkOK823B05H1KhyNeAHiNIAJXO.mp4',
};

/* ─── Fallback content (mirrors backend defaults) ─────────────── */
const FALLBACK: LandingPayload = {
  hero: {
    eyebrow: 'Graphic Era School of Management',
    title1: 'Shaping Future',
    title2: 'Business Leaders.',
    paragraph:
      'Two decades of academic excellence in management education at Graphic Era University, Dehradun — postgraduate and doctoral programmes designed for the next generation of managers, analysts and founders.',
    primaryCta: { label: 'Begin application', href: 'https://apply.geu.ac.in/' },
    secondaryCta: { label: 'View programmes', href: '#programmes' },
    stats: [
      { fig: '20+',      cap: 'Years of excellence' },
      { fig: '5',        cap: 'Programmes' },
      { fig: '14',       cap: 'MBA specialisations' },
      { fig: '₹15.40 L', cap: 'Highest package · 2025' },
    ],
  },
  about: {
    eyebrow: 'About GESoM',
    heading:
      'A hub for nurturing top-tier leadership in the corporate world — recognised among the best management schools in India.',
    cards: [
      { k: '01', h: 'Two decades of teaching', p: 'A management department founded in 2006, with twenty years of academic record across MBA, MBA IMPACT, AI & Data Science and the doctoral programme.' },
      { k: '02', h: 'Industry partnerships', p: 'Programmes built with corporate partners — including the M.B.A in Business Analytics delivered with Grant Thornton as Industry Partner.' },
      { k: '03', h: 'A campus that supports the work', p: 'Lecture theatres, computer and analytics labs, syndicate rooms, board rooms and one of the largest libraries in the region.' },
    ],
  },
  programmes: {
    eyebrow: 'I — Programmes',
    heading: 'Five programmes for the modern manager.',
    sub: 'Postgraduate and doctoral degrees across general management, analytics, artificial intelligence and applied business analytics. Open any programme for tracks & specialisations.',
    items: [],
  },
  placements: {
    eyebrow: 'II — Placements',
    heading: 'Class of 2025 — featured offers.',
    sub: 'A selection of placements from the 2025 graduating cohort.',
    featuredImage:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80',
    featuredLabel: '100% Placement Record',
    items: [],
  },
  campus: {
    eyebrow: 'III — Campus',
    heading: 'Thirteen rooms, two blocks, one campus.',
    sub: 'Lecture theatres, syndicate rooms, computer and analytics labs, a board room, a tutorial wing and the central library — the working environments of the Department of Management.',
    items: [],
  },
  cta: {
    eyebrow: 'Admissions 2026 — now open',
    title1: 'Apply to the',
    title2: 'Class of 2028.',
    paragraph: 'Submit your application online. Admissions enquiries are answered within five working days.',
  },
  contact: {
    eyebrow: 'IV — Contact',
    heading: 'Reach the admissions office.',
    address: '566/6, Bell Road, Society Area, Clement Town, Dehradun, Uttarakhand — 248002',
    phones: ['1800 270 1280', '1800 890 6027'],
    emails: ['admissions@geu.ac.in', 'enquiry@geu.ac.in'],
  },
};

/* ─── Types ──────────────────────────────────────────────────── */
type Cta = { label: string; href: string };
type Stat = { fig: string; cap: string };
type AboutCard = { k: string; h: string; p: string };
type Programme = {
  code: string;
  name: string;
  duration: string;
  note: string;
  specs?: string[];
};
type Placement = {
  name: string;
  program: string;
  pkg: string;
  year: string;
  photo?: string;
};
type Facility = { name: string; img: string };

export type LandingPayload = {
  hero: {
    eyebrow: string;
    title1: string;
    title2: string;
    paragraph: string;
    primaryCta: Cta;
    secondaryCta: Cta;
    stats: Stat[];
  };
  about: { eyebrow: string; heading: string; cards: AboutCard[] };
  programmes: {
    eyebrow: string;
    heading: string;
    sub: string;
    items: Programme[];
  };
  placements: {
    eyebrow: string;
    heading: string;
    sub: string;
    featuredImage: string;
    featuredLabel: string;
    items: Placement[];
  };
  campus: { eyebrow: string; heading: string; sub: string; items: Facility[] };
  cta: { eyebrow: string; title1: string; title2: string; paragraph: string };
  contact: {
    eyebrow: string;
    heading: string;
    address: string;
    phones: string[];
    emails: string[];
  };
};

/* Deep merge: overlay wins on primitives + arrays; objects merge recursively.
   Keeps every nested default from FALLBACK if the saved payload is partial. */
function mergeDeep<T>(base: T, overlay: unknown): T {
  if (overlay === undefined || overlay === null) return base;
  if (Array.isArray(overlay)) return overlay as unknown as T;
  if (
    typeof overlay === 'object' &&
    overlay !== null &&
    typeof base === 'object' &&
    base !== null &&
    !Array.isArray(base)
  ) {
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const key of Object.keys(overlay as Record<string, unknown>)) {
      out[key] = mergeDeep(
        (base as Record<string, unknown>)[key],
        (overlay as Record<string, unknown>)[key],
      );
    }
    return out as T;
  }
  return overlay as T;
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [openProgram, setOpenProgram] = useState<number | null>(0);
  const [scrollY, setScrollY] = useState(0);
  const [content, setContent] = useState<LandingPayload>(FALLBACK);
  const [hoverPlacementIdx, setHoverPlacementIdx] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  /* Live content fetch ─ falls back silently if API is unreachable. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Cache-busting timestamp so neither browser nor CDN can serve
        // a stale copy after admin edits.
        const r = await fetch(`${API_BASE}/landing?_=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (!r.ok) return;
        const data = await r.json();
        if (cancelled || !data?.payload) return;
        // Backend should send a JSON object, but some MySQL builds return
        // the JSON column as a string. Handle either shape.
        let raw: unknown = data.payload;
        if (typeof raw === 'string') {
          try { raw = JSON.parse(raw); } catch { raw = null; }
        }
        if (typeof raw === 'string') {
          // double-stringified — try one more parse
          try { raw = JSON.parse(raw); } catch { raw = null; }
        }
        if (!raw || typeof raw !== 'object') return;
        // DEEP merge — preserves every nested key from FALLBACK if the
        // saved payload is partial. A shallow spread previously made
        // missing keys (e.g. placements.items) crash the render.
        setContent(mergeDeep(FALLBACK, raw) as LandingPayload);
      } catch {
        /* keep FALLBACK */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  /* iOS-style parallax — single rAF-throttled scroll listener */
  useEffect(() => {
    let raf = 0;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf = requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  /* IntersectionObserver — reveal-on-enter */
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('[data-reveal]');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [content]);

  // Per-section guards: if a stored section is null/missing, fall back to
  // the full default for that section. Then guard every array with `|| []`
  // so the page renders even if the admin saved a partial blob.
  const hero          = { ...FALLBACK.hero,       ...(content.hero       || {}) };
  const about         = { ...FALLBACK.about,      ...(content.about      || {}) };
  const programmesSec = { ...FALLBACK.programmes, ...(content.programmes || {}) };
  const placementsSec = { ...FALLBACK.placements, ...(content.placements || {}) };
  const campus        = { ...FALLBACK.campus,     ...(content.campus     || {}) };
  const cta           = { ...FALLBACK.cta,        ...(content.cta        || {}) };
  const contact       = { ...FALLBACK.contact,    ...(content.contact    || {}) };

  hero.stats          = Array.isArray(hero.stats)          ? hero.stats          : [];
  about.cards         = Array.isArray(about.cards)         ? about.cards         : [];
  programmesSec.items = Array.isArray(programmesSec.items) ? programmesSec.items : [];
  placementsSec.items = Array.isArray(placementsSec.items) ? placementsSec.items : [];
  campus.items        = Array.isArray(campus.items)        ? campus.items        : [];
  contact.phones      = Array.isArray(contact.phones)      ? contact.phones      : [];
  contact.emails      = Array.isArray(contact.emails)      ? contact.emails      : [];

  // Featured testimonial image — swaps on hover. Bounds-checked so an
  // out-of-range hover index never throws.
  const hovered =
    hoverPlacementIdx !== null ? placementsSec.items[hoverPlacementIdx] : null;
  const featuredImg = hovered?.photo || placementsSec.featuredImage;

  return (
    <div className="gesom-root">
      <style jsx global>{`
        .gesom-root {
          --ink: #0e1014;
          --ink-soft: #2a2d35;
          --muted: #6b7180;
          --line: rgba(14, 16, 20, 0.10);
          --bone: #fafaf7;
          --bone-deep: #f1efe9;
          --paper: #ffffff;
          --gold: #a07a3b;
          --gold-soft: #c4a168;

          background: var(--bone);
          color: var(--ink);
          font-family: var(--font-inter), 'Inter', system-ui, -apple-system,
            'Helvetica Neue', sans-serif;
          font-feature-settings: 'cv11', 'ss01';
          letter-spacing: -0.005em;
          -webkit-font-smoothing: antialiased;
        }
        .gesom-root .serif {
          font-family: var(--font-cormorant), 'Cormorant Garamond', 'EB Garamond',
            Georgia, 'Times New Roman', serif;
          font-feature-settings: 'liga', 'dlig';
          letter-spacing: -0.01em;
        }
        .gesom-root .micro {
          font-family: var(--font-inter), 'Inter', system-ui, sans-serif;
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          font-weight: 500;
        }
        .gesom-root .num { font-variant-numeric: tabular-nums lining-nums; }
        .gesom-root .rule { height: 1px; background: var(--line); }
        .gesom-root .reveal {
          opacity: 0;
          transform: translateY(18px);
          transition: opacity 0.9s cubic-bezier(0.2, 0.7, 0.2, 1),
            transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);
        }
        .gesom-root .is-in { opacity: 1; transform: none; }
        .gesom-root .reveal-delay-1 { transition-delay: 0.08s; }
        .gesom-root .reveal-delay-2 { transition-delay: 0.16s; }
        .gesom-root .reveal-delay-3 { transition-delay: 0.24s; }
        .gesom-root .reveal-delay-4 { transition-delay: 0.32s; }
        .gesom-root .reveal-delay-5 { transition-delay: 0.40s; }

        .gesom-root .link {
          background-image: linear-gradient(currentColor, currentColor);
          background-size: 100% 1px;
          background-repeat: no-repeat;
          background-position: 0 100%;
          transition: background-size 0.5s cubic-bezier(0.2, 0.7, 0.2, 1);
          padding-bottom: 1px;
        }
        .gesom-root .link:hover {
          background-size: 0% 1px;
          background-position: 100% 100%;
        }

        .gesom-root .glass {
          background: rgba(250, 250, 247, 0.78);
          backdrop-filter: saturate(180%) blur(20px);
          -webkit-backdrop-filter: saturate(180%) blur(20px);
        }
        .gesom-root .glass-dark {
          background: rgba(14, 16, 20, 0.55);
          backdrop-filter: saturate(160%) blur(20px);
          -webkit-backdrop-filter: saturate(160%) blur(20px);
        }

        .gesom-root .card {
          background: var(--paper);
          border-radius: 20px;
          box-shadow:
            0 1px 0 rgba(14, 16, 20, 0.04),
            0 16px 40px -28px rgba(14, 16, 20, 0.18);
          transition: transform 0.5s cubic-bezier(0.2, 0.7, 0.2, 1),
            box-shadow 0.5s cubic-bezier(0.2, 0.7, 0.2, 1);
        }
        .gesom-root .card:hover {
          transform: translateY(-2px);
          box-shadow:
            0 1px 0 rgba(14, 16, 20, 0.05),
            0 30px 60px -30px rgba(14, 16, 20, 0.25);
        }

        .gesom-root .display-xl { font-size: clamp(40px, 8vw, 104px); line-height: 1.02; font-weight: 500; }
        .gesom-root .display-lg { font-size: clamp(30px, 5vw, 64px);  line-height: 1.08; font-weight: 500; }
        .gesom-root .display-md { font-size: clamp(22px, 3.4vw, 44px); line-height: 1.14; font-weight: 500; }
        .gesom-root .display-sm { font-size: clamp(20px, 2.4vw, 30px); line-height: 1.20; font-weight: 500; }

        .gesom-root .nav-link {
          color: var(--ink);
          font-weight: 450;
          font-size: 13.5px;
          letter-spacing: -0.005em;
        }
        .gesom-root .nav-link:hover { color: var(--gold); }

        .gesom-root a:focus-visible,
        .gesom-root button:focus-visible {
          outline: 2px solid var(--gold-soft);
          outline-offset: 3px;
          border-radius: 8px;
        }

        .gesom-root .chip {
          display: inline-flex;
          align-items: center;
          padding: 7px 14px;
          border-radius: 999px;
          background: var(--bone);
          color: var(--ink-soft);
          font-size: 12.5px;
          font-weight: 500;
          letter-spacing: -0.005em;
          border: 1px solid var(--line);
          transition: background 0.3s ease, color 0.3s ease;
        }
        .gesom-root .chip:hover { background: var(--ink); color: var(--bone); }

        /* Mobile drawer */
        .gesom-root .drawer {
          position: fixed;
          top: 0; right: 0; bottom: 0;
          width: 88%;
          max-width: 360px;
          background: var(--paper);
          z-index: 60;
          transform: translateX(100%);
          transition: transform 0.45s cubic-bezier(0.2, 0.7, 0.2, 1);
          box-shadow: -30px 0 60px -30px rgba(0,0,0,0.25);
        }
        .gesom-root .drawer.open { transform: translateX(0); }
        .gesom-root .drawer-scrim {
          position: fixed; inset: 0; background: rgba(14, 16, 20, 0.45);
          z-index: 55; opacity: 0; pointer-events: none;
          transition: opacity 0.4s ease;
        }
        .gesom-root .drawer-scrim.open { opacity: 1; pointer-events: auto; }

        /* Mobile compact tweaks */
        @media (max-width: 640px) {
          .gesom-root section { padding-left: 0 !important; padding-right: 0 !important; }
          .gesom-root .pad-mobile { padding-left: 20px !important; padding-right: 20px !important; }
        }
      `}</style>

      {/* ───────────────────── Nav ───────────────────── */}
      <header className="sticky top-0 z-50 glass border-b border-[var(--line)]">
        <div className="max-w-[1320px] mx-auto px-5 sm:px-6 lg:px-10 h-[64px] sm:h-[68px] flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ASSETS.logo}
              alt="GEU"
              className="h-8 sm:h-9 w-auto object-contain shrink-0"
              loading="eager"
            />
            <span className="hidden xs:flex sm:flex flex-col leading-none min-w-0">
              <span className="serif text-[15px] sm:text-[18px] font-medium text-[var(--ink)] truncate">
                School of Management
              </span>
              <span className="micro text-[var(--muted)] mt-1 hidden sm:block">
                Graphic Era · Dehradun
              </span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-9">
            <a href="#programmes" className="nav-link link">Programmes</a>
            <a href="#placements" className="nav-link link">Placements</a>
            <a href="#campus"     className="nav-link link">Campus</a>
            <a href="#contact"    className="nav-link link">Contact</a>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Link
              href="/auth/login"
              className="inline-flex items-center text-[12.5px] sm:text-[13.5px] font-medium text-[var(--ink-soft)] hover:text-[var(--ink)] px-2.5 sm:px-3 py-2 rounded-full"
            >
              Sign in
            </Link>
            <a
              href={hero.primaryCta.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-[var(--ink)] text-[var(--bone)] text-[12.5px] sm:text-[13px] font-medium rounded-full hover:bg-black transition"
            >
              Apply
              <FiArrowUpRight size={13} />
            </a>
            {/* Mobile menu trigger — only on small screens for nav links */}
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="lg:hidden w-9 h-9 -mr-1 rounded-full flex items-center justify-center text-[var(--ink)]"
            >
              <FiMenu size={19} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={`drawer-scrim ${mobileOpen ? 'open' : ''}`}
        onClick={() => setMobileOpen(false)}
      />
      <aside className={`drawer ${mobileOpen ? 'open' : ''}`}>
        <div className="p-6 flex items-center justify-between border-b border-[var(--line)]">
          <span className="serif text-[20px] font-medium text-[var(--ink)]">
            Menu
          </span>
          <button
            onClick={() => setMobileOpen(false)}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[var(--bone)] text-[var(--ink)]"
            aria-label="Close menu"
          >
            <FiX size={20} />
          </button>
        </div>
        <nav className="p-6 flex flex-col gap-5">
          {[
            { l: 'Programmes', h: '#programmes' },
            { l: 'Placements', h: '#placements' },
            { l: 'Campus',     h: '#campus' },
            { l: 'Contact',    h: '#contact' },
          ].map((i) => (
            <a
              key={i.h}
              href={i.h}
              onClick={() => setMobileOpen(false)}
              className="serif text-[24px] text-[var(--ink)] font-medium link"
            >
              {i.l}
            </a>
          ))}
          <div className="rule my-4" />
          <Link
            href="/auth/login"
            onClick={() => setMobileOpen(false)}
            className="serif text-[20px] text-[var(--ink-soft)] link"
          >
            Sign in
          </Link>
          <a
            href={hero.primaryCta.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 px-5 py-3 bg-[var(--ink)] text-[var(--bone)] text-[14px] font-medium rounded-full justify-center"
          >
            {hero.primaryCta.label}
            <FiArrowUpRight size={14} />
          </a>
        </nav>
      </aside>

      {/* ───────────────────── Hero ───────────────────── */}
      <section className="relative bg-[#06090f] text-white overflow-hidden">
        <div
          className="absolute inset-0 will-change-transform"
          style={{ transform: `translate3d(0, ${scrollY * 0.35}px, 0) scale(${1 + scrollY * 0.00025})` }}
        >
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-[120%] object-cover opacity-65"
            autoPlay
            muted
            loop
            playsInline
            poster={ASSETS.banner}
          >
            <source src={ASSETS.video} type="video/mp4" />
            <source src="/video.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-[#06090f]/60 via-[#06090f]/35 to-[#06090f]/90" />
        </div>

        <div className="relative max-w-[1320px] mx-auto pad-mobile px-6 lg:px-10 min-h-[88vh] sm:min-h-[92vh] flex flex-col justify-between pt-28 sm:pt-32 pb-12 sm:pb-14">
          <div data-reveal className="reveal max-w-3xl">
            <p className="micro text-[var(--gold-soft)] mb-6 sm:mb-7 flex items-center gap-3">
              <span className="w-8 h-px bg-[var(--gold-soft)]/70" />
              {hero.eyebrow}
            </p>
            <h1 className="serif display-xl text-white">
              {hero.title1}
              <br />
              <span className="text-[var(--gold-soft)]">{hero.title2}</span>
            </h1>
            <p className="mt-6 sm:mt-8 max-w-xl text-[15px] sm:text-[16px] leading-[1.7] text-white/75 font-light">
              {hero.paragraph}
            </p>
            <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-3 sm:gap-4">
              <a
                href={hero.primaryCta.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-6 sm:px-7 py-3 sm:py-3.5 bg-white text-[var(--ink)] rounded-full text-[13.5px] sm:text-[14px] font-medium hover:bg-[var(--bone)] transition"
              >
                {hero.primaryCta.label}
                <FiArrowUpRight size={15} />
              </a>
              <a
                href={hero.secondaryCta.href}
                className="inline-flex items-center gap-2.5 px-6 sm:px-7 py-3 sm:py-3.5 border border-white/25 text-white rounded-full text-[13.5px] sm:text-[14px] font-medium hover:bg-white/5 transition"
              >
                {hero.secondaryCta.label}
                <FiArrowRight size={15} />
              </a>
            </div>
          </div>

          <div
            data-reveal
            className="reveal reveal-delay-3 grid grid-cols-2 sm:grid-cols-4 gap-x-6 sm:gap-x-8 gap-y-6 max-w-3xl pt-8 sm:pt-10 mt-8 sm:mt-10 border-t border-white/15"
          >
            {hero.stats.map((s) => (
              <div key={s.cap}>
                <p className="serif num display-sm text-white">{s.fig}</p>
                <p className="mt-2 micro text-white/55">{s.cap}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────── About ───────────────────── */}
      <section className="bg-[var(--bone)] py-20 sm:py-28 lg:py-40">
        <div className="max-w-[1100px] mx-auto pad-mobile px-6 lg:px-10">
          <div data-reveal className="reveal">
            <p className="micro text-[var(--gold)] mb-6 sm:mb-8">{about.eyebrow}</p>
            <p className="serif display-lg text-[var(--ink)] max-w-4xl">
              {about.heading}
            </p>
          </div>

          <div className="mt-12 sm:mt-16 lg:mt-20 grid md:grid-cols-3 gap-10 lg:gap-16">
            {about.cards.map((b, i) => (
              <div
                key={`${b.k}-${i}`}
                data-reveal
                className={`reveal reveal-delay-${i + 1}`}
              >
                <p className="serif num text-[var(--gold)] text-[26px] sm:text-[28px]">{b.k}</p>
                <div className="mt-3 mb-5 h-px w-10 bg-[var(--gold)]/60" />
                <h3 className="serif display-sm text-[var(--ink)]">{b.h}</h3>
                <p className="mt-4 text-[15px] leading-[1.7] text-[var(--muted)]">
                  {b.p}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────── Programmes ───────────────────── */}
      <section id="programmes" className="bg-[var(--paper)] py-20 sm:py-28 lg:py-40">
        <div className="max-w-[1320px] mx-auto pad-mobile px-6 lg:px-10">
          <div className="grid lg:grid-cols-12 gap-8 sm:gap-10 mb-14 sm:mb-20 lg:mb-24">
            <div data-reveal className="reveal lg:col-span-4">
              <p className="micro text-[var(--gold)]">{programmesSec.eyebrow}</p>
              <div className="mt-4 h-px w-12 bg-[var(--gold)]/60" />
            </div>
            <div data-reveal className="reveal reveal-delay-1 lg:col-span-8">
              <h2 className="serif display-lg text-[var(--ink)]">
                {programmesSec.heading}
              </h2>
              <p className="mt-5 sm:mt-6 max-w-2xl text-[15px] sm:text-[16px] leading-[1.7] text-[var(--muted)]">
                {programmesSec.sub}
              </p>
            </div>
          </div>

          <div className="border-t border-[var(--line)]">
            {programmesSec.items.map((p, i) => {
              const open = openProgram === i;
              return (
                <div
                  key={`${p.code}-${i}`}
                  data-reveal
                  className={`reveal reveal-delay-${Math.min(i, 4)} border-b border-[var(--line)]`}
                >
                  <button
                    onClick={() => setOpenProgram(open ? null : i)}
                    className="w-full grid lg:grid-cols-12 gap-4 lg:gap-6 py-6 sm:py-8 lg:py-10 text-left items-baseline group transition px-1 -mx-1 rounded-2xl hover:bg-[var(--bone)]"
                  >
                    <div className="lg:col-span-1 num micro text-[var(--gold)]">
                      {p.code}
                    </div>
                    <div className="lg:col-span-7">
                      <h3 className="serif display-md text-[var(--ink)]">
                        {p.name}
                      </h3>
                    </div>
                    <div className="lg:col-span-3 flex lg:flex-col gap-2 lg:gap-0 items-baseline lg:items-stretch">
                      <span className="micro text-[var(--muted)]">Duration</span>
                      <span className="lg:mt-1 text-[13.5px] sm:text-[14px] text-[var(--ink-soft)] font-medium">
                        {p.duration}
                      </span>
                    </div>
                    <div className="lg:col-span-1 flex lg:justify-end">
                      <span
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[var(--line)] flex items-center justify-center transition-transform duration-500 ${
                          open
                            ? 'bg-[var(--ink)] text-white rotate-45 border-[var(--ink)]'
                            : 'text-[var(--ink-soft)]'
                        }`}
                      >
                        <FiPlus size={16} />
                      </span>
                    </div>
                  </button>
                  <div
                    className="grid transition-[grid-template-rows] duration-700 ease-out"
                    style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
                  >
                    <div className="overflow-hidden">
                      <div className="grid lg:grid-cols-12 gap-6 pb-8 sm:pb-10 lg:pb-12">
                        <div className="lg:col-span-1" />
                        <div className="lg:col-span-7">
                          <p className="serif italic text-[18px] sm:text-[20px] lg:text-[22px] leading-[1.45] text-[var(--ink-soft)] max-w-2xl font-light">
                            {p.note}
                          </p>

                          {p.specs && p.specs.length > 0 && (
                            <div className="mt-7 sm:mt-8">
                              <p className="micro text-[var(--muted)] mb-4">
                                Specialisations
                              </p>
                              <div className="flex flex-wrap gap-2 sm:gap-2.5">
                                {p.specs.map((s) => (
                                  <span key={s} className="chip">{s}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="lg:col-span-4">
                          <a
                            href={hero.primaryCta.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-[13px] sm:text-[13.5px] font-medium text-[var(--ink)]"
                          >
                            <span className="link">Apply to this programme</span>
                            <FiArrowUpRight size={14} />
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

      {/* ───────────────────── Placements ───────────────────── */}
      <section
        id="placements"
        className="relative bg-[var(--bone)] py-20 sm:py-28 lg:py-40 overflow-hidden"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[60%] opacity-[0.04]"
          style={{
            transform: `translate3d(0, ${(scrollY - 2400) * 0.08}px, 0)`,
            backgroundImage:
              'radial-gradient(circle at 20% 50%, #a07a3b 0, transparent 40%), radial-gradient(circle at 80% 30%, #0e1014 0, transparent 45%)',
          }}
        />
        <div className="relative max-w-[1320px] mx-auto pad-mobile px-6 lg:px-10">
          <div className="grid lg:grid-cols-12 gap-8 sm:gap-10 mb-12 sm:mb-16">
            <div data-reveal className="reveal lg:col-span-4">
              <p className="micro text-[var(--gold)]">{placementsSec.eyebrow}</p>
              <div className="mt-4 h-px w-12 bg-[var(--gold)]/60" />
            </div>
            <div data-reveal className="reveal reveal-delay-1 lg:col-span-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 lg:gap-8">
              <h2 className="serif display-lg text-[var(--ink)] max-w-3xl">
                {placementsSec.heading}
              </h2>
              <p className="micro text-[var(--muted)] max-w-xs">
                {placementsSec.sub}
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-5 lg:gap-6">
            {/* Featured testimonial image — swaps on student hover */}
            <div
              data-reveal
              className="reveal lg:col-span-5 relative rounded-[20px] sm:rounded-[24px] overflow-hidden aspect-[4/5] lg:aspect-auto bg-[var(--bone-deep)]"
            >
              <div
                className="absolute inset-0 will-change-transform transition-opacity duration-500"
                style={{
                  transform: `translate3d(0, ${(scrollY - 2800) * -0.04}px, 0) scale(1.05)`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={featuredImg}
                  src={featuredImg}
                  alt="GESoM placement"
                  className="w-full h-full object-cover transition-opacity duration-500 animate-[fadeIn_0.5s_ease]"
                  style={{ animation: 'fadeIn 0.5s ease' }}
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 glass-dark text-white">
                <p className="micro text-white/70">
                  {hovered?.program || 'Class of 2025'}
                </p>
                <p className="serif text-[19px] sm:text-[22px] font-medium mt-1">
                  {hovered?.name || placementsSec.featuredLabel}
                </p>
              </div>
            </div>

            {/* Offer cards — hover to swap featured image */}
            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4 sm:gap-5">
              {placementsSec.items.map((p, i) => (
                <article
                  key={`${p.name}-${i}`}
                  data-reveal
                  onMouseEnter={() => setHoverPlacementIdx(i)}
                  onMouseLeave={() => setHoverPlacementIdx(null)}
                  className={`reveal reveal-delay-${(i % 5) + 1} card p-6 sm:p-7 cursor-default`}
                >
                  <p className="micro text-[var(--muted)]">{p.year}</p>
                  <p className="serif text-[20px] sm:text-[22px] font-medium text-[var(--ink)] leading-tight mt-3">
                    {p.name}
                  </p>
                  <p className="mt-1 text-[12.5px] sm:text-[13px] text-[var(--muted)]">
                    {p.program}
                  </p>
                  <div className="mt-6 sm:mt-7 pt-4 sm:pt-5 border-t border-[var(--line)]">
                    <p className="micro text-[var(--muted)] mb-2">Offer</p>
                    <p className="serif num text-[26px] sm:text-[28px] font-semibold text-[var(--ink)] leading-none">
                      {p.pkg}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────── Campus ───────────────────── */}
      <section id="campus" className="bg-[var(--paper)] py-20 sm:py-28 lg:py-40">
        <div className="max-w-[1320px] mx-auto pad-mobile px-6 lg:px-10">
          <div className="grid lg:grid-cols-12 gap-8 sm:gap-10 mb-12 sm:mb-16">
            <div data-reveal className="reveal lg:col-span-4">
              <p className="micro text-[var(--gold)]">{campus.eyebrow}</p>
              <div className="mt-4 h-px w-12 bg-[var(--gold)]/60" />
            </div>
            <div data-reveal className="reveal reveal-delay-1 lg:col-span-8">
              <h2 className="serif display-lg text-[var(--ink)] max-w-3xl">
                {campus.heading}
              </h2>
              <p className="mt-5 sm:mt-6 max-w-2xl text-[15px] sm:text-[16px] leading-[1.7] text-[var(--muted)]">
                {campus.sub}
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
            {campus.items.length > 0 && (
              <FacilityCard
                f={campus.items[0]}
                scrollY={scrollY}
                parallaxBase={3800}
                className="lg:col-span-7 aspect-[16/10]"
              />
            )}
            {campus.items.length > 1 && (
              <FacilityCard
                f={campus.items[1]}
                scrollY={scrollY}
                parallaxBase={3800}
                className="lg:col-span-5 aspect-[16/10] lg:aspect-auto"
              />
            )}
            {campus.items.slice(2).map((f, i) => (
              <FacilityCard
                key={`${f.name}-${i}`}
                f={f}
                scrollY={scrollY}
                parallaxBase={4400 + i * 200}
                className="md:col-span-6 lg:col-span-4 aspect-[4/3]"
              />
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────── CTA ───────────────────── */}
      <section className="relative bg-[var(--ink)] text-white py-20 sm:py-28 lg:py-36 overflow-hidden">
        <div
          className="absolute inset-0 opacity-30 will-change-transform"
          style={{
            transform: `translate3d(0, ${(scrollY - 5800) * -0.12}px, 0)`,
            background:
              'radial-gradient(ellipse at center, rgba(196, 161, 104, 0.35), transparent 55%)',
          }}
        />
        <div className="relative max-w-[920px] mx-auto pad-mobile px-6 text-center">
          <p data-reveal className="reveal micro text-[var(--gold-soft)] mb-7 sm:mb-8">
            {cta.eyebrow}
          </p>
          <h2
            data-reveal
            className="reveal reveal-delay-1 serif display-xl text-white"
          >
            {cta.title1}
            <br />
            <span className="italic font-light text-[var(--gold-soft)]">
              {cta.title2}
            </span>
          </h2>
          <p
            data-reveal
            className="reveal reveal-delay-2 mt-7 sm:mt-8 max-w-md mx-auto text-[14.5px] sm:text-[15px] leading-[1.7] text-white/65"
          >
            {cta.paragraph}
          </p>
          <div
            data-reveal
            className="reveal reveal-delay-3 mt-10 sm:mt-12 flex items-center justify-center gap-3 sm:gap-4 flex-wrap"
          >
            <a
              href={hero.primaryCta.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-7 sm:px-8 py-3.5 sm:py-4 bg-white text-[var(--ink)] rounded-full text-[13.5px] sm:text-[14px] font-medium hover:bg-[var(--bone)] transition"
            >
              {hero.primaryCta.label}
              <FiArrowUpRight size={15} />
            </a>
            <a
              href="#contact"
              className="inline-flex items-center gap-2.5 px-7 sm:px-8 py-3.5 sm:py-4 border border-white/25 text-white rounded-full text-[13.5px] sm:text-[14px] font-medium hover:bg-white/5 transition"
            >
              Talk to admissions
            </a>
          </div>
        </div>
      </section>

      {/* ───────────────────── Contact ───────────────────── */}
      <section id="contact" className="bg-[var(--bone)] py-20 sm:py-28 lg:py-36">
        <div className="max-w-[1320px] mx-auto pad-mobile px-6 lg:px-10">
          <div className="grid lg:grid-cols-12 gap-8 sm:gap-10 mb-12 sm:mb-16">
            <div data-reveal className="reveal lg:col-span-4">
              <p className="micro text-[var(--gold)]">{contact.eyebrow}</p>
              <div className="mt-4 h-px w-12 bg-[var(--gold)]/60" />
            </div>
            <div data-reveal className="reveal reveal-delay-1 lg:col-span-8">
              <h2 className="serif display-lg text-[var(--ink)]">{contact.heading}</h2>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
            {[
              { Icon: FiMapPin, title: 'Address',  lines: [contact.address] },
              { Icon: FiPhone,  title: 'Helpline', lines: contact.phones },
              { Icon: FiMail,   title: 'Email',    lines: contact.emails },
            ].map((c, i) => {
              const { Icon } = c;
              return (
                <div
                  key={c.title}
                  data-reveal
                  className={`reveal reveal-delay-${i + 1} card p-7 sm:p-8`}
                >
                  <div className="flex items-center justify-between mb-6 sm:mb-7">
                    <span className="w-10 h-10 rounded-full bg-[var(--bone-deep)] text-[var(--ink)] flex items-center justify-center">
                      <Icon size={16} />
                    </span>
                    <span className="micro text-[var(--muted)]">{c.title}</span>
                  </div>
                  <div className="space-y-1.5">
                    {c.lines.map((l) => (
                      <p
                        key={l}
                        className="serif text-[17px] sm:text-[18px] leading-[1.4] text-[var(--ink)] font-medium break-words"
                      >
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

      {/* ───────────────────── Announcements (live data) ───────────────────── */}
      <div className="bg-[var(--bone-deep)] border-t border-[var(--line)]">
        <AnnouncementsSection />
      </div>

      {/* ───────────────────── Footer ───────────────────── */}
      <footer className="bg-[var(--ink)] text-white/80">
        <div className="max-w-[1320px] mx-auto pad-mobile px-6 lg:px-10 pt-16 sm:pt-20 pb-10">
          <div className="grid lg:grid-cols-12 gap-10 sm:gap-12 mb-12 sm:mb-14">
            <div className="lg:col-span-5">
              <div className="flex items-center gap-3 mb-5 sm:mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ASSETS.logo}
                  alt="Graphic Era University"
                  className="h-10 w-auto object-contain bg-white/95 rounded-md p-1"
                />
                <div>
                  <p className="serif text-[18px] sm:text-[20px] font-medium text-white">
                    School of Management
                  </p>
                  <p className="micro text-white/60 mt-1">
                    Graphic Era · Dehradun
                  </p>
                </div>
              </div>
              <p className="text-[14px] sm:text-[14.5px] leading-[1.7] text-white/60 max-w-md">
                Graphic Era School of Management — postgraduate and doctoral
                programmes in business, since 2006.
              </p>
            </div>

            <div className="lg:col-span-3">
              <p className="micro text-[var(--gold-soft)] mb-4 sm:mb-5">Site</p>
              <ul className="space-y-3 text-[14px]">
                <li><a href="#programmes" className="link">Programmes</a></li>
                <li><a href="#placements" className="link">Placements</a></li>
                <li><a href="#campus"     className="link">Campus</a></li>
                <li><a href="#contact"    className="link">Contact</a></li>
              </ul>
            </div>

            <div className="lg:col-span-4">
              <p className="micro text-[var(--gold-soft)] mb-4 sm:mb-5">Contact</p>
              {contact.emails.map((e) => (
                <p key={e} className="serif text-[17px] sm:text-[18px] text-white mb-1 break-words">{e}</p>
              ))}
              {contact.phones.map((p) => (
                <p key={p} className="serif num text-[17px] sm:text-[18px] text-white">{p}</p>
              ))}
              <div className="flex gap-2.5 mt-6 sm:mt-7">
                {[
                  { Icon: FiLinkedin,  href: 'https://www.linkedin.com/school/graphic-era-official' },
                  { Icon: FiFacebook,  href: 'https://www.facebook.com/geuofficial/' },
                  { Icon: FiInstagram, href: 'https://www.facebook.com/geuofficial/' },
                  { Icon: FiYoutube,   href: 'https://www.facebook.com/geuofficial/' },
                ].map(({ Icon, href }, i) => (
                  <a
                    key={i}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full border border-white/20 hover:bg-[var(--gold)] hover:border-[var(--gold)] hover:text-[var(--ink)] flex items-center justify-center transition"
                  >
                    <Icon size={13} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="rule bg-white/10" />
          <div className="pt-6 sm:pt-7 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-[11.5px] sm:text-[12px] text-white/45">
            <p>© 2026 Graphic Era University · Department of Management</p>
            <p className="micro">GESoM Portal · v2026.4</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─────────── Facility card ────────── */
function FacilityCard({
  f,
  scrollY,
  parallaxBase,
  className = '',
}: {
  f: Facility;
  scrollY: number;
  parallaxBase: number;
  className?: string;
}) {
  return (
    <figure
      data-reveal
      className={`reveal group relative overflow-hidden rounded-[18px] sm:rounded-[20px] bg-[var(--bone-deep)] ${className}`}
    >
      <div
        className="absolute inset-0 will-change-transform"
        style={{
          transform: `translate3d(0, ${(scrollY - parallaxBase) * -0.05}px, 0) scale(1.10)`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={f.img}
          alt={f.name}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.2s] group-hover:scale-[1.04]"
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 glass-dark text-white flex items-baseline justify-between gap-3">
        <p className="serif text-[16px] sm:text-[18px] lg:text-[20px] font-medium leading-tight">
          {f.name}
        </p>
        <span className="micro text-white/70 hidden sm:block">GEU</span>
      </div>
    </figure>
  );
}
