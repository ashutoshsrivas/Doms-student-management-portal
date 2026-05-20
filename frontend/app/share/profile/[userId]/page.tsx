'use client';

// Public, unauthenticated student profile view.
// Linked from the "Create Shareable Link" button on the admin profile page.
// Branded for Graphic Era deemed-to-be University + GESoM.
// Reads /api/public/profile/:userId — refuses non-students at the backend.

import { useEffect, useState, use } from 'react';
import Image from 'next/image';
import { FiMail, FiPhone, FiLinkedin, FiGithub, FiGlobe, FiAward, FiBriefcase, FiBookOpen, FiCheckCircle, FiUser, FiHeart, FiTarget, FiAlertCircle } from 'react-icons/fi';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface PublicProfileResponse {
  user: {
    id: string;
    firstName: string;
    lastName: string | null;
    email?: string;
    phoneNumber?: string;
    department?: string;
    registrationNumber?: string;
    profileImage?: string;
  };
  session: {
    id: string;
    name: string;
    startDate?: string;
    endDate?: string;
  } | null;
  profile: Record<string, any> | null;
}

const arrFmt = (v: any): string[] => {
  if (!v) return [];
  if (Array.isArray(v)) {
    return v
      .map((x) => {
        if (typeof x === 'string') return x;
        if (x && typeof x === 'object') return x.name || x.title || x.label || x.skill || x.value || JSON.stringify(x);
        return String(x ?? '');
      })
      .filter(Boolean);
  }
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? arrFmt(parsed) : [v];
    } catch {
      return [v];
    }
  }
  return [];
};

const objArr = (v: any): Array<Record<string, any>> => {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter((x) => x && typeof x === 'object');
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p.filter((x) => x && typeof x === 'object') : [];
    } catch {
      return [];
    }
  }
  return [];
};

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
      <div className="flex items-center gap-3 mb-4 border-b border-gray-200 pb-3">
        <div className="text-[#8B1538]">{icon}</div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      </div>
      <div className="text-gray-800">{children}</div>
    </section>
  );
}

function Chips({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-gray-500 italic">Not provided.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((s, i) => (
        <span key={i} className="px-3 py-1 bg-[#FEF2F4] text-[#8B1538] border border-[#F5D5DC] rounded-full text-sm font-medium">
          {s}
        </span>
      ))}
    </div>
  );
}

