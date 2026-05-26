'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import {
  FiArrowRight,
  FiArrowDown,
  FiBook,
  FiUsers,
  FiBarChart2,
  FiCheckCircle,
  FiTwitter,
  FiLinkedin,
  FiFacebook,
  FiInstagram,
  FiYoutube,
  FiStar,
  FiBriefcase,
  FiMapPin,
  FiPhone,
  FiMail,
  FiHome,
  FiMonitor,
  FiCoffee,
  FiAward,
  FiLayers,
} from 'react-icons/fi';
import AnnouncementsSection from './components/Announcements/AnnouncementsSection';

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      // Force play
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.log('Autoplay was prevented. Error:', error);
        });
      }
    }
  }, []);

  // --- data (unchanged) ---
  const stats = [
    { number: '20+', label: 'Years of Excellence' },
    { number: '25+', label: 'Expert Faculty Members' },
    { number: '10.20L', label: 'Average Package' },
    { number: '29', label: 'Corporate Partners' },
  ];

  const programs = [
    {
      icon: <FiBook className="w-7 h-7" />,
      title: 'MBA Programs',
      description: 'Master of Business Administration',
      programs: [
        'MBA (2 Years)',
        'MBA IMPACT (2 Years)',
        'MBA in AI & Data Science (2 Years)',
      ],
    },
    {
      icon: <FiUsers className="w-7 h-7" />,
      title: 'BBA Programs',
      description: 'Bachelor of Business Administration',
      programs: [
        'Finance/Marketing/HR Specialization',
        'Business Analytics',
        'Entrepreneurship',
        'Aviation Management',
        '+ 4 More Specializations',
      ],
    },
    {
      icon: <FiBarChart2 className="w-7 h-7" />,
      title: 'Ph.D. Programs',
      description: 'Doctoral Research Programs',
      programs: [
        'Ph.D. in Management Studies',
        'Research-Focused Curriculum',
        'Industry Collaboration',
      ],
    },
  ];

  const placements = [
    { name: 'Shreyansh Rohilla', program: 'MBA-Impact', package: '₹10.20 L' },
    { name: 'Vanshika Kakkar', program: 'MBA', package: '₹10.20 L' },
    { name: 'Dikshant Sharma', program: 'MBA', package: '₹15.40 L' },
  ];

  const facilities = [
    { name: 'Seminar Halls', Icon: FiHome },
    { name: 'Lecture Theatres', Icon: FiLayers },
    { name: 'Conference Rooms', Icon: FiBriefcase },
    { name: 'Computer Labs', Icon: FiMonitor },
    { name: 'Library', Icon: FiBook },
    { name: 'Board Rooms', Icon: FiCoffee },
  ];

  const highlights = [
    '20+ Years of Academic Excellence',
    '25+ Expert Faculty Members',
    '100% Placement Record',
    '29 Corporate Partners',
    'Global Industry Recognition',
  ];

  const contacts = [
    {
      Icon: FiMapPin,
      title: 'Address',
      content:
        '566/6, Bell Road, Society Area, Clement Town, Dehradun, Uttarakhand – 248002',
    },
    {
      Icon: FiPhone,
      title: 'Admissions Helpline',
      content: '1800 890 6027 / 1800 270 1280',
    },
    {
      Icon: FiMail,
      title: 'Email',
      content: 'admissions@geu.ac.in',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      {/* ───────────────────────── Navigation ───────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-md bg-[#0c2d5b] flex items-center justify-center text-white font-serif text-lg font-bold shadow-sm">
              G
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-base font-bold tracking-wide text-[#0c2d5b]">
                GESoM
              </span>
              <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                School of Management
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-700">
            <a href="#programs" className="hover:text-[#0c2d5b] transition">
              Programs
            </a>
            <a href="#placements" className="hover:text-[#0c2d5b] transition">
              Placements
            </a>
            <a href="#facilities" className="hover:text-[#0c2d5b] transition">
              Facilities
            </a>
            <a href="#about" className="hover:text-[#0c2d5b] transition">
              About
            </a>
            <a href="#contact" className="hover:text-[#0c2d5b] transition">
              Contact
            </a>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm text-slate-800 hover:text-[#0c2d5b] font-medium transition"
            >
              Login
            </Link>
            <a
              href="https://apply.geu.ac.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2 bg-[#0c2d5b] hover:bg-[#0a2349] text-white text-sm rounded-full font-semibold transition shadow-sm"
            >
              Apply <FiArrowRight size={14} />
            </a>
          </div>
        </div>
      </nav>

      {/* ───────────────────────── Hero ───────────────────────── */}
      <section className="relative h-[92vh] min-h-[600px] bg-[#04122b] overflow-hidden flex items-center">
        <div className="absolute inset-0 w-full h-full">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay={true}
            muted={true}
            loop={true}
            playsInline={true}
            poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 600'%3E%3Crect fill='%23001a33' width='1200' height='600'/%3E%3C/svg%3E"
          >
            <source
              src="https://geu.ac.in/uploads/page_section_attributes/VDd0PpwcgWvddNdkOK823B05H1KhyNeAHiNIAJXO.mp4"
              type="video/mp4"
            />
            <source src="/video.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-br from-[#04122b]/85 via-[#04122b]/65 to-[#04122b]/40" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.15),transparent_50%)]" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 text-xs sm:text-sm uppercase tracking-[0.32em] text-amber-300/90 mb-6">
              <span className="w-10 h-px bg-amber-300/70" />
              Graphic Era School of Management
            </p>
            <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold text-white mb-6 leading-[1.05]">
              Shaping Future
              <br />
              <span className="text-amber-300">Business Leaders</span>
            </h1>
            <p className="text-lg sm:text-xl text-blue-100/90 mb-10 max-w-2xl leading-relaxed">
              Welcome to the Graphic Era School of Management (GESoM) — where
              academic excellence meets industry expertise.
            </p>
            <div className="flex gap-4 flex-wrap">
              <a
                href="https://apply.geu.ac.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3 px-7 py-3.5 bg-amber-400 hover:bg-amber-300 text-[#0c2d5b] rounded-full font-semibold transition shadow-lg shadow-amber-500/20"
              >
                Apply Now
                <FiArrowRight className="transition group-hover:translate-x-1" />
              </a>
              <Link
                href="#programs"
                className="inline-flex items-center gap-3 px-7 py-3.5 border border-white/40 hover:bg-white hover:text-[#0c2d5b] text-white rounded-full font-semibold transition backdrop-blur-sm"
              >
                Explore Programs
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <a
          href="#stats"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-white/70 hover:text-white transition"
        >
          <span className="text-[10px] uppercase tracking-[0.25em]">Scroll</span>
          <FiArrowDown className="animate-bounce" />
        </a>
      </section>

      {/* ───────────────────────── Stats ───────────────────────── */}
      <section id="stats" className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className={`px-4 py-6 text-center ${
                  idx !== stats.length - 1 ? 'md:border-r border-slate-200' : ''
                }`}
              >
                <div className="font-serif text-5xl md:text-6xl font-bold text-[#0c2d5b] mb-3 tracking-tight">
                  {stat.number}
                </div>
                <div className="w-8 h-px bg-amber-400 mx-auto mb-3" />
                <div className="text-xs uppercase tracking-[0.18em] text-slate-600 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── Programs ───────────────────────── */}
      <section id="programs" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-14">
            <p className="text-xs uppercase tracking-[0.32em] text-amber-600 font-semibold mb-3">
              Programs Offered
            </p>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-[#0c2d5b] leading-tight mb-4">
              World-Class Programs
            </h2>
            <p className="text-lg text-slate-600">
              Designed to meet global industry standards and prepare leaders for
              tomorrow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {programs.map((program, idx) => (
              <div
                key={idx}
                className="group relative bg-white border border-slate-200 rounded-2xl p-8 hover:border-[#0c2d5b]/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5 transition-all duration-300"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[#0c2d5b]/5 text-[#0c2d5b] mb-6 group-hover:bg-[#0c2d5b] group-hover:text-white transition">
                  {program.icon}
                </div>
                <h3 className="font-serif text-2xl font-bold text-[#0c2d5b] mb-2">
                  {program.title}
                </h3>
                <p className="text-sm text-slate-500 mb-6 uppercase tracking-wider font-medium">
                  {program.description}
                </p>
                <ul className="space-y-2.5">
                  {program.programs.map((prog, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-slate-700 text-sm"
                    >
                      <FiCheckCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-1" />
                      <span>{prog}</span>
                    </li>
                  ))}
                </ul>
                <div className="absolute top-7 right-7 w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-amber-400 group-hover:border-amber-400 group-hover:text-[#0c2d5b] transition">
                  <FiArrowRight size={16} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

      {/* ───────────────────────── Placements ───────────────────────── */}
      <section id="placements" className="py-24 bg-slate-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(circle_at_1px_1px,#0c2d5b_1px,transparent_0)] [background-size:24px_24px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-14 gap-6">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.32em] text-amber-600 font-semibold mb-3">
                Placements
              </p>
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-[#0c2d5b] leading-tight mb-4 flex items-center gap-3">
                <FiBriefcase className="text-amber-500" />
                100% Placement Record
              </h2>
              <p className="text-lg text-slate-600">
                Our graduates are placed at top multinational companies.
              </p>
            </div>
            <div className="text-sm font-semibold text-[#0c2d5b] uppercase tracking-widest">
              Batch 2025 · Notable Offers
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {placements.map((placement, idx) => (
              <article
                key={idx}
                className="bg-white border border-slate-200 rounded-2xl p-7 hover:shadow-xl hover:shadow-slate-900/5 transition"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#0c2d5b] to-[#1c4a91] ring-4 ring-amber-300/40 flex items-center justify-center text-white font-serif font-bold text-lg">
                    {placement.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 leading-tight">
                      {placement.name}
                    </p>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                      {placement.program}
                    </p>
                  </div>
                </div>
                <div className="border-t border-dashed border-slate-200 pt-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    Package
                  </p>
                  <p className="font-serif text-3xl font-bold text-amber-600">
                    {placement.package}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── Facilities ───────────────────────── */}
      <section id="facilities" className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-14">
            <p className="text-xs uppercase tracking-[0.32em] text-amber-600 font-semibold mb-3">
              Campus Life
            </p>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-[#0c2d5b] leading-tight mb-4">
              World-Class Facilities
            </h2>
            <p className="text-lg text-slate-600">
              State-of-the-art infrastructure to support excellence in learning.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {facilities.map((facility, idx) => {
              const { Icon } = facility;
              return (
                <div
                  key={idx}
                  className="group bg-slate-50 hover:bg-[#0c2d5b] border border-slate-200 hover:border-[#0c2d5b] rounded-xl p-6 text-center transition-all duration-300 cursor-default"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 mb-4 text-[#0c2d5b] group-hover:text-amber-300 transition">
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 group-hover:text-white transition">
                    {facility.name}
                  </h3>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────────────────── About ───────────────────────── */}
      <section id="about" className="bg-[#0c2d5b] text-slate-100 py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(245,158,11,0.12),transparent_55%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-14 items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-amber-300 font-semibold mb-3">
                About Us
              </p>
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
                About GESoM
              </h2>
              <p className="text-lg text-blue-100/90 mb-4 leading-relaxed">
                The Graphic Era School of Management (GESoM) has established
                itself as a hub for nurturing top-tier leadership in the
                corporate world. Recognized among the best in management
                education in India, we continue to redefine learning with our
                innovative and future-focused approach.
              </p>
              <p className="text-lg text-blue-100/80 mb-8 leading-relaxed">
                With over two decades of academic excellence, our faculty
                comprises experienced professors and researchers who are
                committed to developing capable managers and entrepreneurs.
              </p>
              <ul className="space-y-3">
                {highlights.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <FiCheckCircle className="w-5 h-5 text-amber-300 flex-shrink-0" />
                    <span className="text-blue-100">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="absolute -inset-3 bg-amber-300/20 rounded-2xl blur-2xl" />
              <div className="relative bg-white text-slate-900 rounded-2xl p-10 shadow-2xl">
                <FiStar className="w-10 h-10 text-amber-500 mb-5" />
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500 mb-3 font-semibold">
                  Our Tagline
                </p>
                <p className="font-serif text-3xl md:text-4xl font-bold text-[#0c2d5b] leading-tight mb-6">
                  &ldquo;Shaping Future Business Leaders&rdquo;
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Every student at GESoM is equipped with the knowledge, skills,
                  and mindset needed to excel in the dynamic business world and
                  make meaningful contributions to society.
                </p>
                <div className="mt-8 flex items-center gap-3 text-sm font-semibold text-[#0c2d5b]">
                  <FiAward className="text-amber-500" />
                  Established 2006
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── CTA ───────────────────────── */}
      <section className="relative py-20 bg-gradient-to-br from-amber-400 via-amber-300 to-amber-400 text-[#0c2d5b]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs uppercase tracking-[0.32em] font-bold mb-3 text-[#0c2d5b]/80">
            Admissions 2026
          </p>
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Join GESoM Today
          </h2>
          <p className="text-lg md:text-xl mb-10 text-[#0c2d5b]/80 max-w-2xl mx-auto">
            Start your journey to become a future business leader. Apply to our
            programs and transform your career.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="https://apply.geu.ac.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 bg-[#0c2d5b] hover:bg-[#0a2349] text-white font-semibold rounded-full transition shadow-lg"
            >
              Apply Now <FiArrowRight />
            </a>
            <Link
              href="#programs"
              className="inline-flex items-center gap-3 px-8 py-4 border-2 border-[#0c2d5b] text-[#0c2d5b] font-semibold rounded-full hover:bg-[#0c2d5b] hover:text-white transition"
            >
              Explore Programs
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Contact ───────────────────────── */}
      <section id="contact" className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs uppercase tracking-[0.32em] text-amber-600 font-semibold mb-3">
              Reach Out
            </p>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-[#0c2d5b] leading-tight mb-4">
              Get in Touch
            </h2>
            <p className="text-lg text-slate-600">
              Contact our admissions team for more information.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {contacts.map((item, idx) => {
              const { Icon } = item;
              return (
                <div
                  key={idx}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-8 hover:border-[#0c2d5b]/40 hover:shadow-lg transition"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#0c2d5b] text-amber-300 mb-5">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold mb-2">
                    {item.title}
                  </h3>
                  <p className="text-slate-800 leading-relaxed">
                    {item.content}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────────────────── Announcements ───────────────────────── */}
      <AnnouncementsSection />

      {/* ───────────────────────── Footer ───────────────────────── */}
      <footer className="bg-[#04122b] text-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-md bg-amber-400 flex items-center justify-center text-[#0c2d5b] font-serif text-lg font-bold">
                  G
                </div>
                <div>
                  <p className="text-white font-bold text-lg leading-tight">
                    GESoM
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    School of Management
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed max-w-md">
                Graphic Era School of Management — Shaping Future Business
                Leaders since 2006. Where academic excellence meets industry
                expertise.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
                Quick Links
              </h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href="/#programs" className="hover:text-amber-300 transition">
                    Programs
                  </a>
                </li>
                <li>
                  <a href="/#placements" className="hover:text-amber-300 transition">
                    Placements
                  </a>
                </li>
                <li>
                  <a href="/#facilities" className="hover:text-amber-300 transition">
                    Facilities
                  </a>
                </li>
                <li>
                  <a href="/#about" className="hover:text-amber-300 transition">
                    About
                  </a>
                </li>
                <li>
                  <a
                    href="https://apply.geu.ac.in/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-amber-300 transition"
                  >
                    Apply Now
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
                Get in Touch
              </h4>
              <p className="text-sm text-slate-400 mb-2">admissions@geu.ac.in</p>
              <p className="text-sm text-slate-400 mb-5">1800 890 6027</p>
              <div className="flex gap-3">
                <a
                  href="https://www.facebook.com/geuofficial/"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Facebook"
                  className="w-9 h-9 rounded-full border border-slate-700 hover:border-amber-300 hover:text-amber-300 flex items-center justify-center text-slate-300 transition"
                >
                  <FiFacebook size={15} />
                </a>
                <a
                  href="https://www.linkedin.com/school/graphic-era-official"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="LinkedIn"
                  className="w-9 h-9 rounded-full border border-slate-700 hover:border-amber-300 hover:text-amber-300 flex items-center justify-center text-slate-300 transition"
                >
                  <FiLinkedin size={15} />
                </a>
                <a
                  href="https://www.facebook.com/geuofficial/"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Twitter"
                  className="w-9 h-9 rounded-full border border-slate-700 hover:border-amber-300 hover:text-amber-300 flex items-center justify-center text-slate-300 transition"
                >
                  <FiTwitter size={15} />
                </a>
                <a
                  href="https://www.facebook.com/geuofficial/"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Instagram"
                  className="w-9 h-9 rounded-full border border-slate-700 hover:border-amber-300 hover:text-amber-300 flex items-center justify-center text-slate-300 transition"
                >
                  <FiInstagram size={15} />
                </a>
                <a
                  href="https://www.facebook.com/geuofficial/"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="YouTube"
                  className="w-9 h-9 rounded-full border border-slate-700 hover:border-amber-300 hover:text-amber-300 flex items-center justify-center text-slate-300 transition"
                >
                  <FiYoutube size={15} />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm text-slate-500">
            <p>© 2026 Graphic Era School of Management</p>
            <p className="text-xs tracking-wider uppercase">GESoM Portal System</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
