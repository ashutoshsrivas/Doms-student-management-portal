'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import {
  FiArrowRight,
  FiBook,
  FiUsers,
  FiBarChart2,
  FiCheckCircle,
  FiGithub,
  FiTwitter,
  FiLinkedin,
  FiStar,
  FiBriefcase,
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

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-blue-600">GEU</h1>
            <p className="text-xs text-gray-600">Management Department</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-gray-800 hover:text-gray-900 font-medium transition"
            >
              Login
            </Link>
            <a
              href="https://apply.geu.ac.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
            >
              Apply
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section with Video Background */}
      <section className="relative h-screen bg-black overflow-hidden flex items-center">
        {/* Video Background */}
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
            <source src="https://geu.ac.in/uploads/page_section_attributes/VDd0PpwcgWvddNdkOK823B05H1KhyNeAHiNIAJXO.mp4" type="video/mp4" />
            <source src="/video.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/70"></div>
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-3xl">
            <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Shaping Future Business Leaders
            </h1>
            <p className="text-2xl text-blue-100 mb-8">
              Welcome to the Graphic Era School of Management (GESoM) - where academic excellence meets industry expertise.
            </p>
            <div className="flex gap-4 flex-wrap">
              <a
                href="https://apply.geu.ac.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition text-lg"
              >
                Apply Now <FiArrowRight />
              </a>
              <Link
                href="#programs"
                className="flex items-center gap-2 px-8 py-4 border-2 border-white hover:bg-white hover:text-blue-600 text-white rounded-lg font-semibold transition text-lg"
              >
                Explore Programs
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Department Stats */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { number: '20+', label: 'Years of Excellence' },
              { number: '25+', label: 'Expert Faculty Members' },
              { number: '10.20L', label: 'Average Package' },
              { number: '29', label: 'Corporate Partners' },
            ].map((stat, idx) => (
              <div key={idx} className="text-center p-6 bg-white rounded-lg shadow-sm hover:shadow-lg transition">
                <div className="text-4xl font-bold text-blue-600 mb-2">{stat.number}</div>
                <div className="text-gray-700 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Programs Offered */}
      <section id="programs" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              World-Class Programs
            </h2>
            <p className="text-xl text-gray-600">
              Designed to meet global industry standards and prepare leaders for tomorrow
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <FiBook className="w-8 h-8" />,
                title: 'MBA Programs',
                description: 'Master of Business Administration',
                programs: ['MBA (2 Years)', 'MBA IMPACT (2 Years)', 'MBA in AI & Data Science (2 Years)'],
              },
              {
                icon: <FiUsers className="w-8 h-8" />,
                title: 'BBA Programs',
                description: 'Bachelor of Business Administration',
                programs: ['Finance/Marketing/HR Specialization', 'Business Analytics', 'Entrepreneurship', 'Aviation Management', '+ 4 More Specializations'],
              },
              {
                icon: <FiBarChart2 className="w-8 h-8" />,
                title: 'Ph.D. Programs',
                description: 'Doctoral Research Programs',
                programs: ['Ph.D. in Management Studies', 'Research-Focused Curriculum', 'Industry Collaboration'],
              },
            ].map((program, idx) => (
              <div key={idx} className="bg-white rounded-lg border-2 border-gray-200 p-8 hover:border-blue-400 transition hover:shadow-lg">
                <div className="text-blue-600 mb-4 text-3xl">{program.icon}</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{program.title}</h3>
                <p className="text-gray-600 mb-6">{program.description}</p>
                <ul className="space-y-2">
                  {program.programs.map((prog, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700">
                      <FiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{prog}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Placements & Recruiters */}
      <section id="placements" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-2">
              <FiBriefcase className="text-blue-600" />
              100% Placement Record
            </h2>
            <p className="text-xl text-gray-600">
              Our graduates are placed at top multinational companies
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-8 border-l-4 border-blue-600">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Notable Placements (Batch 2025)</h3>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { name: 'Shreyansh Rohilla', program: 'MBA-Impact', package: '₹10.20 L' },
                { name: 'Vanshika Kakkar', program: 'MBA', package: '₹10.20 L' },
                { name: 'Dikshant Sharma', program: 'MBA', package: '₹15.40 L' },
              ].map((placement, idx) => (
                <div key={idx} className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full"></div>
                    <div>
                      <p className="font-semibold text-gray-900">{placement.name}</p>
                      <p className="text-sm text-gray-600">{placement.program}</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-green-600">{placement.package}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Facilities Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              World-Class Facilities
            </h2>
            <p className="text-xl text-gray-600">
              State-of-the-art infrastructure to support excellence in learning
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: 'Seminar Halls', icon: '🏛️' },
              { name: 'Lecture Theatres', icon: '🎓' },
              { name: 'Conference Rooms', icon: '💼' },
              { name: 'Computer Labs', icon: '💻' },
              { name: 'Library', icon: '📚' },
              { name: 'Board Rooms', icon: '🤝' },
            ].map((facility, idx) => (
              <div key={idx} className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-8 text-center hover:shadow-lg transition border border-blue-200">
                <div className="text-5xl mb-4">{facility.icon}</div>
                <h3 className="font-semibold text-gray-900">{facility.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About GESoM */}
      <section className="bg-gradient-to-r from-blue-50 to-indigo-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                About GESoM
              </h2>
              <p className="text-lg text-gray-700 mb-4">
                The Graphic Era School of Management (GESoM) has established itself as a hub for nurturing top-tier leadership in the corporate world. Recognized among the best in management education in India, we continue to redefine learning with our innovative and future-focused approach.
              </p>
              <p className="text-lg text-gray-700 mb-6">
                With over two decades of academic excellence, our faculty comprises experienced professors and researchers who are committed to developing capable managers and entrepreneurs.
              </p>
              <div className="space-y-3">
                {[
                  '✓ 20+ Years of Academic Excellence',
                  '✓ 25+ Expert Faculty Members',
                  '✓ 100% Placement Record',
                  '✓ 29 Corporate Partners',
                  '✓ Global Industry Recognition',
                ].map((item, idx) => (
                  <p key={idx} className="text-gray-700 font-medium">{item}</p>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-8">
              <FiStar className="w-12 h-12 text-yellow-500 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Tagline</h3>
              <p className="text-3xl font-bold text-blue-600 italic">
                "Shaping Future Business Leaders"
              </p>
              <p className="text-gray-600 mt-6">
                Every student at GESoM is equipped with the knowledge, skills, and mindset needed to excel in the dynamic business world and make meaningful contributions to society.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-4">Join GESoM Today</h2>
          <p className="text-xl mb-8 text-blue-100">
            Start your journey to become a future business leader. Apply to our programs and transform your career.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="https://apply.geu.ac.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-gray-100 transition"
            >
              Apply Now
            </a>
            <Link
              href="#programs"
              className="inline-block px-8 py-4 border-2 border-white text-white font-bold rounded-lg hover:bg-blue-700 transition"
            >
              Explore Programs
            </Link>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Get in Touch</h2>
            <p className="text-gray-600">Contact our admissions team for more information</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Address',
                content: '566/6, Bell Road, Society Area, Clement Town, Dehradun, Uttarakhand – 248002',
              },
              {
                title: 'Phone (Admissions)',
                content: '1800 890 6027 / 1800 270 1280',
              },
              {
                title: 'Email',
                content: 'admissions@geu.ac.in',
              },
            ].map((item, idx) => (
              <div key={idx} className="bg-white rounded-lg p-6 text-center shadow-sm hover:shadow-lg transition">
                <h3 className="font-semibold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-700">{item.content}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Announcements Section */}
      <AnnouncementsSection />

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div>
              <h3 className="text-white font-bold text-lg mb-4">GESoM</h3>
              <p className="text-sm leading-relaxed">
                Graphic Era School of Management - Shaping Future Business Leaders since 2006.
              </p>
              <p className="text-xs text-gray-400 mt-4">
                Where academic excellence meets industry expertise
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/#programs" className="hover:text-white transition">Programs</a></li>
                <li><a href="/#placements" className="hover:text-white transition">Placements</a></li>
                <li><a href="https://apply.geu.ac.in/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Apply Now</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Follow Us</h4>
              <div className="flex gap-4 mb-6">
                <a href="https://www.facebook.com/geuofficial/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition" title="Facebook">
                  <FiTwitter size={20} />
                </a>
                <a href="https://www.linkedin.com/school/graphic-era-official" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition" title="LinkedIn">
                  <FiLinkedin size={20} />
                </a>
              </div>
              <p className="text-xs text-gray-400">admissions@geu.ac.in</p>
              <p className="text-xs text-gray-400 mt-2">1800 890 6027</p>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p className="mb-2">
              © 2026 Graphic Era University - Department of Management
            </p>
            <p className="text-xs text-gray-500">
              DOMS Portal System
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