export default function PublicProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const [data, setData] = useState<PublicProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API_BASE}/public/profile/${userId}`, { cache: 'no-store' });
        if (!r.ok) {
          if (r.status === 404) {
            setError('Profile not available.');
          } else {
            setError('Failed to load profile.');
          }
          return;
        }
        const j = (await r.json()) as PublicProfileResponse;
        setData(j);
      } catch (e) {
        console.error(e);
        setError('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-gray-300 border-t-[#8B1538] rounded-full animate-spin mb-3" />
          <p className="text-gray-600">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <BrandedHeader />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center max-w-md">
            <FiAlertCircle className="mx-auto text-[#8B1538] mb-3" size={40} />
            <h1 className="text-xl font-bold text-gray-900">Profile not available</h1>
            <p className="text-gray-600 mt-2">{error || 'The profile you are looking for is unavailable or has been removed.'}</p>
          </div>
        </main>
        <BrandedFooter />
      </div>
    );
  }

  const u = data.user;
  const p = data.profile || {};
  const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim();
  const initials = `${u.firstName?.charAt(0) || ''}${u.lastName?.charAt(0) || ''}`.toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <BrandedHeader />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
        {/* Identity header */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-shrink-0">
              {u.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u.profileImage} alt={fullName} className="w-32 h-32 rounded-lg object-cover border-2 border-gray-200" />
              ) : (
                <div className="w-32 h-32 rounded-lg bg-gradient-to-br from-[#8B1538] to-[#6B0E26] text-white flex items-center justify-center text-4xl font-bold">
                  {initials || '?'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-gray-900">{fullName || 'Student'}</h1>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
                {u.registrationNumber && (
                  <span><span className="font-semibold">Reg. No.:</span> {u.registrationNumber}</span>
                )}
                {u.department && (
                  <span><span className="font-semibold">Department:</span> {u.department}</span>
                )}
                {data.session?.name && (
                  <span><span className="font-semibold">Session:</span> {data.session.name}</span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {u.email && (
                  <a href={`mailto:${u.email}`} className="inline-flex items-center gap-1.5 text-[#8B1538] hover:underline">
                    <FiMail size={14} /> {u.email}
                  </a>
                )}
                {u.phoneNumber && (
                  <span className="inline-flex items-center gap-1.5 text-gray-700">
                    <FiPhone size={14} /> {u.phoneNumber}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* About / Career Objective */}
        {(p.aboutMe || p.careerObjective) && (
          <Section icon={<FiUser size={20} />} title="About">
            {p.careerObjective && (
              <div className="mb-3">
                <h3 className="font-semibold text-gray-900 mb-1">Career Objective</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{p.careerObjective}</p>
              </div>
            )}
            {p.aboutMe && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">About Me</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{p.aboutMe}</p>
              </div>
            )}
          </Section>
        )}

        {/* Skills + Interests */}
        {(arrFmt(p.skills).length > 0 || arrFmt(p.interests).length > 0 || p.coScholasticExpertise) && (
          <Section icon={<FiTarget size={20} />} title="Skills & Interests">
            {arrFmt(p.skills).length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Skills</h3>
                <Chips items={arrFmt(p.skills)} />
              </div>
            )}
            {arrFmt(p.interests).length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Interests</h3>
                <Chips items={arrFmt(p.interests)} />
              </div>
            )}
            {p.coScholasticExpertise && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Co-Scholastic Expertise</h3>
                <p className="text-gray-700">{p.coScholasticExpertise}</p>
                {p.coScholasticDescription && (
                  <p className="text-gray-600 text-sm mt-1 whitespace-pre-wrap">{p.coScholasticDescription}</p>
                )}
              </div>
            )}
          </Section>
        )}

        {/* Work Experience */}
        {objArr(p.workExperiences).length > 0 && (
          <Section icon={<FiBriefcase size={20} />} title="Work Experience">
            <div className="space-y-4">
              {objArr(p.workExperiences).map((w, i) => (
                <div key={i} className="border-l-4 border-[#8B1538] pl-4">
                  <div className="font-semibold text-gray-900">
                    {w.position || w.title || w.role || 'Role'}
                    {w.company && <span className="text-gray-700"> · {w.company}</span>}
                  </div>
                  {w.duration && <div className="text-sm text-gray-600">{w.duration}</div>}
                  {w.description && <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{w.description}</p>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Projects */}
        {objArr(p.projects).length > 0 && (
          <Section icon={<FiBookOpen size={20} />} title="Projects">
            <div className="space-y-4">
              {objArr(p.projects).map((proj, i) => (
                <div key={i} className="border-l-4 border-[#8B1538] pl-4">
                  <div className="font-semibold text-gray-900">{proj.title || proj.name || 'Project'}</div>
                  {proj.description && <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{proj.description}</p>}
                  {proj.link && (
                    <a href={proj.link} target="_blank" rel="noopener noreferrer" className="text-sm text-[#8B1538] hover:underline mt-1 inline-block">
                      View project ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Achievements */}
        {objArr(p.achievements).length > 0 && (
          <Section icon={<FiAward size={20} />} title="Achievements">
            <ul className="space-y-2">
              {objArr(p.achievements).map((a, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-[#8B1538] mt-0.5">✓</span>
                  <div className="text-gray-800">
                    <div className="font-medium">{a.title || a.name || a.label || 'Achievement'}</div>
                    {a.description && <p className="text-sm text-gray-700 whitespace-pre-wrap">{a.description}</p>}
                    {a.year && <p className="text-xs text-gray-500">{a.year}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Certifications */}
        {objArr(p.certifications).length > 0 && (
          <Section icon={<FiCheckCircle size={20} />} title="Certifications">
            <ul className="space-y-2">
              {objArr(p.certifications).map((c, i) => (
                <li key={i} className="text-gray-800">
                  <div className="font-medium">{c.title || c.name || 'Certification'}</div>
                  {c.issuer && <p className="text-sm text-gray-600">{c.issuer}</p>}
                  {c.year && <p className="text-xs text-gray-500">{c.year}</p>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Positions of Responsibility */}
        {objArr(p.positionsOfResponsibility).length > 0 && (
          <Section icon={<FiUser size={20} />} title="Positions of Responsibility">
            <ul className="space-y-2">
              {objArr(p.positionsOfResponsibility).map((pos, i) => (
                <li key={i} className="text-gray-800">
                  <div className="font-medium">{pos.title || pos.role || pos.position || 'Position'}</div>
                  {pos.organization && <p className="text-sm text-gray-600">{pos.organization}</p>}
                  {pos.description && <p className="text-sm text-gray-700 whitespace-pre-wrap">{pos.description}</p>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Online presence */}
        {(p.linkedin || p.github || p.portfolio || p.coursera || arrFmt(p.otherLinks).length > 0) && (
          <Section icon={<FiGlobe size={20} />} title="Online Presence">
            <div className="space-y-2 text-sm">
              {p.linkedin && (
                <a href={p.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#8B1538] hover:underline">
                  <FiLinkedin /> {p.linkedin}
                </a>
              )}
              {p.github && (
                <a href={p.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#8B1538] hover:underline">
                  <FiGithub /> {p.github}
                </a>
              )}
              {p.portfolio && (
                <a href={p.portfolio} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#8B1538] hover:underline">
                  <FiGlobe /> Portfolio: {p.portfolio}
                </a>
              )}
              {p.coursera && (
                <a href={p.coursera} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#8B1538] hover:underline">
                  <FiGlobe /> Coursera: {p.coursera}
                </a>
              )}
              {arrFmt(p.otherLinks).map((l, i) => (
                <a key={i} href={l} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#8B1538] hover:underline">
                  <FiGlobe /> {l}
                </a>
              ))}
            </div>
          </Section>
        )}

        {/* Additional */}
        {(arrFmt(p.languagesKnown).length > 0 || arrFmt(p.hobbies).length > 0 || arrFmt(p.strengths).length > 0) && (
          <Section icon={<FiHeart size={20} />} title="Additional Information">
            {arrFmt(p.languagesKnown).length > 0 && (
              <div className="mb-3">
                <h3 className="font-semibold text-gray-900 mb-1">Languages</h3>
                <Chips items={arrFmt(p.languagesKnown)} />
              </div>
            )}
            {arrFmt(p.hobbies).length > 0 && (
              <div className="mb-3">
                <h3 className="font-semibold text-gray-900 mb-1">Hobbies</h3>
                <Chips items={arrFmt(p.hobbies)} />
              </div>
            )}
            {arrFmt(p.strengths).length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Strengths</h3>
                <Chips items={arrFmt(p.strengths)} />
              </div>
            )}
          </Section>
        )}

        {/* Empty profile fallback */}
        {!data.profile && (
          <Section icon={<FiAlertCircle size={20} />} title="No profile information yet">
            <p className="text-gray-600">
              This student has not yet filled in their profile details.
            </p>
          </Section>
        )}

        {/* Disclaimer */}
        <div className="mt-8 p-5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
          <p className="font-semibold mb-1">Note</p>
          <p>
            The information and data on this page is uploaded by the students and
            Graphic Era deemed to be University does not take any responsibility of this data.
          </p>
        </div>
      </main>

      <BrandedFooter />
    </div>
  );
}

function BrandedHeader() {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
        <div className="flex-shrink-0">
          {/* Logo lives in /public/branding/geu-logo.webp */}
          <Image
            src="/branding/geu-logo.webp"
            alt="Graphic Era deemed to be University"
            width={250}
            height={60}
            priority
            className="h-12 w-auto"
          />
        </div>
        <div className="border-l border-gray-300 pl-4 flex-1 min-w-0">
          <p className="text-lg font-bold text-[#8B1538] leading-tight">
            Graphic Era School of Management <span className="text-gray-500 font-normal text-sm">(GESoM)</span>
          </p>
          <p className="text-xs text-gray-600">Student Profile · Department of Management Studies</p>
        </div>
      </div>
    </header>
  );
}

function BrandedFooter() {
  return (
    <footer className="bg-[#8B1538] text-white mt-12">
      <div className="max-w-5xl mx-auto px-4 py-6 text-center text-sm">
        <p className="font-semibold">Graphic Era deemed to be University, Dehradun</p>
        <p className="opacity-80 mt-1">Graphic Era School of Management (GESoM)</p>
        <p className="opacity-70 mt-3 text-xs">
          © {new Date().getFullYear()} Graphic Era deemed to be University. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
