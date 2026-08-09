import type { Metadata } from 'next';
import { FaInstagram, FaFacebookF, FaLinkedinIn } from 'react-icons/fa';
import { FiArrowUpRight } from 'react-icons/fi';

/* ──────────────────────────────────────────────────────────────
   Public social-media links page — /social-media-links
   Standalone, no auth. Matches the GESoM landing design language:
   ink / gold / bone palette · Cormorant Garamond display · Inter body
   ────────────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: 'Connect with GESoM — Social Media',
  description:
    'Follow Graphic Era School of Management on Instagram, Facebook and LinkedIn.',
  openGraph: {
    title: 'Connect with GESoM — Social Media',
    description:
      'Follow Graphic Era School of Management on Instagram, Facebook and LinkedIn.',
  },
};

const LOGO = 'https://geu.ac.in/frontend/assets/images/geu-logo.webp';

type Social = {
  name: string;
  handle: string;
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
  brand: string; // accent shown on hover
};

const SOCIALS: Social[] = [
  {
    name: 'Instagram',
    handle: '@geschoolofmanagement',
    href: 'https://www.instagram.com/geschoolofmanagement/',
    Icon: FaInstagram,
    brand: '#E1306C',
  },
  {
    name: 'Facebook',
    handle: 'GE School of Management',
    href: 'https://www.facebook.com/share/191AetpxWj/?mibextid=wwXIfr',
    Icon: FaFacebookF,
    brand: '#1877F2',
  },
  {
    name: 'LinkedIn',
    handle: 'domsgeu',
    href: 'https://www.linkedin.com/company/domsgeu/',
    Icon: FaLinkedinIn,
    brand: '#0A66C2',
  },
];

export default function SocialMediaLinksPage() {
  return (
    <div className="sml-root min-h-screen w-full flex flex-col items-center justify-center px-5 py-16 sm:py-20">
      {/* soft radial backdrop */}
      <div aria-hidden className="sml-glow" />

      <main className="relative w-full max-w-[560px]">
        {/* ── Brand header ── */}
        <header className="flex flex-col items-center text-center">
          <img
            src={LOGO}
            alt="Graphic Era University"
            className="h-12 sm:h-14 w-auto object-contain"
          />
          <p className="micro mt-7 text-[var(--gold)]">
            Graphic Era School of Management
          </p>
          <div className="mt-5 h-px w-10 bg-[var(--gold)]/60" />
          <h1 className="serif mt-6 text-[38px] sm:text-[46px] leading-[1.05] font-medium text-[var(--ink)]">
            Connect with us
          </h1>
          <p className="mt-4 max-w-[380px] text-[14.5px] leading-relaxed text-[var(--muted)]">
            Follow along for campus stories, achievements and everything
            happening at GESoM.
          </p>
        </header>

        {/* ── Links ── */}
        <nav className="mt-11 sm:mt-12 flex flex-col gap-3.5">
          {SOCIALS.map(({ name, handle, href, Icon, brand }) => (
            <a
              key={name}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="sml-card group"
              style={{ ['--brand' as string]: brand }}
            >
              <span className="sml-icon">
                <Icon className="h-5 w-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[15.5px] font-semibold text-[var(--ink)] leading-tight">
                  {name}
                </span>
                <span className="block truncate text-[13px] text-[var(--muted)]">
                  {handle}
                </span>
              </span>
              <FiArrowUpRight className="sml-arrow h-5 w-5 text-[var(--muted)]" />
            </a>
          ))}
        </nav>

        {/* ── Footer ── */}
        <footer className="mt-14 text-center">
          <div className="mx-auto h-px w-full max-w-[220px] bg-[var(--line)]" />
          <p className="mt-6 text-[12px] text-[var(--muted)]">
            © {new Date().getFullYear()} Graphic Era School of Management
          </p>
        </footer>
      </main>

      {/* Scoped styles — mirror the GESoM landing palette */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .sml-root {
          --ink: #0e1014;
          --muted: #6b7180;
          --line: rgba(14, 16, 20, 0.10);
          --bone: #fafaf7;
          --paper: #ffffff;
          --gold: #a07a3b;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(120% 80% at 50% -10%, #ffffff 0%, var(--bone) 45%, #f1efe9 100%);
          color: var(--ink);
          font-family: var(--font-inter), 'Inter', system-ui, -apple-system, 'Helvetica Neue', sans-serif;
          letter-spacing: -0.005em;
          -webkit-font-smoothing: antialiased;
        }
        .sml-root .serif {
          font-family: var(--font-cormorant), 'Cormorant Garamond', 'EB Garamond', Georgia, 'Times New Roman', serif;
          letter-spacing: -0.01em;
        }
        .sml-root .micro {
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          font-weight: 500;
        }
        .sml-glow {
          position: absolute;
          top: -160px;
          left: 50%;
          transform: translateX(-50%);
          width: 520px;
          height: 520px;
          background: radial-gradient(circle, rgba(160,122,59,0.12) 0%, rgba(160,122,59,0) 68%);
          pointer-events: none;
        }
        .sml-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 18px;
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 18px;
          box-shadow: 0 1px 3px rgba(14,16,20,0.04);
          transition: transform 0.28s cubic-bezier(0.2,0.7,0.2,1),
            box-shadow 0.28s ease, border-color 0.28s ease;
          will-change: transform;
        }
        .sml-card:hover {
          transform: translateY(-3px);
          border-color: color-mix(in srgb, var(--brand) 45%, var(--line));
          box-shadow: 0 14px 34px rgba(14,16,20,0.10), 0 3px 8px rgba(14,16,20,0.05);
        }
        .sml-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 46px;
          width: 46px;
          flex: none;
          border-radius: 14px;
          background: var(--bone);
          color: var(--ink);
          transition: background 0.28s ease, color 0.28s ease, transform 0.28s ease;
        }
        .sml-card:hover .sml-icon {
          background: var(--brand);
          color: #ffffff;
          transform: scale(1.04);
        }
        .sml-arrow {
          flex: none;
          transition: transform 0.28s cubic-bezier(0.2,0.7,0.2,1), color 0.28s ease;
        }
        .sml-card:hover .sml-arrow {
          color: var(--ink);
          transform: translate(2px, -2px);
        }
        @media (prefers-reduced-motion: reduce) {
          .sml-card, .sml-icon, .sml-arrow { transition: none; }
          .sml-card:hover { transform: none; }
        }
      `,
        }}
      />
    </div>
  );
}
