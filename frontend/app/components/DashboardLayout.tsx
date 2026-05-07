'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
} from 'react-icons/fi';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';

interface NavItem {
  name: string;
  href: string;
  iconKey: string;
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  title?: string;
}

export default function DashboardLayout({ children, title }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, logout, setUser } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    // Fetch latest user profile data on mount
    const fetchUserProfile = async () => {
      try {
        const response = await apiClient.get('/auth/profile');
        if (response.data.profileImage) {
          setProfileImage(response.data.profileImage);
        }
        // Update user in store with profile image
        if (user) {
          setUser({ ...user, profileImage: response.data.profileImage });
        }
      } catch (error) {
        // Silently fail - user info is already available from auth store
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

  // Define navigation based on role
  const getNavigation = () => {
    const baseNav = [
      { name: 'Profile', href: '/profile', iconKey: 'user' },
    ];

    const roleNav: Record<string, Array<{ name: string; href: string; iconKey: string }>> = {
      ADMIN: [
        { name: 'Dashboard', href: '/admin/dashboard', iconKey: 'chart' },
        { name: 'Users', href: '/admin/users', iconKey: 'users' },
        { name: 'Sessions', href: '/admin/sessions', iconKey: 'calendar' },
        { name: 'Assessments', href: '/admin/assessments', iconKey: 'check' },
        { name: 'Mentor Teams', href: '/admin/mentors', iconKey: 'users' },
        { name: 'Announcements', href: '/admin/announcements', iconKey: 'bell' },
      ],
      FACULTY: [
        { name: 'Dashboard', href: '/faculty/dashboard', iconKey: 'chart' },
        { name: 'Assessments', href: '/faculty/assessments', iconKey: 'check' },
        { name: 'My Mentees', href: '/faculty/mentors', iconKey: 'users' },
        { name: 'Announcements', href: '/student/announcements', iconKey: 'bell' },
      ],
      HOD: [
        { name: 'Dashboard', href: '/admin/dashboard', iconKey: 'chart' },
        { name: 'Announcements', href: '/admin/announcements', iconKey: 'bell' },
      ],
      PLACEMENT_COORDINATOR: [
        { name: 'Dashboard', href: '/coordinator/dashboard', iconKey: 'chart' },
        { name: 'Sessions', href: '/coordinator/sessions', iconKey: 'calendar' },
        { name: 'Assessments', href: '/coordinator/assessments', iconKey: 'check' },
        { name: 'Announcements', href: '/admin/announcements', iconKey: 'bell' },
      ],
      TRAINER: [
        { name: 'Dashboard', href: '/trainer/dashboard', iconKey: 'chart' },
        { name: 'Assessments', href: '/trainer/assessments', iconKey: 'check' },
        { name: 'Announcements', href: '/student/announcements', iconKey: 'bell' },
      ],
      STUDENT: [
        { name: 'My Assessments', href: '/student/assessments', iconKey: 'list' },
        { name: 'My Mentors', href: '/student/mentors', iconKey: 'users' },
        { name: 'My Profile', href: '/student/profile', iconKey: 'user' },
        { name: 'Announcements', href: '/student/announcements', iconKey: 'bell' },
      ],
    };

    return [...(roleNav[user?.role as string] || []), ...baseNav];
  };

  // Map icon keys to React Icon components
  const getIcon = (iconKey: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      chart: <FiBarChart2 className="w-5 h-5" />,
      user: <FiUser className="w-5 h-5" />,
      users: <FiUsers className="w-5 h-5" />,
      calendar: <FiCalendar className="w-5 h-5" />,
      check: <FiCheckCircle className="w-5 h-5" />,
      list: <FiList className="w-5 h-5" />,
      bell: <FiBell className="w-5 h-5" />,
    };
    return iconMap[iconKey] || <FiBarChart2 className="w-5 h-5" />;
  };

  const navigation = getNavigation();

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold text-white">DOMS</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-gray-400 hover:text-white transition"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* User Info */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                `${user?.firstName?.charAt(0)}${user?.lastName?.charAt(0)}`.toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-300">Logged in as</p>
              <p className="font-semibold text-white truncate text-sm">
                {user?.firstName} {user?.lastName}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-300 ml-15">Role: {user?.role}</p>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-700 transition mb-2 text-gray-100 hover:text-white font-medium"
            >
              {getIcon(item.iconKey)}
              <span className="text-sm">{item.name}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-6 md:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-gray-700 hover:text-gray-900"
            >
              <FiMenu className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-semibold text-gray-800 hidden md:block">
              {title}
            </h2>
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
            >
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 overflow-hidden">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  `${user?.firstName?.charAt(0)}${user?.lastName?.charAt(0)}`.toUpperCase()
                )}
              </div>
              <FiChevronDown className="w-4 h-4 text-gray-700" />
            </button>

            {/* Dropdown Menu */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-40">
                <div className="px-4 py-4 border-b border-gray-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                      {profileImage ? (
                        <img
                          src={profileImage}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        `${user?.firstName?.charAt(0)}${user?.lastName?.charAt(0)}`.toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-gray-700">{user?.email}</p>
                    </div>
                  </div>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 border-b border-gray-200"
                >
                  <FiUser className="w-4 h-4" />
                  View Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50"
                >
                  <FiLogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
