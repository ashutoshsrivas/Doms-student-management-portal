'use client';

import Link from 'next/link';
import { FiCheckCircle, FiClock, FiArrowLeft } from 'react-icons/fi';

export default function PendingPage() {
  return (
    <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">

        {/* Card */}
        <div className="bg-white rounded-3xl border border-[rgba(60,60,67,0.07)] shadow-sm px-7 py-8 text-center">

          {/* Icon */}
          <div className="w-16 h-16 rounded-[20px] bg-amber-50 flex items-center justify-center mx-auto mb-5">
            <FiClock className="w-8 h-8 text-[#FF9500]" />
          </div>

          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight mb-2">
            Account Pending Review
          </h1>
          <p className="text-sm text-[rgba(60,60,67,0.6)] mb-7">
            Your account has been successfully created and is awaiting approval.
          </p>

          {/* What happens next */}
          <div className="bg-[#f2f2f7] rounded-2xl p-5 mb-5 text-left">
            <h2 className="text-[13px] font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FiCheckCircle className="w-4 h-4 text-[#34C759]" />
              What happens next?
            </h2>
            <ul className="space-y-3">
              {[
                'Our admin team will review your account and verify your information.',
                "You'll be assigned an appropriate role based on your profile.",
                "You'll receive an email notification once your account is approved.",
              ].map((step, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-[rgba(0,122,255,0.12)] text-[#007AFF] text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-[13px] text-[rgba(60,60,67,0.75)]">{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Timeline */}
          <div className="bg-[#f2f2f7] rounded-2xl p-5 mb-5 text-left">
            <p className="text-[12px] font-semibold text-[rgba(60,60,67,0.5)] uppercase tracking-wide mb-3">
              Approval Timeline
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[#34C759] rounded-full" />
                <span className="text-[13px] text-gray-700">Account Created — Now</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[#FF9500] rounded-full animate-pulse" />
                <span className="text-[13px] text-gray-700">Pending Review — 1–2 business days</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[rgba(60,60,67,0.2)] rounded-full" />
                <span className="text-[13px] text-[rgba(60,60,67,0.5)]">Approval &amp; Notification — Soon</span>
              </div>
            </div>
          </div>

          {/* Email notice */}
          <div className="bg-[rgba(0,122,255,0.07)] rounded-2xl p-4 mb-7 text-left">
            <p className="text-[12px] text-[#007AFF] font-medium">
              Check your email (including spam) for the approval notification.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/auth/login"
              className="w-full inline-block bg-[#007AFF] hover:bg-[#0071E3] text-white font-semibold py-3 rounded-xl transition text-sm"
            >
              Return to Login
            </Link>
            <Link
              href="/"
              className="w-full inline-flex items-center justify-center gap-2 bg-[#f2f2f7] hover:bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl transition text-sm"
            >
              <FiArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>

          {/* FAQ */}
          <div className="mt-7 pt-6 border-t border-[rgba(60,60,67,0.08)] text-left space-y-4">
            {[
              { q: 'How long does approval take?', a: 'Typically 1–2 business days. High volume periods may take longer.' },
              { q: 'What if my account is rejected?', a: "You'll receive an email with the reason. You can contact support to appeal." },
              { q: 'Can I log in before approval?', a: "No, you'll only be able to log in after admin approval." },
            ].map(({ q, a }) => (
              <div key={q}>
                <p className="text-[13px] font-semibold text-gray-800 mb-0.5">{q}</p>
                <p className="text-[12px] text-[rgba(60,60,67,0.55)]">{a}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-[rgba(60,60,67,0.08)] text-center">
            <p className="text-[12px] text-[rgba(60,60,67,0.4)]">
              Need help?{' '}
              <Link href="/support" className="text-[#007AFF] hover:underline">
                Contact Support
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center mt-5 text-[11px] text-gray-400">
          © {new Date().getFullYear()} DOMS · All rights reserved.
        </p>
      </div>
    </div>
  );
}
