'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
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
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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

      // Redirect based on role
      setTimeout(() => {
        if (result.user.role === 'ADMIN') {
          router.push('/admin/dashboard');
        } else if (result.user.role === 'STUDENT') {
          router.push('/student/dashboard');
        } else if (result.user.role === 'PLACEMENT_COORDINATOR') {
          router.push('/coordinator/dashboard');
        } else if (result.user.role === 'HOD') {
          router.push('/admin/dashboard');
        } else if (result.user.role === 'FACULTY') {
          router.push('/faculty/dashboard');
        } else if (result.user.role === 'TRAINER') {
          router.push('/trainer/dashboard');
        } else {
          router.push('/dashboard');
        }
      }, 500);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Login failed';
      
      if (error.response?.data?.status === 'PENDING') {
        toast.error('Your account is pending admin approval');
      } else if (error.response?.data?.status === 'REJECTED') {
        toast.error('Your account request has been rejected');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8 md:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              DOMS
            </h1>
            <p className="text-gray-800">Student Management Portal</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-900 mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-3 text-gray-700" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white text-gray-900 placeholder-gray-600 transition"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-900 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-3 text-gray-700" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 border-2 border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white text-gray-900 placeholder-gray-600 transition"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-700 hover:text-gray-900"
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center text-gray-800 cursor-pointer hover:text-gray-900">
                <input
                  type="checkbox"
                  className="mr-2 w-4 h-4 rounded border-gray-300"
                />
                Remember me
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-lg transition duration-200 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-700">
                New to DOMS?
              </span>
            </div>
          </div>

          {/* Sign Up Link */}
          <a
            href="https://apply.geu.ac.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full block text-center border border-blue-600 hover:bg-blue-50 text-blue-600 font-semibold py-2.5 rounded-lg transition"
          >
            Apply for Admission
          </a>

          {/* Info Message */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <p>
              <strong>New User?</strong> Click "Apply for Admission" above to register for the program.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-700">
          <p>
            © {new Date().getFullYear()} DOMS. All rights reserved. | Privacy Policy | Terms of
            Service
          </p>
        </div>
      </div>
    </div>
  );
}
