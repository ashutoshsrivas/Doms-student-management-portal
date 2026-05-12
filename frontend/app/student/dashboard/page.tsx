'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import { FiBook, FiAward, FiCalendar, FiUsers, FiArrowRight, FiUser, FiMessageSquare } from 'react-icons/fi';

interface Session {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface Stats {
  activeSession: Session | null;
  assessmentsPending: number;
  messagesUnread: number;
  achievements: number;
}

function SessionProgress({ session }: { session: Session }) {
  const start = new Date(session.startDate).getTime();
  const end = new Date(session.endDate).getTime();
  const now = Date.now();
  const pct = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
  const daysLeft = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));

  return (
    <div className="bg-white rounded-2xl p-6 border border-[rgba(60,60,67,0.07)] shadow-sm mb-6 animate-slide-up" style={{ animationDelay: '180ms' }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[rgba(60,60,67,0.4)] mb-1">Current Session</p>
          <h3 className="text-[15px] font-bold text-gray-900">{session.name}</h3>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[rgba(52,199,89,0.1)] rounded-full text-[11px] font-semibold text-[#34C759]">
          <span className="w-1.5 h-1.5 bg-[#34C759] rounded-full animate-pulse" />
          Active
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-[rgba(60,60,67,0.5)]">{new Date(session.startDate).toLocaleDateString()}</span>
          <span className="text-[12px] font-bold text-[#007AFF]">{pct}% complete</span>
          <span className="text-[11px] text-[rgba(60,60,67,0.5)]">{new Date(session.endDate).toLocaleDateString()}</span>
        </div>
        <div className="relative h-2 bg-[rgba(60,60,67,0.08)] rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#007AFF] to-[#5AC8FA] rounded-full"
            style={{ width: `${pct}%`, transition: 'width 1s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </div>
      </div>
      <p className="text-[12px] text-[rgba(60,60,67,0.5)]">
        {daysLeft > 0 ? `${daysLeft} days remaining` : 'Session ending today'}
      </p>
    </div>
  );
}

function StudentDashboardContent() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats>({ activeSession: null, assessmentsPending: 0, messagesUnread: 0, achievements: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const sessionRes = await apiClient.get('/sessions/me/session');
        if (sessionRes.data.session) {
          setStats((prev) => ({ ...prev, activeSession: sessionRes.data.session }));
        }
      } catch {
        // silently fail — student may not be enrolled
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const statCards = [
    {
      label: 'Session',
      value: stats.activeSession ? 'Active' : 'None',
      valueIsText: true,
      icon: <FiCalendar className="w-4 h-4" />,
      iconBg: 'bg-blue-50', iconColor: 'text-[#007AFF]',
      valueColor: stats.activeSession ? 'text-[#34C759]' : 'text-[rgba(60,60,67,0.35)]',
    },
    {
      label: 'Assessments',
      value: stats.assessmentsPending,
      icon: <FiAward className="w-4 h-4" />,
      iconBg: 'bg-amber-50', iconColor: 'text-[#FF9500]',
      valueColor: 'text-[#FF9500]',
    },
    {
      label: 'Messages',
      value: stats.messagesUnread,
      icon: <FiMessageSquare className="w-4 h-4" />,
      iconBg: 'bg-green-50', iconColor: 'text-[#34C759]',
      valueColor: 'text-gray-900',
    },
    {
      label: 'Achievements',
      value: stats.achievements,
      icon: <FiBook className="w-4 h-4" />,
      iconBg: 'bg-purple-50', iconColor: 'text-[#AF52DE]',
      valueColor: 'text-gray-900',
    },
  ];

  const quickLinks = [
    { href: '/student/profile', icon: <FiUser className="w-4 h-4" />, iconBg: 'bg-blue-50', iconColor: 'text-[#007AFF]', title: 'My Profile', desc: 'View and update your profile' },
    { href: '/student/assessments', icon: <FiAward className="w-4 h-4" />, iconBg: 'bg-amber-50', iconColor: 'text-[#FF9500]', title: 'Assessments', desc: 'View and complete assessments' },
    { href: '/student/mentors', icon: <FiUsers className="w-4 h-4" />, iconBg: 'bg-green-50', iconColor: 'text-[#34C759]', title: 'My Mentors', desc: 'Connect with your mentors' },
  ];

  return (
    <DashboardLayout title={`Hi, ${user?.firstName}!`}>

      {/* Welcome Banner */}
      <div
        className="relative rounded-2xl overflow-hidden mb-6 animate-slide-up"
        style={{ background: 'linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%)' }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white rounded-full" />
          <div className="absolute -bottom-10 right-20 w-28 h-28 bg-white rounded-full" />
        </div>
        <div className="relative z-10 px-6 py-7">
          <p className="text-white/70 text-[13px] font-medium mb-1">Welcome back</p>
          <h2 className="text-white text-[22px] font-bold tracking-tight mb-2">
            {user?.firstName} {user?.lastName}
          </h2>
          <p className="text-white/75 text-[13px] leading-relaxed max-w-sm">
            Stay on top of your assessments, connect with mentors, and track your academic progress.
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-5 border border-[rgba(60,60,67,0.07)] shadow-sm animate-slide-up"
            style={{ animationDelay: `${60 + i * 55}ms` }}
          >
            <div className={`w-9 h-9 rounded-xl ${card.iconBg} ${card.iconColor} flex items-center justify-center mb-3`}>
              {card.icon}
            </div>
            <p className={`text-[22px] font-bold leading-none mb-1 ${card.valueColor}`}>
              {loading ? '—' : card.value}
            </p>
            <p className="text-[11px] font-medium text-[rgba(60,60,67,0.5)]">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Session Progress */}
      {stats.activeSession && <SessionProgress session={stats.activeSession} />}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 animate-slide-up" style={{ animationDelay: '240ms' }}>
        {quickLinks.map((card, i) => (
          <Link
            key={i}
            href={card.href}
            className="bg-white rounded-2xl p-5 border border-[rgba(60,60,67,0.07)] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group flex items-start gap-4"
          >
            <div className={`w-9 h-9 rounded-xl ${card.iconBg} ${card.iconColor} flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-200`}>
              {card.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[14px] font-semibold text-gray-900 mb-0.5">{card.title}</h3>
              <p className="text-[12px] text-[rgba(60,60,67,0.5)]">{card.desc}</p>
            </div>
            <FiArrowRight className="w-4 h-4 text-[rgba(60,60,67,0.25)] group-hover:text-[#007AFF] group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0 mt-0.5" />
          </Link>
        ))}
      </div>
    </DashboardLayout>
  );
}

export default function StudentDashboard() {
  return (
    <ProtectedRoute requiredRoles={['STUDENT']}>
      <StudentDashboardContent />
    </ProtectedRoute>
  );
}
