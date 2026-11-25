'use client';

// A department's public page.
//
// Reads the same palette and type as the landing page, so arriving here from
// a card on the front page does not feel like leaving the site. Only what
// the curator has published is here: hidden entries never reach this fetch.

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FiArrowLeft, FiLoader, FiExternalLink, FiPaperclip, FiSlash,
} from 'react-icons/fi';
import {
  DEPARTMENT_CATEGORIES, Department, DepartmentCategory, EntriesByCategory,
} from '@/app/lib/departments';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:4000/api';

export default function DepartmentPage() {
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug || '');

  const [dept, setDept] = useState<Department | null>(null);
  const [categories, setCategories] = useState<DepartmentCategory[]>(DEPARTMENT_CATEGORIES);
  const [entries, setEntries] = useState<EntriesByCategory>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/departments/${encodeURIComponent(slug)}?_=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message || 'This department page does not exist.');
        return;
      }
      const data = await res.json();
      setDept(data.department);
      setCategories(data.categories || DEPARTMENT_CATEGORIES);
      setEntries(data.entries || {});
      setError(null);
    } catch {
      setError('This page could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { if (slug) load(); }, [slug, load]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--paper)]">
        <FiLoader className="h-6 w-6 animate-spin text-[var(--muted)]" />
      </main>
    );
  }

  if (error || !dept) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--paper)] px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bone)] text-[var(--muted)]">
          <FiSlash className="h-7 w-7" />
        </span>
        <h1 className="serif display-sm text-[var(--ink)]">Not here</h1>
        <p className="max-w-sm text-[15px] leading-[1.7] text-[var(--muted)]">{error}</p>
        <Link href="/" className="micro link text-[var(--gold)]">← Back to Graphic Era School of Management</Link>
      </main>
    );
  }

  const withEntries = categories.filter((c) => (entries[c.key] || []).length > 0);

  return (
    <main className="min-h-screen bg-[var(--paper)]">
      {/* ── Cover ── */}
      <header className="relative overflow-hidden border-b border-[var(--line)] bg-[var(--bone)]">
        {dept.coverImageUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dept.coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/45 to-black/25" />
          </>
        )}
        <div className="relative mx-auto max-w-[1320px] px-6 py-16 sm:py-24 lg:px-10 lg:py-32">
          <Link
            href="/"
            className={`micro inline-flex items-center gap-1.5 ${dept.coverImageUrl ? 'text-white/80 hover:text-white' : 'text-[var(--gold)]'}`}
          >
            <FiArrowLeft className="h-3.5 w-3.5" /> Graphic Era School of Management
          </Link>
          <p className={`micro mt-6 ${dept.coverImageUrl ? 'text-white/70' : 'text-[var(--gold)]'}`}>{dept.name}</p>
          <h1 className={`serif display-lg mt-3 max-w-3xl ${dept.coverImageUrl ? 'text-white' : 'text-[var(--ink)]'}`}>
            {dept.title || dept.name}
          </h1>
          {dept.description && (
            <p className={`mt-5 max-w-2xl whitespace-pre-line text-[15px] leading-[1.75] sm:text-[16px] ${dept.coverImageUrl ? 'text-white/85' : 'text-[var(--muted)]'}`}>
              {dept.description}
            </p>
          )}
          {dept.chairHeadName && (
            <p className={`mt-6 text-[13px] ${dept.coverImageUrl ? 'text-white/70' : 'text-[var(--muted)]'}`}>
              Chair head · <span className="font-medium">{dept.chairHeadName}</span>
            </p>
          )}
        </div>
      </header>

      {/* ── What the department has put up ── */}
      <div className="mx-auto max-w-[1320px] px-6 py-16 sm:py-20 lg:px-10 lg:py-28">
        {withEntries.length === 0 ? (
          <p className="py-16 text-center text-[15px] italic text-[var(--muted)]">
            This department has not published anything yet.
          </p>
        ) : (
          <>
            <nav className="mb-12 flex flex-wrap gap-2 border-b border-[var(--line)] pb-8">
              {withEntries.map((c) => (
                <a
                  key={c.key}
                  href={`#${c.key}`}
                  className="rounded-full border border-[var(--line)] px-3.5 py-1.5 text-[12.5px] font-medium text-[var(--ink-soft)] transition hover:bg-[var(--bone)]"
                >
                  {c.label}
                  <span className="ml-1.5 text-[var(--muted)]">{(entries[c.key] || []).length}</span>
                </a>
              ))}
            </nav>

            <div className="space-y-16 sm:space-y-20">
              {withEntries.map((c, ci) => (
                <section key={c.key} id={c.key} className="scroll-mt-24">
                  <div className="mb-8 flex items-baseline gap-4">
                    <span className="num micro text-[var(--gold)]">{String(ci + 1).padStart(2, '0')}</span>
                    <h2 className="serif display-md text-[var(--ink)]">{c.label}</h2>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {(entries[c.key] || []).map((e) => (
                      <article
                        key={e.id}
                        className="flex flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white"
                      >
                        {e.fileKind === 'image' && e.fileUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={e.fileUrl} alt={e.title} className="h-44 w-full object-cover" />
                        )}
                        <div className="flex flex-1 flex-col p-5">
                          <h3 className="serif text-[18px] leading-snug text-[var(--ink)]">{e.title}</h3>
                          {e.details && (
                            <p className="mt-2.5 whitespace-pre-line text-[14px] leading-[1.7] text-[var(--muted)]">
                              {e.details}
                            </p>
                          )}
                          {(e.linkUrl || (e.fileUrl && e.fileKind !== 'image')) && (
                            <div className="mt-4 flex flex-wrap gap-3 border-t border-[var(--line)] pt-3.5">
                              {e.fileUrl && e.fileKind !== 'image' && (
                                <a
                                  href={e.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--ink-soft)] hover:text-[var(--gold)]"
                                >
                                  <FiPaperclip className="h-3.5 w-3.5" />
                                  <span className="max-w-[180px] truncate">{e.fileName || 'Document'}</span>
                                </a>
                              )}
                              {e.linkUrl && (
                                <a
                                  href={e.linkUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--ink-soft)] hover:text-[var(--gold)]"
                                >
                                  <FiExternalLink className="h-3.5 w-3.5" /> Open
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>

      <footer className="border-t border-[var(--line)] bg-[var(--bone)] py-10">
        <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
          <Link href="/" className="micro link text-[var(--gold)]">← Graphic Era School of Management</Link>
        </div>
      </footer>
    </main>
  );
}
