'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  FiMenu,
  FiX,
  FiLogOut,
  FiUser,
  FiChevronDown,
  FiBarChart2,
  FiUsers,
  FiCalendar,
  FiCheckCircle,
  FiList,
  FiBell,
  FiZap,
  FiBriefcase,
  FiHelpCircle,
  FiHardDrive,
  FiFileText,
  FiClipboard,
} from 'react-icons/fi';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';

interface NavItem {
  name: string;
  href: string;
  iconKey: string;
  children?: NavItem[];
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  title?: string;
}

export default function DashboardLayout({ children, title }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, setUser } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await apiClient.get('/auth/profile');
        if (response.data.profileImage) {
          setProfileImage(response.data.profileImage);
        }
        if (user) {
          setUser({ ...user, profileImage: response.data.profileImage });
        }
      } catch {
        // Silently fail
      }
    };

    if (user?.id) {
      fetchUserProfile();
    }
  }, [user?.id]);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    router.push('/auth/login');
  };

  const getNavigation = (): NavItem[] => {
    const baseNav = [
      { name: 'Profile', href: '/profile', iconKey: 'user' },
    ];

    const sipChildren = [
      { name: 'SIP Questions', href: '/admin/sip-questions', iconKey: 'helpCircle' },
    ];
    const studentSipChildren = [
      { name: 'SIP Questions', href: '/student/sip-questions', iconKey: 'helpCircle' },
    ];

    const roleNav: Record<string, NavItem[]> = {
      ADMIN: [
        { name: 'Dashboard', href: '/admin/dashboard', iconKey: 'chart' },
        { name: 'Users', href: '/admin/users', iconKey: 'users' },
        { name: 'Sessions', href: '/admin/sessions', iconKey: 'calendar' },
        { name: 'Assessments', href: '/admin/assessments', iconKey: 'check' },
        { name: 'Mentor Teams', href: '/admin/mentors', iconKey: 'users' },
        { name: 'Internships (SIP)', href: '/admin/sip', iconKey: 'briefcase', children: sipChildren },
        { name: 'File Management', href: '/admin/files', iconKey: 'hardDrive' },
        { name: 'Reports', href: '/admin/reports', iconKey: 'fileText' },
        { name: 'Faculty Tasks', href: '/admin/faculty-tasks', iconKey: 'clipboard' },
        { name: 'Faculty Groups', href: '/admin/faculty-groups', iconKey: 'users' },
        { name: 'Announcements', href: '/admin/announcements', iconKey: 'bell' },
      ],
      FACULTY: [
        { name: 'Dashboard', href: '/faculty/dashboard', iconKey: 'chart' },
        { name: 'Assessments', href: '/faculty/assessments', iconKey: 'check' },
        { name: 'My Mentees', href: '/faculty/mentors', iconKey: 'users' },
        { name: 'My Tasks', href: '/faculty/tasks', iconKey: 'clipboard' },
        { name: 'Announcements', href: '/student/announcements', iconKey: 'bell' },
      ],
      HOD: [
        { name: 'Dashboard', href: '/admin/dashboard', iconKey: 'chart' },
        { name: 'Internships (SIP)', href: '/admin/sip', iconKey: 'briefcase', children: sipChildren },
        { name: 'My Tasks', href: '/faculty/tasks', iconKey: 'clipboard' },
        { name: 'Announcements', href: '/admin/announcements', iconKey: 'bell' },
      ],
      PLACEMENT_COORDINATOR: [
        { name: 'Dashboard', href: '/coordinator/dashboard', iconKey: 'chart' },
        { name: 'Sessions', href: '/coordinator/sessions', iconKey: 'calendar' },
        { name: 'Assessments', href: '/coordinator/assessments', iconKey: 'check' },
        { name: 'Internships (SIP)', href: '/admin/sip', iconKey: 'briefcase', children: sipChildren },
        { name: 'Job Matching', href: '/coordinator/job-matching', iconKey: 'zap' },
        { name: 'My Tasks', href: '/faculty/tasks', iconKey: 'clipboard' },
        { name: 'Announcements', href: '/admin/announcements', iconKey: 'bell' },
      ],
      TRAINER: [
        { name: 'Dashboard', href: '/trainer/dashboard', iconKey: 'chart' },
        { name: 'Assessments', href: '/trainer/assessments', iconKey: 'check' },
        { name: 'My Tasks', href: '/faculty/tasks', iconKey: 'clipboard' },
        { name: 'Announcements', href: '/student/announcements', iconKey: 'bell' },
      ],
      COORDINATOR: [
        { name: 'Dashboard', href: '/coordinator/dashboard', iconKey: 'chart' },
        { name: 'My Tasks', href: '/faculty/tasks', iconKey: 'clipboard' },
        { name: 'Announcements', href: '/admin/announcements', iconKey: 'bell' },
      ],
      MENTOR: [
        { name: 'Dashboard', href: '/faculty/dashboard', iconKey: 'chart' },
        { name: 'My Mentees', href: '/faculty/mentors', iconKey: 'users' },
        { name: 'My Tasks', href: '/faculty/tasks', iconKey: 'clipboard' },
        { name: 'Announcements', href: '/student/announcements', iconKey: 'bell' },
      ],
      STUDENT: [
        { name: 'My Assessments', href: '/student/assessments', iconKey: 'list' },
        { name: 'My Mentors', href: '/student/mentors', iconKey: 'users' },
        { name: 'My Profile', href: '/student/profile', iconKey: 'user' },
        { name: 'Internship (SIP)', href: '/student/sip', iconKey: 'briefcase', children: studentSipChildren },
        { name: 'Announcements', href: '/student/announcements', iconKey: 'bell' },
      ],
    };

    return [...(roleNav[user?.role as string] || []), ...baseNav];
  };

  const getIcon = (iconKey: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      chart:      <FiBarChart2 className="w-4.5 h-4.5" />,
      user:       <FiUser className="w-4.5 h-4.5" />,
      users:      <FiUsers className="w-4.5 h-4.5" />,
      calendar:   <FiCalendar className="w-4.5 h-4.5" />,
      check:      <FiCheckCircle className="w-4.5 h-4.5" />,
      list:       <FiList className="w-4.5 h-4.5" />,
      bell:       <FiBell className="w-4.5 h-4.5" />,
      zap:        <FiZap className="w-4.5 h-4.5" />,
      briefcase:  <FiBriefcase className="w-4.5 h-4.5" />,
      helpCircle: <FiHelpCircle className="w-4.5 h-4.5" />,
      hardDrive:  <FiHardDrive className="w-4.5 h-4.5" />,
      fileText:   <FiFileText className="w-4.5 h-4.5" />,
      clipboard:  <FiClipboard className="w-4.5 h-4.5" />,
    };
    return iconMap[iconKey] || <FiBarChart2 className="w-4.5 h-4.5" />;
  };

  const navigation = getNavigation();

  // Auto-expand parent items when a child route is active
  useEffect(() => {
    const toExpand = new Set<string>();
    navigation.forEach((item) => {
      if (item.children?.some((child) => pathname === child.href || pathname.startsWith(child.href))) {
        toExpand.add(item.href);
      }
    });
    if (toExpand.size > 0) {
      setExpandedItems((prev) => new Set([...prev, ...toExpand]));
    }
  }, [pathname]);

  const toggleExpanded = (href: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      next.has(href) ? next.delete(href) : next.add(href);
      return next;
    });
  };

  const renderNavItem = (item: NavItem) => {
    const isActive =
      pathname === item.href ||
      (item.href !== '/' && item.href.length > 1 && pathname.startsWith(item.href));
    const isExpanded = expandedItems.has(item.href);
    const hasChildren = item.children && item.children.length > 0;
    const isChildActive = item.children?.some(
      (c) => pathname === c.href || pathname.startsWith(c.href)
    );

    return (
      <div key={item.href}>
        {hasChildren ? (
          <Link
            href={item.href}
            onClick={() => { toggleExpanded(item.href); setSidebarOpen(false); }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-sm font-medium transition-all duration-150 ${
              isActive || isChildActive
                ? 'bg-[rgba(0,122,255,0.1)] text-[#007AFF]'
                : 'text-[rgba(60,60,67,0.8)] hover:bg-[rgba(0,0,0,0.04)] hover:text-gray-900'
            }`}
          >
            <span className={`flex-shrink-0 transition-colors ${isActive || isChildActive ? 'text-[#007AFF]' : 'text-[rgba(60,60,67,0.4)]'}`}>
              {getIcon(item.iconKey)}
            </span>
            <span className="flex-1 text-left">{item.name}</span>
            <span
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleExpanded(item.href); }}
              className="flex-shrink-0 p-0.5"
            >
              <FiChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} ${isActive || isChildActive ? 'text-[#007AFF]' : 'text-[rgba(60,60,67,0.3)]'}`}
              />
            </span>
          </Link>
        ) : (
          <Link
            href={item.href}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-sm font-medium transition-all duration-150 ${
              isActive
                ? 'bg-[rgba(0,122,255,0.1)] text-[#007AFF]'
                : 'text-[rgba(60,60,67,0.8)] hover:bg-[rgba(0,0,0,0.04)] hover:text-gray-900'
            }`}
          >
            <span className={`flex-shrink-0 transition-colors ${isActive ? 'text-[#007AFF]' : 'text-[rgba(60,60,67,0.4)]'}`}>
              {getIcon(item.iconKey)}
            </span>
            <span>{item.name}</span>
          </Link>
        )}

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="ml-3 pl-3.5 border-l border-[rgba(60,60,67,0.1)] mb-0.5">
            {item.children!.map((child) => {
              const childActive =
                pathname === child.href ||
                (child.href !== '/' && child.href.length > 1 && pathname.startsWith(child.href));
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl mb-0.5 text-[13px] font-medium transition-all duration-150 ${
                    childActive
                      ? 'bg-[rgba(0,122,255,0.08)] text-[#007AFF]'
                      : 'text-[rgba(60,60,67,0.65)] hover:bg-[rgba(0,0,0,0.04)] hover:text-gray-900'
                  }`}
                >
                  <span className={`flex-shrink-0 ${childActive ? 'text-[#007AFF]' : 'text-[rgba(60,60,67,0.35)]'}`}>
                    {getIcon(child.iconKey)}
                  </span>
                  <span>{child.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const avatarContent = profileImage ? (
    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
  ) : (
    <span>{`${user?.firstName?.charAt(0) ?? ''}${user?.lastName?.charAt(0) ?? ''}`.toUpperCase()}</span>
  );

  return (
    <div className="flex h-screen bg-[#f2f2f7]">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-[rgba(60,60,67,0.12)] flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-14 px-5 border-b border-[rgba(60,60,67,0.08)] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#007AFF] flex items-center justify-center shadow-sm shadow-blue-200">
              <span className="text-white font-bold text-sm tracking-tight">D</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">DOMS</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* User Info */}
        <div className="px-3 pt-4 pb-3 border-b border-[rgba(60,60,67,0.08)] flex-shrink-0">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-[#f2f2f7]">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 overflow-hidden shadow-sm">
              {avatarContent}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 truncate text-sm leading-tight">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-[rgba(60,60,67,0.5)] font-medium mt-0.5">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5">
          {navigation.map((item) => renderNavItem(item))}
        </nav>

        {/* Sign Out */}
        <div className="p-2.5 border-t border-[rgba(60,60,67,0.08)] flex-shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[rgba(60,60,67,0.65)] hover:bg-red-50 hover:text-red-500 transition-all duration-150"
          >
            <FiLogOut className="w-4 h-4 flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Bar — frosted glass */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-[rgba(60,60,67,0.1)] h-14 flex items-center justify-between px-4 md:px-6 flex-shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition"
            >
              <FiMenu className="w-5 h-5" />
            </button>
            {title && (
              <h2 className="text-[15px] font-semibold text-gray-900 hidden md:block">
                {title}
              </h2>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full hover:bg-gray-100 transition"
            >
              <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold overflow-hidden shadow-sm">
                {avatarContent}
              </div>
              <FiChevronDown
                className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
                  profileOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl border border-[rgba(60,60,67,0.1)] shadow-xl z-40 overflow-hidden animate-scale-in">
                {/* User info */}
                <div className="px-4 py-4 border-b border-[rgba(60,60,67,0.07)]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 overflow-hidden shadow-sm">
                      {avatarContent}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-[rgba(60,60,67,0.5)] truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>

                <Link
                  href="/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-b border-[rgba(60,60,67,0.06)] transition"
                >
                  <FiUser className="w-4 h-4 text-gray-400" />
                  View Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition"
                >
                  <FiLogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 max-w-7xl mx-auto w-full animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/25 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
