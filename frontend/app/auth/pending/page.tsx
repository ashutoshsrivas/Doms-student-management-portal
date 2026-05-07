'use client';

import Link from 'next/link';
import { FiCheckCircle, FiClock, FiArrowLeft } from 'react-icons/fi';

export default function PendingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8 md:p-10 text-center">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="bg-amber-100 p-4 rounded-full">
              <FiClock className="w-12 h-12 text-amber-600" />
            </div>
          </div>

          {/* Header */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">
            Account Pending Review
          </h1>
          <p className="text-gray-700 text-lg mb-6">
            Your account has been successfully created!
          </p>

          {/* Message */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8 text-left">
            <h2 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
              <FiCheckCircle className="w-5 h-5" />
              What happens next?
            </h2>
            <ul className="space-y-3 text-sm text-amber-800">
              <li className="flex gap-3">
                <span className="font-bold text-amber-600 flex-shrink-0">1</span>
                <span>
                  Our admin team will review your account and verify your
                  information
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-amber-600 flex-shrink-0">2</span>
                <span>
                  You'll be assigned an appropriate role based on your profile
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-amber-600 flex-shrink-0">3</span>
                <span>
                  You'll receive an email notification once your account is
                  approved
                </span>
              </li>
            </ul>
          </div>

          {/* Timeline */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <p className="text-sm text-gray-700 mb-4">
              <strong>Approval Timeline:</strong>
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm text-gray-700">
                  Account Created: Now
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                <span className="text-sm text-gray-700">
                  Pending Review: 1-2 business days
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-gray-300 rounded-full" />
                <span className="text-sm text-gray-700">
                  Approval & Notification: Soon
                </span>
              </div>
            </div>
          </div>

          {/* Information Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 text-left text-sm">
            <p className="text-blue-800">
              <strong>Email Verification:</strong> Make sure to check your email
              (including spam folder) for the approval notification. You'll
              receive all important updates there.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              href="/auth/login"
              className="w-full inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition"
            >
              Return to Login
            </Link>
            <Link
              href="/"
              className="w-full inline-flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-lg transition"
            >
              <FiArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>

          {/* FAQ Section */}
          <div className="mt-10 pt-8 border-t border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-4">
              Frequently Asked Questions
            </h3>
            <div className="space-y-4 text-left text-sm">
              <div>
                <p className="font-medium text-gray-700 mb-1">
                  How long does approval take?
                </p>
                <p className="text-gray-600">
                  Typically 1-2 business days. High volume periods may take
                  longer.
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-700 mb-1">
                  What if my account is rejected?
                </p>
                <p className="text-gray-600">
                  You'll receive an email with the reason. You can contact
                  support to appeal or create a new account.
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-700 mb-1">
                  Can I log in before approval?
                </p>
                <p className="text-gray-600">
                  No, you'll only be able to log in after admin approval.
                </p>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-700">
              Need help?{' '}
              <Link href="/support" className="text-blue-600 hover:underline">
                Contact Support
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-600">
          <p>© {new Date().getFullYear()} DOMS. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
