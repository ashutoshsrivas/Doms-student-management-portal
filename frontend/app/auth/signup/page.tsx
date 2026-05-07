'use client';

import { useEffect } from 'react';

export default function SignupPage() {
  useEffect(() => {
    // Redirect to external apply system
    window.location.href = 'https://apply.geu.ac.in/';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Redirecting...</h1>
        <p className="text-gray-600 mb-6">Please wait while we redirect you to the application portal.</p>
        <p className="text-sm text-gray-500">
          If you are not redirected automatically, please visit{' '}
          <a
            href="https://apply.geu.ac.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            https://apply.geu.ac.in/
          </a>
        </p>
      </div>
    </div>
  );
}
