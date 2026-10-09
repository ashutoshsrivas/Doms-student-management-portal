'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { FiEye, FiEyeOff, FiFileText, FiLock, FiMail } from 'react-icons/fi';
import examsApi from '../lib/api';
import { getToken, saveSession } from '../lib/session';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next');
  const target = next && next.startsWith('/exams') ? next : '/exams';

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  // Already signed in to the portal? Go straight in.
  useEffect(() => {
    if (getToken()) router.replace(target);
  }, [router, target]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) {
      toast.error('Enter your email and password');
      return;
    }
    try {
      setBusy(true);
      const { data } = await examsApi.post('/exams/login', {
        email: form.email.trim(),
        password: form.password,
      });
      saveSession(data.token, data.refreshToken, data.user);
      toast.success(`Welcome, ${data.user?.firstName || 'there'}`);
      router.replace(target);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
            <FiFileText className="h-6 w-6" />
          </span>
          <h1 className="mt-3 text-2xl font-bold text-white">Exams Portal</h1>
          <p className="mt-1 text-sm text-slate-400">Question banks and question papers</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-800/60 p-6 shadow-xl">
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-semibold text-slate-300">Email</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@geu.ac.in"
                className="w-full rounded-lg border border-white/10 bg-slate-900/70 py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-amber-400/60 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-semibold text-slate-300">Password</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="w-full rounded-lg border border-white/10 bg-slate-900/70 py-2.5 pl-9 pr-10 text-sm text-white placeholder-slate-500 focus:border-amber-400/60 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="text-center text-xs text-slate-500">
            Use the same email and password as your institute account. Faculty and staff only.
          </p>
        </form>
      </div>
    </div>
  );
}

export default function ExamsLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-900 text-sm text-slate-400">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
