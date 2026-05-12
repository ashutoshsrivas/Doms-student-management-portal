'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  FiArrowRight,
  FiBook,
  FiUsers,
  FiBarChart2,
  FiCheckCircle,
  FiTwitter,
  FiLinkedin,
  FiStar,
  FiBriefcase,
  FiMapPin,
  FiPhone,
  FiMail,
  FiChevronDown,
  FiAward,
  FiTrendingUp,
} from 'react-icons/fi';
import AnnouncementsSection from './components/Announcements/AnnouncementsSection';

/* ── Hooks ──────────────────────────────────────────────────── */

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useCounter(target: number, inView: boolean, duration = 1800) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration]);
  return count;
}

function useParallax() {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            const scrolled = -rect.top * 0.3;
            setOffset(scrolled);
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return { ref, offset };
}

/* ── Stat Counter Card ──────────────────────────────────────── */
function StatCard({
  number, suffix, label, color, delay,
}: { number: number; suffix: string; label: string; color: string; delay: number }) {
  const { ref, inView } = useInView(0.3);
  const count = useCounter(number, inView);
  return (
    <div
      ref={ref}
      className="bg-white rounded-2xl p-6 text-center border border-[rgba(60,60,67,0.07)] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s cubic-bezier(0.34,1.2,0.64,1) ${delay}ms, box-shadow 0.2s ease, translate 0.2s ease`,
      }}
    >
      <div className={`text-[36px] font-bold leading-none mb-2 ${color}`}>
        {count}{suffix}
      </div>
      <div className="text-[12px] text-[rgba(60,60,67,0.5)] font-medium">{label}</div>
    </div>
  );
}

