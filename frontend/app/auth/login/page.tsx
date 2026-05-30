'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowLeft } from 'react-icons/fi';
import useAuthStore from '@/app/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const result = await login(formData.email, formData.password);
      toast.success('Login successful!');

      const roleRoutes: Record<string, string> = {
        ADMIN: '/admin/dashboard',
        HOD: '/admin/dashboard',
        STUDENT: '/student/dashboard',
        PLACEMENT_COORDINATOR: '/coordinator/dashboard',
        COORDINATOR: '/coordinator/dashboard',
        FACULTY: '/faculty/dashboard',
        CHAIR_HEAD: '/faculty/dashboard',
        MENTOR: '/faculty/dashboard',
        TRAINER: '/trainer/dashboard',
      };
      // Fallback to /profile (which exists for every role) instead of the
      // bare /dashboard which is a 404.
      router.push(roleRoutes[result.user.role] || '/profile');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; status?: string } }; message?: string };
      const errorMessage = err.response?.data?.message || err.message || 'Login failed';

      if (err.response?.data?.status === 'PENDING') {
        toast.error('Your account is pending admin approval');
      } else if (err.response?.data?.status === 'REJECTED') {
        toast.error('Your account request has been rejected');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center p-4">
      {/* Back to home */}
      <Link
        href="/"
        className="fixed top-5 left-5 flex items-center gap-1.5 text-[13px] font-medium text-[rgba(60,60,67,0.6)] hover:text-[#007AFF] transition-colors group"
      >
        <FiArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-150" />
        Home
      </Link>

      <div className="w-full max-w-sm animate-slide-up">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-[20px] bg-[#007AFF] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200/60">
            <span className="text-white font-bold text-2xl tracking-tight">G</span>
          </div>
          <h1 className="text-[28px] font-bold text-gray-900 tracking-tight leading-tight">GESoM</h1>
          <p className="text-sm text-[rgba(60,60,67,0.55)] mt-1 font-medium">Graphic Era School of Management</p>
          <p className="text-xs text-[rgba(60,60,67,0.45)] font-medium">Student Management Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-[rgba(60,60,67,0.07)] px-7 py-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-[13px] font-semibold text-gray-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-[#f2f2f7] rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 text-gray-900 placeholder-gray-400 text-sm transition-all"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-[13px] font-semibold text-gray-700">
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-[12px] text-[#007AFF] font-medium hover:text-blue-700 transition-colors"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-11 py-3 bg-[#f2f2f7] rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 text-gray-900 placeholder-gray-400 text-sm transition-all"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#007AFF] hover:bg-[#0071E3] active:bg-[#0062CC] disabled:bg-[#007AFF]/50 text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm mt-1 shadow-sm shadow-blue-200"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-[rgba(60,60,67,0.1)]" />
            <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">New to GESoM?</span>
            <div className="flex-1 h-px bg-[rgba(60,60,67,0.1)]" />
          </div>

          {/* Apply link */}
          <a
            href="https://apply.geu.ac.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full block text-center border border-[#007AFF] text-[#007AFF] hover:bg-[#007AFF]/5 active:bg-[#007AFF]/10 font-semibold py-3 rounded-xl transition text-sm"
          >
            Apply for Admission
          </a>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-[11px] text-gray-400">
          © {new Date().getFullYear()} GESoM · Privacy · Terms of Service
        </p>
      </div>
    </div>
  );
}
