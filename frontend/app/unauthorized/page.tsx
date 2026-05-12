'use client';

import Link from 'next/link';
import { FiLock, FiArrowLeft } from 'react-icons/fi';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-lg shadow-xl p-8 md:p-10">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="bg-red-100 p-4 rounded-full">
              <FiLock className="w-12 h-12 text-red-600" />
            </div>
          </div>

          {/* Header */}
          <h1 className="text-3xl font-bold text-gray-800 mb-3">
            Access Denied
          </h1>
          <p className="text-gray-600 text-lg mb-6">
            You don&apos;t have permission to access this page.
          </p>

          {/* Message */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 text-left">
            <p className="text-red-800 text-sm">
              This page requires specific permissions that your current role does
              not have. If you believe this is an error, please contact your
              administrator.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="w-full inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/"
              className="w-full inline-flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-lg transition"
            >
              <FiArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>

        {/* Support */}
        <div className="text-center mt-6 text-sm text-gray-600">
          <p>
            Need help?{' '}
            <Link href="/support" className="text-blue-600 hover:underline">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