/* ── Reveal wrapper ─────────────────────────────────────────── */
function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s cubic-bezier(0.34,1.1,0.64,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ── Floating orb ───────────────────────────────────────────── */
function FloatingOrb({ size, color, top, left, right, delay }: {
  size: string; color: string; top?: string; left?: string; right?: string; delay: number;
}) {
  return (
    <div
      className={`absolute ${size} ${color} rounded-full blur-3xl opacity-40 pointer-events-none`}
      style={{
        top, left, right,
        animation: `float ${4 + delay * 0.5}s ease-in-out ${delay}s infinite alternate`,
      }}
    />
  );
}

/* ── Main Page ──────────────────────────────────────────────── */
export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { ref: heroRef, offset: heroOffset } = useParallax();
  const [navScrolled, setNavScrolled] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {});
    }
    // Hero entrance
    const t = setTimeout(() => setHeroVisible(true), 100);
    // Nav scroll state
    const handleScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => { clearTimeout(t); window.removeEventListener('scroll', handleScroll); };
  }, []);

  return (
    <>
      <style>{`
        @keyframes float {
          from { transform: translateY(0px) scale(1); }
          to   { transform: translateY(-20px) scale(1.05); }
        }
        @keyframes heroText {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroBadge {
          from { opacity: 0; transform: translateY(-12px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes scrollCue {
          0%, 100% { transform: translateX(-50%) translateY(0); opacity: 0.4; }
          50%       { transform: translateX(-50%) translateY(8px); opacity: 0.9; }
        }
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track { animation: ticker 28s linear infinite; }
        .ticker-track:hover { animation-play-state: paused; }
      `}</style>

      <div className="min-h-screen bg-white overflow-x-hidden">

        {/* ── Navigation ─────────────────────────────────────── */}
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          navScrolled
            ? 'bg-white/90 backdrop-blur-xl border-b border-[rgba(60,60,67,0.1)] shadow-sm'
            : 'bg-transparent border-b border-transparent'
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#007AFF] flex items-center justify-center shadow-sm shadow-blue-200/60">
                <span className="text-white font-bold text-sm">G</span>
              </div>
              <div>
                <p className={`text-[15px] font-bold leading-tight transition-colors duration-300 ${navScrolled ? 'text-gray-900' : 'text-white'}`}>GEU</p>
                <p className={`text-[10px] leading-tight font-medium transition-colors duration-300 ${navScrolled ? 'text-[rgba(60,60,67,0.5)]' : 'text-white/60'}`}>Management Department</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className={`px-4 py-2 text-sm font-medium transition rounded-full ${
                  navScrolled ? 'text-gray-700 hover:text-gray-900 hover:bg-gray-100' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                Sign In
              </Link>
              <a
                href="https://apply.geu.ac.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2 bg-[#007AFF] hover:bg-[#0071E3] text-white rounded-full font-semibold transition text-sm shadow-sm shadow-blue-300/40"
              >
                Apply Now
              </a>
            </div>
          </div>
        </nav>

        {/* ── Hero ───────────────────────────────────────────── */}
        <section className="relative h-screen bg-black overflow-hidden flex items-center">
          {/* Parallax video wrapper */}
          <div
            ref={heroRef}
            className="absolute inset-0"
            style={{ transform: `translateY(${heroOffset}px)`, willChange: 'transform' }}
          >
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover scale-110"
              autoPlay muted loop playsInline
              poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 600'%3E%3Crect fill='%23001a33' width='1200' height='600'/%3E%3C/svg%3E"
            >
              <source src="https://geu.ac.in/uploads/page_section_attributes/VDd0PpwcgWvddNdkOK823B05H1KhyNeAHiNIAJXO.mp4" type="video/mp4" />
              <source src="/video.mp4" type="video/mp4" />
            </video>
          </div>

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />

          {/* Floating orbs */}
          <FloatingOrb size="w-80 h-80" color="bg-blue-500" top="10%" right="-5%" delay={0} />
          <FloatingOrb size="w-56 h-56" color="bg-purple-600" top="55%" right="15%" delay={1.5} />
          <FloatingOrb size="w-40 h-40" color="bg-cyan-400" top="20%" right="30%" delay={0.8} />

          {/* Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-16">
            <div className="max-w-2xl">
              {/* Badge */}
              <div
                style={{
                  animation: heroVisible ? 'heroBadge 0.7s cubic-bezier(0.34,1.3,0.64,1) 0.2s both' : 'none',
                  opacity: 0,
                }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full mb-6">
                  <div className="w-1.5 h-1.5 bg-[#34C759] rounded-full animate-pulse" />
                  <span className="text-white/90 text-[11px] font-semibold tracking-widest uppercase">GESoM · Est. 2006</span>
                </div>
              </div>

              {/* Headline */}
              <h1
                className="text-5xl md:text-6xl lg:text-[72px] font-bold text-white mb-5 leading-[1.05] tracking-tight"
                style={{ animation: heroVisible ? 'heroText 0.9s cubic-bezier(0.34,1.1,0.64,1) 0.35s both' : 'none', opacity: 0 }}
              >
                Shaping Future<br />
                <span className="bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
                  Business Leaders
                </span>
              </h1>

              <p
                className="text-[17px] text-white/65 mb-9 leading-relaxed max-w-lg"
                style={{ animation: heroVisible ? 'heroText 0.9s cubic-bezier(0.34,1.1,0.64,1) 0.5s both' : 'none', opacity: 0 }}
              >
                Graphic Era School of Management — where academic excellence meets industry expertise.
              </p>

              <div
                className="flex gap-3 flex-wrap"
                style={{ animation: heroVisible ? 'heroText 0.9s cubic-bezier(0.34,1.1,0.64,1) 0.65s both' : 'none', opacity: 0 }}
              >
                <a
                  href="https://apply.geu.ac.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 px-7 py-3.5 bg-[#007AFF] hover:bg-[#0071E3] text-white rounded-full font-semibold transition-all duration-200 text-[15px] shadow-lg shadow-blue-500/40 hover:shadow-blue-500/60 hover:-translate-y-0.5"
                >
                  Apply Now
                  <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </a>
                <Link
                  href="#programs"
                  className="flex items-center gap-2 px-7 py-3.5 bg-white/10 backdrop-blur-sm border border-white/25 hover:bg-white/20 text-white rounded-full font-semibold transition-all duration-200 text-[15px] hover:-translate-y-0.5"
                >
                  Explore Programs
                </Link>
              </div>
            </div>
          </div>

          {/* Scroll cue */}
          <div
            className="absolute bottom-8 left-1/2 flex flex-col items-center gap-1 text-white/40"
            style={{ animation: 'scrollCue 2s ease-in-out 1.5s infinite', opacity: 0, transform: 'translateX(-50%)' }}
          >
            <span className="text-[9px] uppercase tracking-[0.25em] font-semibold">Scroll</span>
            <FiChevronDown className="w-4 h-4" />
          </div>
        </section>

        {/* ── Ticker ─────────────────────────────────────────── */}
        <div className="bg-[#007AFF] py-3 overflow-hidden">
          <div className="flex whitespace-nowrap ticker-track">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center gap-0 flex-shrink-0">
                {['20+ Years Excellence', '25+ Expert Faculty', '10.2L Avg Package', '100% Placements', '29 Corporate Partners', 'NBA Accredited', 'NAAC A+ Grade'].map((t, j) => (
                  <span key={j} className="flex items-center gap-4 px-8 text-white/90 text-[12px] font-semibold tracking-wide uppercase">
                    <span className="w-1 h-1 bg-white/50 rounded-full" />
                    {t}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── Stats ──────────────────────────────────────────── */}
        <section className="bg-[#f2f2f7] py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <StatCard number={20} suffix="+" label="Years of Excellence" color="text-[#007AFF]" delay={0} />
              <StatCard number={25} suffix="+" label="Expert Faculty" color="text-[#34C759]" delay={100} />
              <StatCard number={10} suffix=".2L" label="Average Package" color="text-[#FF9500]" delay={200} />
              <StatCard number={29} suffix="" label="Corporate Partners" color="text-[#AF52DE]" delay={300} />
            </div>
          </div>
        </section>

        {/* ── Programs ───────────────────────────────────────── */}
        <section id="programs" className="bg-white py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[rgba(0,122,255,0.08)] rounded-full mb-4">
                <FiBook className="w-3.5 h-3.5 text-[#007AFF]" />
                <span className="text-[#007AFF] text-[11px] font-semibold tracking-widest uppercase">Programs</span>
              </div>
              <h2 className="text-[36px] font-bold text-gray-900 mb-3 tracking-tight">World-Class Programs</h2>
              <p className="text-[rgba(60,60,67,0.55)] text-[15px] max-w-md mx-auto leading-relaxed">
                Designed to meet global industry standards and prepare leaders for tomorrow
              </p>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-5">
              {[
                {
                  icon: <FiBook className="w-5 h-5" />,
                  iconBg: 'bg-blue-50 text-[#007AFF]',
                  accent: '#007AFF',
                  title: 'MBA Programs',
                  subtitle: 'Master of Business Administration',
                  items: ['MBA (2 Years)', 'MBA IMPACT (2 Years)', 'MBA in AI & Data Science'],
                },
                {
                  icon: <FiUsers className="w-5 h-5" />,
                  iconBg: 'bg-green-50 text-[#34C759]',
                  accent: '#34C759',
                  title: 'BBA Programs',
                  subtitle: 'Bachelor of Business Administration',
                  items: ['Finance / Marketing / HR', 'Business Analytics', 'Entrepreneurship', 'Aviation Management', '+ 4 More Specializations'],
                },
                {
                  icon: <FiBarChart2 className="w-5 h-5" />,
                  iconBg: 'bg-purple-50 text-[#AF52DE]',
                  accent: '#AF52DE',
                  title: 'Ph.D. Programs',
                  subtitle: 'Doctoral Research Programs',
                  items: ['Ph.D. in Management Studies', 'Research-Focused Curriculum', 'Industry Collaboration'],
                },
              ].map((program, idx) => (
                <Reveal key={idx} delay={idx * 120}>
                  <div
                    className="group bg-[#f2f2f7] rounded-2xl p-7 hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-[rgba(60,60,67,0.07)] hover:-translate-y-1.5 relative overflow-hidden"
                  >
                    {/* Accent top bar */}
                    <div
                      className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: `linear-gradient(90deg, ${program.accent}, transparent)` }}
                    />
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${program.iconBg} group-hover:scale-110 transition-transform duration-300`}>
                      {program.icon}
                    </div>
                    <h3 className="text-[17px] font-bold text-gray-900 mb-1">{program.title}</h3>
                    <p className="text-[11px] text-[rgba(60,60,67,0.4)] mb-5 font-semibold uppercase tracking-wide">{program.subtitle}</p>
                    <ul className="space-y-2.5">
                      {program.items.map((item, i) => (
                        <li key={i} className="flex items-center gap-2.5 text-[13px] text-[rgba(60,60,67,0.72)]">
                          <FiCheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: program.accent }} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Placements ─────────────────────────────────────── */}
        <section id="placements" className="relative bg-[#f2f2f7] py-24 overflow-hidden">
          {/* Background decorations */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-green-100/60 to-transparent rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-blue-100/40 to-transparent rounded-full pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[rgba(52,199,89,0.1)] rounded-full mb-4">
                <FiTrendingUp className="w-3.5 h-3.5 text-[#34C759]" />
                <span className="text-[#34C759] text-[11px] font-semibold tracking-widest uppercase">Placements</span>
              </div>
              <h2 className="text-[36px] font-bold text-gray-900 mb-3 tracking-tight flex items-center justify-center gap-3">
                <FiBriefcase className="text-[#007AFF] w-8 h-8" />
                100% Placement Record
              </h2>
              <p className="text-[rgba(60,60,67,0.55)] text-[15px]">Our graduates are placed at top multinational companies</p>
            </Reveal>

            <Reveal delay={100}>
              <div className="bg-white rounded-3xl p-8 border border-[rgba(60,60,67,0.07)] shadow-sm">
                <div className="flex items-center gap-3 mb-7">
                  <div className="w-2 h-2 bg-[#34C759] rounded-full animate-pulse" />
                  <h3 className="text-[14px] font-semibold text-gray-800">Notable Placements — Batch 2025</h3>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { name: 'Shreyansh Rohilla', program: 'MBA-Impact', package: '₹10.20 L', initials: 'SR', from: '#60a5fa', to: '#3b82f6' },
                    { name: 'Vanshika Kakkar', program: 'MBA', package: '₹10.20 L', initials: 'VK', from: '#a78bfa', to: '#7c3aed' },
                    { name: 'Dikshant Sharma', program: 'MBA', package: '₹15.40 L', initials: 'DS', from: '#6ee7b7', to: '#059669' },
                  ].map((p, idx) => (
                    <Reveal key={idx} delay={idx * 100}>
                      <div className="group bg-[#f2f2f7] rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                        <div className="flex items-center gap-3 mb-4">
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-sm font-bold shadow-sm group-hover:scale-110 transition-transform duration-200"
                            style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}
                          >
                            {p.initials}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-[14px]">{p.name}</p>
                            <p className="text-[11px] text-[rgba(60,60,67,0.5)] font-medium">{p.program}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <FiAward className="w-3.5 h-3.5 text-[#34C759]" />
                          <span className="inline-flex items-center px-3 py-1 bg-[rgba(52,199,89,0.1)] rounded-full text-[#34C759] font-bold text-[13px]">
                            {p.package}
                          </span>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Facilities ─────────────────────────────────────── */}
        <section className="bg-white py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[rgba(175,82,222,0.08)] rounded-full mb-4">
                <FiStar className="w-3.5 h-3.5 text-[#AF52DE]" />
                <span className="text-[#AF52DE] text-[11px] font-semibold tracking-widest uppercase">Campus</span>
              </div>
              <h2 className="text-[36px] font-bold text-gray-900 mb-3 tracking-tight">World-Class Facilities</h2>
              <p className="text-[rgba(60,60,67,0.55)] text-[15px]">
                State-of-the-art infrastructure to support excellence in learning
              </p>
            </Reveal>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { name: 'Seminar Halls', icon: '🏛️', bg: 'bg-blue-50', hover: 'hover:bg-blue-100' },
                { name: 'Lecture Theatres', icon: '🎓', bg: 'bg-purple-50', hover: 'hover:bg-purple-100' },
                { name: 'Conference Rooms', icon: '💼', bg: 'bg-orange-50', hover: 'hover:bg-orange-100' },
                { name: 'Computer Labs', icon: '💻', bg: 'bg-green-50', hover: 'hover:bg-green-100' },
                { name: 'Library', icon: '📚', bg: 'bg-yellow-50', hover: 'hover:bg-yellow-100' },
                { name: 'Board Rooms', icon: '🤝', bg: 'bg-pink-50', hover: 'hover:bg-pink-100' },
              ].map((f, idx) => (
                <Reveal key={idx} delay={idx * 70}>
                  <div className={`${f.bg} ${f.hover} rounded-2xl p-8 text-center hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-default group`}>
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200 inline-block">{f.icon}</div>
                    <h3 className="text-[14px] font-semibold text-gray-800">{f.name}</h3>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── About ──────────────────────────────────────────── */}
        <section className="bg-[#f2f2f7] py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <Reveal>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[rgba(0,122,255,0.08)] rounded-full mb-5">
                  <span className="text-[#007AFF] text-[11px] font-semibold tracking-widest uppercase">About Us</span>
                </div>
                <h2 className="text-[36px] font-bold text-gray-900 mb-5 tracking-tight leading-tight">About GESoM</h2>
                <p className="text-[15px] text-[rgba(60,60,67,0.65)] mb-4 leading-relaxed">
                  The Graphic Era School of Management (GESoM) has established itself as a hub for nurturing top-tier leadership in the corporate world. Recognized among the best in management education in India.
                </p>
                <p className="text-[15px] text-[rgba(60,60,67,0.65)] mb-8 leading-relaxed">
                  With over two decades of academic excellence, our faculty comprises experienced professors and researchers committed to developing capable managers and entrepreneurs.
                </p>
                <div className="space-y-3">
                  {[
                    '20+ Years of Academic Excellence',
                    '25+ Expert Faculty Members',
                    '100% Placement Record',
                    '29 Corporate Partners',
                    'Global Industry Recognition',
                  ].map((item, idx) => (
                    <Reveal key={idx} delay={idx * 80}>
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-[rgba(52,199,89,0.14)] flex items-center justify-center flex-shrink-0">
                          <FiCheckCircle className="w-3 h-3 text-[#34C759]" />
                        </div>
                        <span className="text-[14px] font-medium text-[rgba(60,60,67,0.78)]">{item}</span>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </Reveal>

              <Reveal delay={150}>
                <div className="relative">
                  {/* Decorative glow */}
                  <div className="absolute -inset-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-[2.5rem] blur-xl opacity-50 pointer-events-none" />
                  <div className="relative bg-white rounded-3xl p-8 border border-[rgba(60,60,67,0.07)] shadow-lg">
                    <div className="w-12 h-12 rounded-2xl bg-yellow-50 flex items-center justify-center mb-5">
                      <FiStar className="w-6 h-6 text-[#FFCC00]" />
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[rgba(60,60,67,0.35)] mb-3">Our Tagline</p>
                    <p className="text-[28px] font-bold text-[#007AFF] leading-tight mb-5">
                      &quot;Shaping Future Business Leaders&quot;
                    </p>
                    <p className="text-[14px] text-[rgba(60,60,67,0.6)] leading-relaxed">
                      Every student at GESoM is equipped with the knowledge, skills, and mindset needed to excel in the dynamic business world.
                    </p>
                    {/* Decorative quote mark */}
                    <div className="absolute top-6 right-8 text-[120px] font-serif text-[rgba(0,122,255,0.06)] leading-none select-none pointer-events-none">&ldquo;</div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────────── */}
        <section className="relative py-28 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#003EB3] via-[#007AFF] to-[#5AC8FA]" />
          {/* Animated blobs */}
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-white/5 rounded-full blur-2xl" style={{ animation: 'float 6s ease-in-out infinite alternate' }} />
          <div className="absolute -bottom-24 -left-20 w-96 h-96 bg-white/5 rounded-full blur-2xl" style={{ animation: 'float 8s ease-in-out 1s infinite alternate' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[200px] bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Reveal>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/15 backdrop-blur-sm rounded-full mb-6">
                <div className="w-1.5 h-1.5 bg-[#34C759] rounded-full animate-pulse" />
                <span className="text-white text-[11px] font-semibold tracking-widest uppercase">Ready to Start?</span>
              </div>
              <h2 className="text-[44px] font-bold text-white mb-4 tracking-tight">Join GESoM Today</h2>
              <p className="text-[16px] text-white/70 mb-10 leading-relaxed">
                Start your journey to become a future business leader. Apply to our programs and transform your career.
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <a
                  href="https://apply.geu.ac.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group px-9 py-4 bg-white text-[#007AFF] font-bold rounded-full hover:bg-blue-50 transition-all duration-200 text-[15px] shadow-xl shadow-black/15 hover:-translate-y-0.5 hover:shadow-2xl"
                >
                  Apply Now
                </a>
                <Link
                  href="#programs"
                  className="px-9 py-4 bg-white/12 backdrop-blur-sm border border-white/30 text-white font-bold rounded-full hover:bg-white/22 transition-all duration-200 text-[15px] hover:-translate-y-0.5"
                >
                  Explore Programs
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Contact ────────────────────────────────────────── */}
        <section className="bg-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal className="text-center mb-12">
              <h2 className="text-[30px] font-bold text-gray-900 mb-2 tracking-tight">Get in Touch</h2>
              <p className="text-[rgba(60,60,67,0.5)] text-[14px]">Contact our admissions team for more information</p>
            </Reveal>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  icon: <FiMapPin className="w-5 h-5 text-[#007AFF]" />,
                  iconBg: 'bg-blue-50',
                  title: 'Address',
                  content: '566/6, Bell Road, Society Area, Clement Town, Dehradun, Uttarakhand – 248002',
                },
                {
                  icon: <FiPhone className="w-5 h-5 text-[#34C759]" />,
                  iconBg: 'bg-green-50',
                  title: 'Phone (Admissions)',
                  content: '1800 890 6027 / 1800 270 1280',
                },
                {
                  icon: <FiMail className="w-5 h-5 text-[#FF9500]" />,
                  iconBg: 'bg-orange-50',
                  title: 'Email',
                  content: 'admissions@geu.ac.in',
                },
              ].map((item, idx) => (
                <Reveal key={idx} delay={idx * 100}>
                  <div className="bg-[#f2f2f7] rounded-2xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                    <div className={`w-10 h-10 ${item.iconBg} rounded-xl flex items-center justify-center mb-4`}>
                      {item.icon}
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[rgba(60,60,67,0.4)] mb-2">{item.title}</p>
                    <p className="text-[14px] text-gray-800 font-medium leading-relaxed">{item.content}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Announcements ──────────────────────────────────── */}
        <AnnouncementsSection />

        {/* ── Footer ─────────────────────────────────────────── */}
        <footer className="bg-gray-950 text-gray-500 py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-[#007AFF] flex items-center justify-center">
                    <span className="text-white font-bold text-sm">G</span>
                  </div>
                  <span className="text-white font-bold text-[15px]">GESoM</span>
                </div>
                <p className="text-[13px] leading-relaxed">
                  Graphic Era School of Management — Shaping Future Business Leaders since 2006.
                </p>
                <p className="text-[12px] text-gray-600 mt-3">Where academic excellence meets industry expertise</p>
              </div>

              <div>
                <h4 className="text-white text-[12px] font-semibold mb-4 uppercase tracking-[0.15em]">Quick Links</h4>
                <ul className="space-y-2.5 text-[13px]">
                  <li><Link href="/#programs" className="hover:text-white transition">Programs</Link></li>
                  <li><Link href="/#placements" className="hover:text-white transition">Placements</Link></li>
                  <li><a href="https://apply.geu.ac.in/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Apply Now</a></li>
                </ul>
              </div>

              <div>
                <h4 className="text-white text-[12px] font-semibold mb-4 uppercase tracking-[0.15em]">Connect</h4>
                <div className="flex gap-2.5 mb-5">
                  <a
                    href="https://www.facebook.com/geuofficial/"
                    target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 bg-gray-800 hover:bg-[#007AFF] rounded-full flex items-center justify-center transition group"
                  >
                    <FiTwitter className="w-4 h-4 text-gray-500 group-hover:text-white transition" />
                  </a>
                  <a
                    href="https://www.linkedin.com/school/graphic-era-official"
                    target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 bg-gray-800 hover:bg-[#007AFF] rounded-full flex items-center justify-center transition group"
                  >
                    <FiLinkedin className="w-4 h-4 text-gray-500 group-hover:text-white transition" />
                  </a>
                </div>
                <p className="text-[12px]">admissions@geu.ac.in</p>
                <p className="text-[12px] mt-1">1800 890 6027</p>
              </div>
            </div>

            <div className="border-t border-gray-800/60 pt-7 flex flex-col md:flex-row items-center justify-between gap-3 text-[12px] text-gray-600">
              <p>© 2026 Graphic Era University — Department of Management</p>
              <p>DOMS Portal System</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
