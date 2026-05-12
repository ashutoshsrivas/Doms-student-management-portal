'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/app/store/authStore';
import DashboardLayout from '@/app/components/DashboardLayout';
import { FiCheckCircle, FiUser, FiUsers, FiArrowRight, FiLifeBuoy } from 'react-icons/fi';

export default function FacultyDashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user && user.role !== 'FACULTY') router.push('/unauthorized');
  }, [user, router]);

  if (!user || user.role !== 'FACULTY') return null;

  const cards = [
    {
      href: '/faculty/assessments',
      icon: <FiCheckCircle className="w-5 h-5" />,
      iconBg: 'bg-blue-50', iconColor: 'text-[#007AFF]',
      title: 'Manage Assessments',
      desc: 'Create, edit, and grade student assessments',
    },
    {
      href: '/faculty/mentors',
      icon: <FiUsers className="w-5 h-5" />,
      iconBg: 'bg-green-50', iconColor: 'text-[#34C759]',
      title: 'My Mentees',
      desc: 'View and manage your assigned mentees',
    },
    {
      href: '/profile',
      icon: <FiUser className="w-5 h-5" />,
      iconBg: 'bg-purple-50', iconColor: 'text-[#AF52DE]',
      title: 'My Profile',
      desc: 'View and update your profile information',
    },
    {
      href: '#',
      icon: <FiLifeBuoy className="w-5 h-5" />,
      iconBg: 'bg-orange-50', iconColor: 'text-[#FF9500]',
      title: 'Help & Support',
      desc: 'Get help with the system',
      disabled: true,
      badge: 'Coming Soon',
    },
  ];

  return (
    <DashboardLayout title="Faculty Dashboard">

      {/* Welcome Banner */}
      <div
        className="relative rounded-2xl overflow-hidden mb-6 animate-slide-up"
        style={{ background: 'linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%)' }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white rounded-full" />
          <div className="absolute -bottom-10 right-24 w-28 h-28 bg-white rounded-full" />
        </div>
        <div className="relative z-10 px-6 py-7">
          <p className="text-white/70 text-[13px] font-medium mb-1">Faculty Portal</p>
          <h2 className="text-white text-[22px] font-bold tracking-tight mb-2">
            Welcome, {user.firstName} {user.lastName}
          </h2>
          <p className="text-white/75 text-[13px] leading-relaxed max-w-sm">
            Manage your assessments, mentor your students, and track academic progress.
          </p>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        {cards.map((card, i) => {
          const inner = (
            <div
              className={`bg-white rounded-2xl p-6 border border-[rgba(60,60,67,0.07)] shadow-sm transition-all duration-200 flex items-start gap-4 animate-slide-up ${
                card.disabled
                  ? 'opacity-60 cursor-not-allowed'
                  : 'hover:shadow-md hover:-translate-y-0.5 group cursor-pointer'
              }`}
              style={{ animationDelay: `${60 + i * 55}ms` }}
            >
              <div className={`w-11 h-11 rounded-2xl ${card.iconBg} ${card.iconColor} flex items-center justify-center flex-shrink-0 mt-0.5 ${!card.disabled ? 'group-hover:scale-110 transition-transform duration-200' : ''}`}>
                {card.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-[15px] font-semibold text-gray-900">{card.title}</h3>
                  {card.badge && (
                    <span className="px-2 py-0.5 bg-[rgba(60,60,67,0.08)] text-[rgba(60,60,67,0.5)] text-[10px] font-semibold rounded-full">
                      {card.badge}
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-[rgba(60,60,67,0.55)] leading-snug">{card.desc}</p>
              </div>
              {!card.disabled && (
                <FiArrowRight className="w-4 h-4 text-[rgba(60,60,67,0.25)] group-hover:text-[#007AFF] group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0 mt-0.5" />
              )}
            </div>
          );

          return card.disabled || card.href === '#' ? (
            <div key={i}>{inner}</div>
          ) : (
            <Link key={i} href={card.href}>{inner}</Link>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
