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
} from 'react-icons/fi';
import AnnouncementsSection from './components/Announcements/AnnouncementsSection';

/* ──────────────────────────────────────────────────────────────
   GESoM Landing — Minimal, formal, iOS-style.
   Display: Cormorant Garamond · Body: Inter
   ────────────────────────────────────────────────────────────── */

const ASSETS = {
  logo: 'https://geu.ac.in/frontend/assets/images/geu-logo.webp',
  banner:
    'https://geu.ac.in/uploads/pages/DntHgRFyE9nzmmFPhm05JFH3ZgWhKlZ6b7pzM94E.webp',
  placement:
    'https://geu.ac.in/uploads/page_section_attributes/placements-testimonial-69bd1d5811abb-1774001496.png',
  video:
    'https://geu.ac.in/uploads/page_section_attributes/VDd0PpwcgWvddNdkOK823B05H1KhyNeAHiNIAJXO.mp4',
};

const PROGRAMS = [
  {
    code: '01',
    name: 'Master of Business Administration (MBA)',
    duration: '2 Years',
    note: 'A two-year full-time MBA built on a rigorous core curriculum and a wide arc of specialisations.',
    specs: [
      'Marketing', 'Finance', 'Human Resource Management',
      'Logistics & Supply Chain Management', 'Hospital Administration',
      'Airport & Airline Management', 'International Business',
      'Banking & Insurance', 'Fintech', 'Digital Marketing',
      'Branding & Advertising', 'Retail', 'Entrepreneurship',
      'Sports Management',
    ],
  },
  {
    code: '02',
    name: 'MBA (IMPACT)',
    duration: '2 Years',
    note: 'An industry-integrated MBA, structured around live projects and senior corporate mentorship.',
  },
  {
    code: '03',
    name: 'MBA in Artificial Intelligence (AI) & Data Science (DS)',
    duration: '2 Years',
    note: 'A STEM-aligned MBA in applied machine learning, analytics and the strategic use of data.',
  },
  {
    code: '04',
    name: 'M.B.A Business Analytics (Industry Partner — Grant Thornton)',
    duration: '2 Years',
    note: 'Delivered with Grant Thornton as Industry Partner — analytics, audit and consulting at scale.',
  },
  {
    code: '05',
    name: 'Ph.D. in Management Studies',
    duration: 'Doctoral',
    note: 'A research-intensive doctorate for scholars and practitioners working at the frontier of management thought.',
  },
];

const PLACEMENTS = [
  { name: 'Dikshant Sharma',   program: 'MBA',        pkg: '₹15.40 L', year: '2025' },
  { name: 'Shreyansh Rohilla', program: 'MBA-Impact', pkg: '₹10.20 L', year: '2025' },
  { name: 'Vanshika Kakkar',   program: 'MBA',        pkg: '₹10.20 L', year: '2025' },
  { name: 'Shreya Raj',        program: 'MBA',        pkg: '₹10.20 L', year: '2025' },
  { name: 'Chanchal Gupta',    program: 'MBA',        pkg: '₹10.20 L', year: '2025' },
];

const FACILITIES = [
  { name: 'Library', img: 'https://geu.ac.in/uploads/page_section_attributes/facilities-69de269edf155-1776166558.webp' },
  { name: 'Lecture Theatre', img: 'https://geu.ac.in/uploads/page_section_attributes/facilities-6a06e92349404-1778837795.webp' },
  { name: 'Seminar Hall', img: 'https://geu.ac.in/uploads/page_section_attributes/facilities-69d648140530b-1775650836.webp' },
  { name: 'Conference Hall', img: 'https://geu.ac.in/uploads/page_section_attributes/facilities-6a06e92d5c1f4-1778837805.webp' },
  { name: 'Computer Lab', img: 'https://geu.ac.in/uploads/page_section_attributes/facilities-69de26a23e8e2-1776166562.webp' },
  { name: 'Classroom', img: 'https://geu.ac.in/uploads/page_section_attributes/facilities-69de26969e5a4-1776166550.webp' },
  { name: 'Board Room — Chanakya Block', img: 'https://geu.ac.in/uploads/page_section_attributes/facilities-69e89713b20e3-1776850707.webp' },
  { name: 'Dell Lab', img: 'https://geu.ac.in/uploads/page_section_attributes/facilities-6a06e952dfa9e-1778837842.webp' },
  { name: 'Vidhan Sabha', img: 'https://geu.ac.in/uploads/page_section_attributes/facilities-6a06e94fd0fac-1778837839.webp' },
  { name: 'Lecture Theatre — Chanakya Block', img: 'https://geu.ac.in/uploads/page_section_attributes/facilities-69e89735c53c3-1776850741.webp' },
  { name: 'Lecture Theatre — New Building', img: 'https://geu.ac.in/uploads/page_section_attributes/facilities-69e8973c6ba0b-1776850748.webp' },
  { name: 'Seminar Hall — Chanakya Block', img: 'https://geu.ac.in/uploads/page_section_attributes/facilities-69e8975a8bff0-1776850778.webp' },
  { name: 'Tutorial Room', img: 'https://geu.ac.in/uploads/page_section_attributes/facilities-69e8976220c5f-1776850786.webp' },
];

