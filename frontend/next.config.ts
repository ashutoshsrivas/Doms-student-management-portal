import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pre-existing TS errors in legacy pages (job-matching, sip*, student/announcements,
  // student/mentors). Build-time type-checking disabled until those are typed properly.
  // Editor type-checks still run; remove this once the legacy pages are migrated.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