const CONTACT = {
  address:
    '566/6, Bell Road, Society Area, Clement Town, Dehradun, Uttarakhand — 248002',
  phones: ['1800 270 1280', '1800 890 6027'],
  emails: ['admissions@geu.ac.in', 'enquiry@geu.ac.in'],
};

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [openProgram, setOpenProgram] = useState<number | null>(0);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

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
  }, []);

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
        .gesom-root .num {
          font-variant-numeric: tabular-nums lining-nums;
        }
        .gesom-root .rule {
          height: 1px;
          background: var(--line);
        }
        .gesom-root .reveal {
          opacity: 0;
          transform: translateY(18px);
          transition: opacity 0.9s cubic-bezier(0.2, 0.7, 0.2, 1),
            transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);
        }
        .gesom-root .is-in {
          opacity: 1;
          transform: none;
        }
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
          background: rgba(250, 250, 247, 0.72);
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

        .gesom-root .display-xl { font-size: clamp(48px, 7.4vw, 104px); line-height: 1.02; font-weight: 500; }
        .gesom-root .display-lg { font-size: clamp(36px, 4.6vw, 64px);  line-height: 1.06; font-weight: 500; }
        .gesom-root .display-md { font-size: clamp(28px, 3.2vw, 44px);  line-height: 1.12; font-weight: 500; }
        .gesom-root .display-sm { font-size: clamp(22px, 2.2vw, 30px);  line-height: 1.20; font-weight: 500; }

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
        .gesom-root .chip:hover {
          background: var(--ink);
          color: var(--bone);
        }
      `}</style>

      {/* ───────────────────── Nav ───────────────────── */}
      <header className="sticky top-0 z-50 glass border-b border-[var(--line)]">
        <div className="max-w-[1320px] mx-auto px-6 lg:px-10 h-[68px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ASSETS.logo}
              alt="Graphic Era University"
              className="h-9 w-auto object-contain"
              loading="eager"
            />
            <span className="hidden sm:flex flex-col leading-none">
              <span className="serif text-[18px] font-medium text-[var(--ink)]">
                School of Management
              </span>
              <span className="micro text-[var(--muted)] mt-1">
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

          <div className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className="hidden sm:inline-flex items-center text-[13.5px] font-medium text-[var(--ink-soft)] link px-2 py-2"
            >
              Sign in
            </Link>
            <a
              href="https://apply.geu.ac.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--ink)] text-[var(--bone)] text-[13px] font-medium rounded-full hover:bg-black transition"
            >
              Apply
              <FiArrowUpRight size={14} />
            </a>
          </div>
        </div>
      </header>

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
          <div className="absolute inset-0 bg-gradient-to-b from-[#06090f]/55 via-[#06090f]/35 to-[#06090f]/85" />
        </div>

        <div className="relative max-w-[1320px] mx-auto px-6 lg:px-10 min-h-[92vh] flex flex-col justify-between pt-32 pb-14">
          <div data-reveal className="reveal max-w-3xl">
            <p className="micro text-[var(--gold-soft)] mb-7 flex items-center gap-3">
              <span className="w-8 h-px bg-[var(--gold-soft)]/70" />
              Graphic Era School of Management
            </p>
            <h1 className="serif display-xl text-white">
              Shaping Future
              <br />
              <span className="text-[var(--gold-soft)]">Business Leaders.</span>
            </h1>
            <p className="mt-8 max-w-xl text-[16px] leading-[1.7] text-white/75 font-light">
              Two decades of academic excellence in management education at
              Graphic Era University, Dehradun — postgraduate and doctoral
              programmes designed for the next generation of managers,
              analysts and founders.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a
                href="https://apply.geu.ac.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-white text-[var(--ink)] rounded-full text-[14px] font-medium hover:bg-[var(--bone)] transition"
              >
                Begin application
                <FiArrowUpRight size={15} />
              </a>
              <a
                href="#programmes"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 border border-white/25 text-white rounded-full text-[14px] font-medium hover:bg-white/5 transition"
              >
                View programmes
                <FiArrowRight size={15} />
              </a>
            </div>
          </div>

          <div
            data-reveal
            className="reveal reveal-delay-3 grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-6 max-w-3xl pt-10 mt-10 border-t border-white/15"
          >
            {[
              { fig: '20+',      cap: 'Years of excellence' },
              { fig: '5',        cap: 'Programmes' },
              { fig: '14',       cap: 'MBA specialisations' },
              { fig: '₹15.40 L', cap: 'Highest package · 2025' },
            ].map((s) => (
              <div key={s.cap}>
                <p className="serif num display-sm text-white">{s.fig}</p>
                <p className="mt-2 micro text-white/55">{s.cap}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────── About ───────────────────── */}
      <section className="bg-[var(--bone)] py-28 lg:py-40">
        <div className="max-w-[1100px] mx-auto px-6 lg:px-10">
          <div data-reveal className="reveal">
            <p className="micro text-[var(--gold)] mb-8">About GESoM</p>
            <p className="serif display-lg text-[var(--ink)] max-w-4xl">
              A hub for nurturing top-tier leadership in the corporate world —
              recognised among the best management schools in India.
            </p>
          </div>

          <div className="mt-16 lg:mt-20 grid md:grid-cols-3 gap-10 lg:gap-16">
            {[
              {
                k: '01',
                h: 'Two decades of teaching',
                p: 'A management department founded in 2006, with twenty years of academic record across MBA, MBA IMPACT, AI &amp; Data Science and the doctoral programme.',
              },
              {
                k: '02',
                h: 'Industry partnerships',
                p: 'Programmes built with corporate partners — including the M.B.A in Business Analytics delivered with Grant Thornton as Industry Partner.',
              },
              {
                k: '03',
                h: 'A campus that supports the work',
                p: 'Lecture theatres, computer and analytics labs, syndicate rooms, board rooms and one of the largest libraries in the region.',
              },
            ].map((b, i) => (
              <div
                key={b.k}
                data-reveal
                className={`reveal reveal-delay-${i + 1}`}
              >
                <p className="serif num text-[var(--gold)] text-[28px]">{b.k}</p>
                <div className="mt-3 mb-5 h-px w-10 bg-[var(--gold)]/60" />
                <h3 className="serif display-sm text-[var(--ink)]">{b.h}</h3>
                <p
                  className="mt-4 text-[15px] leading-[1.7] text-[var(--muted)]"
                  dangerouslySetInnerHTML={{ __html: b.p }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────── Programmes ───────────────────── */}
      <section id="programmes" className="bg-[var(--paper)] py-28 lg:py-40">
        <div className="max-w-[1320px] mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-12 gap-10 mb-20 lg:mb-24">
            <div data-reveal className="reveal lg:col-span-4">
              <p className="micro text-[var(--gold)]">I — Programmes</p>
              <div className="mt-4 h-px w-12 bg-[var(--gold)]/60" />
            </div>
            <div data-reveal className="reveal reveal-delay-1 lg:col-span-8">
              <h2 className="serif display-lg text-[var(--ink)]">
                Five programmes for the modern manager.
              </h2>
              <p className="mt-6 max-w-2xl text-[16px] leading-[1.7] text-[var(--muted)]">
                Postgraduate and doctoral degrees across general management,
                analytics, artificial intelligence and applied business
                analytics. Open any programme for tracks &amp; specialisations.
              </p>
            </div>
          </div>

          <div className="border-t border-[var(--line)]">
            {PROGRAMS.map((p, i) => {
              const open = openProgram === i;
              return (
                <div
                  key={p.code}
                  data-reveal
                  className={`reveal reveal-delay-${Math.min(i, 4)} border-b border-[var(--line)]`}
                >
                  <button
                    onClick={() => setOpenProgram(open ? null : i)}
                    className="w-full grid lg:grid-cols-12 gap-6 py-8 lg:py-10 text-left items-baseline group transition px-1 -mx-1 rounded-2xl hover:bg-[var(--bone)]"
                  >
                    <div className="lg:col-span-1 num micro text-[var(--gold)]">
                      {p.code}
                    </div>
                    <div className="lg:col-span-8">
                      <h3 className="serif display-md text-[var(--ink)]">
                        {p.name}
                      </h3>
                    </div>
                    <div className="lg:col-span-2 flex flex-col">
                      <span className="micro text-[var(--muted)]">Duration</span>
                      <span className="mt-1 text-[14px] text-[var(--ink-soft)] font-medium">
                        {p.duration}
                      </span>
                    </div>
                    <div className="lg:col-span-1 flex lg:justify-end">
                      <span
                        className={`w-10 h-10 rounded-full border border-[var(--line)] flex items-center justify-center transition-transform duration-500 ${
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
                      <div className="grid lg:grid-cols-12 gap-6 pb-10 lg:pb-12">
                        <div className="lg:col-span-1" />
                        <div className="lg:col-span-7">
                          <p className="serif italic text-[20px] lg:text-[22px] leading-[1.45] text-[var(--ink-soft)] max-w-2xl font-light">
                            {p.note}
                          </p>

                          {p.specs && (
                            <div className="mt-8">
                              <p className="micro text-[var(--muted)] mb-4">
                                Specialisations
                              </p>
                              <div className="flex flex-wrap gap-2.5">
                                {p.specs.map((s) => (
                                  <span key={s} className="chip">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="lg:col-span-4">
                          <a
                            href="https://apply.geu.ac.in/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-[13.5px] font-medium text-[var(--ink)]"
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
        className="relative bg-[var(--bone)] py-28 lg:py-40 overflow-hidden"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[60%] opacity-[0.04]"
          style={{
            transform: `translate3d(0, ${(scrollY - 2400) * 0.08}px, 0)`,
            backgroundImage:
              'radial-gradient(circle at 20% 50%, #a07a3b 0, transparent 40%), radial-gradient(circle at 80% 30%, #0e1014 0, transparent 45%)',
          }}
        />
        <div className="relative max-w-[1320px] mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-12 gap-10 mb-16">
            <div data-reveal className="reveal lg:col-span-4">
              <p className="micro text-[var(--gold)]">II — Placements</p>
              <div className="mt-4 h-px w-12 bg-[var(--gold)]/60" />
            </div>
            <div data-reveal className="reveal reveal-delay-1 lg:col-span-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
              <h2 className="serif display-lg text-[var(--ink)] max-w-3xl">
                Class of <span className="num">2025</span> — featured offers.
              </h2>
              <p className="micro text-[var(--muted)] max-w-xs">
                A selection of placements from the 2025 graduating cohort.
              </p>
            </div>
          </div>

          {/* Featured testimonial frame + offer cards */}
          <div className="grid lg:grid-cols-12 gap-6">
            <div
              data-reveal
              className="reveal lg:col-span-5 relative rounded-[24px] overflow-hidden aspect-[4/5] lg:aspect-auto bg-[var(--bone-deep)]"
            >
              <div
                className="absolute inset-0 will-change-transform"
                style={{
                  transform: `translate3d(0, ${(scrollY - 2800) * -0.04}px, 0) scale(1.05)`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ASSETS.placement}
                  alt="GESoM placement"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 p-6 glass-dark text-white">
                <p className="micro text-white/70">Class of 2025</p>
                <p className="serif text-[22px] font-medium mt-1">
                  100% Placement Record
                </p>
              </div>
            </div>

            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-5">
              {PLACEMENTS.map((p, i) => (
                <article
                  key={p.name}
                  data-reveal
                  className={`reveal reveal-delay-${(i % 5) + 1} card p-7`}
                >
                  <p className="micro text-[var(--muted)]">{p.year}</p>
                  <p className="serif text-[22px] font-medium text-[var(--ink)] leading-tight mt-3">
                    {p.name}
                  </p>
                  <p className="mt-1 text-[13px] text-[var(--muted)]">
                    {p.program}
                  </p>
                  <div className="mt-7 pt-5 border-t border-[var(--line)]">
                    <p className="micro text-[var(--muted)] mb-2">Offer</p>
                    <p className="serif num text-[28px] font-semibold text-[var(--ink)] leading-none">
                      {p.pkg}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────── Campus — facility gallery ───────────────────── */}
      <section id="campus" className="bg-[var(--paper)] py-28 lg:py-40">
        <div className="max-w-[1320px] mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-12 gap-10 mb-16">
            <div data-reveal className="reveal lg:col-span-4">
              <p className="micro text-[var(--gold)]">III — Campus</p>
              <div className="mt-4 h-px w-12 bg-[var(--gold)]/60" />
            </div>
            <div data-reveal className="reveal reveal-delay-1 lg:col-span-8">
              <h2 className="serif display-lg text-[var(--ink)] max-w-3xl">
                Thirteen rooms, two blocks, one campus.
              </h2>
              <p className="mt-6 max-w-2xl text-[16px] leading-[1.7] text-[var(--muted)]">
                Lecture theatres, syndicate rooms, computer and analytics
                labs, a board room, a tutorial wing and the central library —
                the working environments of the Department of Management.
              </p>
            </div>
          </div>

          {/* Mosaic — featured top + grid below */}
          <div className="grid lg:grid-cols-12 gap-5 lg:gap-6">
            {/* Featured 0 */}
            <Facility
              f={FACILITIES[0]}
              scrollY={scrollY}
              parallaxBase={3800}
              className="lg:col-span-7 aspect-[16/10]"
            />
            {/* Featured 1 */}
            <Facility
              f={FACILITIES[1]}
              scrollY={scrollY}
              parallaxBase={3800}
              className="lg:col-span-5 aspect-[16/10] lg:aspect-auto"
            />
            {/* Grid remainder — 3 per row */}
            {FACILITIES.slice(2).map((f, i) => (
              <Facility
                key={f.name}
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
      <section className="relative bg-[var(--ink)] text-white py-28 lg:py-36 overflow-hidden">
        <div
          className="absolute inset-0 opacity-30 will-change-transform"
          style={{
            transform: `translate3d(0, ${(scrollY - 5800) * -0.12}px, 0)`,
            background:
              'radial-gradient(ellipse at center, rgba(196, 161, 104, 0.35), transparent 55%)',
          }}
        />
        <div className="relative max-w-[920px] mx-auto px-6 text-center">
          <p data-reveal className="reveal micro text-[var(--gold-soft)] mb-8">
            Admissions 2026 — now open
          </p>
          <h2
            data-reveal
            className="reveal reveal-delay-1 serif display-xl text-white"
          >
            Apply to the
            <br />
            <span className="italic font-light text-[var(--gold-soft)]">
              Class of 2028.
            </span>
          </h2>
          <p
            data-reveal
            className="reveal reveal-delay-2 mt-8 max-w-md mx-auto text-[15px] leading-[1.7] text-white/65"
          >
            Submit your application online. Admissions enquiries are answered
            within five working days.
          </p>
          <div
            data-reveal
            className="reveal reveal-delay-3 mt-12 flex items-center justify-center gap-4 flex-wrap"
          >
            <a
              href="https://apply.geu.ac.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-8 py-4 bg-white text-[var(--ink)] rounded-full text-[14px] font-medium hover:bg-[var(--bone)] transition"
            >
              Begin application
              <FiArrowUpRight size={15} />
            </a>
            <a
              href="#contact"
              className="inline-flex items-center gap-2.5 px-8 py-4 border border-white/25 text-white rounded-full text-[14px] font-medium hover:bg-white/5 transition"
            >
              Talk to admissions
            </a>
          </div>
        </div>
      </section>

      {/* ───────────────────── Contact ───────────────────── */}
      <section id="contact" className="bg-[var(--bone)] py-28 lg:py-36">
        <div className="max-w-[1320px] mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-12 gap-10 mb-16">
            <div data-reveal className="reveal lg:col-span-4">
              <p className="micro text-[var(--gold)]">IV — Contact</p>
              <div className="mt-4 h-px w-12 bg-[var(--gold)]/60" />
            </div>
            <div data-reveal className="reveal reveal-delay-1 lg:col-span-8">
              <h2 className="serif display-lg text-[var(--ink)]">
                Reach the admissions office.
              </h2>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { Icon: FiMapPin, title: 'Address',  lines: [CONTACT.address] },
              { Icon: FiPhone,  title: 'Helpline', lines: CONTACT.phones },
              { Icon: FiMail,   title: 'Email',    lines: CONTACT.emails },
            ].map((c, i) => {
              const { Icon } = c;
              return (
                <div
                  key={c.title}
                  data-reveal
                  className={`reveal reveal-delay-${i + 1} card p-8`}
                >
                  <div className="flex items-center justify-between mb-7">
                    <span className="w-10 h-10 rounded-full bg-[var(--bone-deep)] text-[var(--ink)] flex items-center justify-center">
                      <Icon size={16} />
                    </span>
                    <span className="micro text-[var(--muted)]">{c.title}</span>
                  </div>
                  <div className="space-y-1.5">
                    {c.lines.map((l) => (
                      <p
                        key={l}
                        className="serif text-[18px] leading-[1.4] text-[var(--ink)] font-medium"
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
        <div className="max-w-[1320px] mx-auto px-6 lg:px-10 pt-20 pb-10">
          <div className="grid lg:grid-cols-12 gap-12 mb-14">
            <div className="lg:col-span-5">
              <div className="flex items-center gap-3 mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ASSETS.logo}
                  alt="Graphic Era University"
                  className="h-10 w-auto object-contain bg-white/95 rounded-md p-1"
                />
                <div>
                  <p className="serif text-[20px] font-medium text-white">
                    School of Management
                  </p>
                  <p className="micro text-white/60 mt-1">
                    Graphic Era · Dehradun
                  </p>
                </div>
              </div>
              <p className="text-[14.5px] leading-[1.7] text-white/60 max-w-md">
                Graphic Era School of Management — postgraduate and doctoral
                programmes in business, since 2006.
              </p>
            </div>

            <div className="lg:col-span-3">
              <p className="micro text-[var(--gold-soft)] mb-5">Site</p>
              <ul className="space-y-3 text-[14px]">
                <li><a href="#programmes" className="link">Programmes</a></li>
                <li><a href="#placements" className="link">Placements</a></li>
                <li><a href="#campus"     className="link">Campus</a></li>
                <li><a href="#contact"    className="link">Contact</a></li>
              </ul>
            </div>

            <div className="lg:col-span-4">
              <p className="micro text-[var(--gold-soft)] mb-5">Contact</p>
              {CONTACT.emails.map((e) => (
                <p key={e} className="serif text-[18px] text-white mb-1">{e}</p>
              ))}
              {CONTACT.phones.map((p) => (
                <p key={p} className="serif num text-[18px] text-white">{p}</p>
              ))}
              <div className="flex gap-2.5 mt-7">
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
          <div className="pt-7 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-[12px] text-white/45">
            <p>© 2026 Graphic Era University · Department of Management</p>
            <p className="micro">GESoM Portal · v2026.3</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─────────── Facility card — extracted so parallax stays clean ────────── */
function Facility({
  f,
  scrollY,
  parallaxBase,
  className = '',
}: {
  f: { name: string; img: string };
  scrollY: number;
  parallaxBase: number;
  className?: string;
}) {
  return (
    <figure
      data-reveal
      className={`reveal group relative overflow-hidden rounded-[20px] bg-[var(--bone-deep)] ${className}`}
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
      <div className="absolute inset-x-0 bottom-0 p-5 glass-dark text-white flex items-baseline justify-between gap-3">
        <p className="serif text-[18px] lg:text-[20px] font-medium leading-tight">
          {f.name}
        </p>
        <span className="micro text-white/70 hidden sm:block">GEU</span>
      </div>
    </figure>
  );
}
