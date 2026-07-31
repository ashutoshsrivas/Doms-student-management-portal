'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/app/store/authStore';
import DashboardLayout from '@/app/components/DashboardLayout';
import AnnouncementCard, { type Announcement } from '@/app/components/Announcements/AnnouncementCard';
import StudentNotificationPrompts from '@/app/components/StudentNotificationPrompts';
import { FiLoader, FiAlertCircle, FiPlus, FiSearch, FiX, FiChevronDown, FiFilter } from 'react-icons/fi';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function AnnouncementsPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuthStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const roleOptions = ['ADMIN', 'HOD', 'PLACEMENT_COORDINATOR', 'FACULTY', 'STUDENT'];
  const typeOptions = ['PUBLIC', 'PRIVATE'];

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !token) return;

    const fetchAnnouncements = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE}/announcements`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (data.success) {
          setAnnouncements(data.data);
          // Extract unique roles from creators
          const roles = Array.from(
            new Set(
              data.data
                .map((ann: { Creator?: { role?: string; approvedRole?: string } }) => ann.Creator?.role || ann.Creator?.approvedRole || 'UNKNOWN')
                .filter((role: string) => role !== 'UNKNOWN')
            )
          ).sort() as string[];
          setAvailableRoles(roles);
        } else {
          setError(data.message || 'Failed to load announcements');
        }
      } catch (err) {
        console.error('Error fetching announcements:', err);
        setError('Error loading announcements');
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, [user, token]);

  const filteredAnnouncements = announcements.filter((ann) => {
    // Search filter - search in title and content
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      ann.title.toLowerCase().includes(searchLower) ||
      ann.content.toLowerCase().includes(searchLower) ||
      `${ann.Creator?.firstName} ${ann.Creator?.lastName}`.toLowerCase().includes(searchLower);

    // Role filter
    const creatorRole = ann.Creator?.role || ann.Creator?.approvedRole || 'UNKNOWN';
    const matchesRole = selectedRoles.length === 0 || selectedRoles.includes(creatorRole);

    // Type filter
    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(ann.type);

    return matchesSearch && matchesRole && matchesType;
  });

  const canCreateAnnouncements = user && ['ADMIN', 'HOD', 'PLACEMENT_COORDINATOR'].includes(user.role);

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedRoles([]);
    setSelectedTypes([]);
  };

  // Count announcements by role and type
  const getRoleCount = (role: string) => {
    return announcements.filter(
      (ann) => (ann.Creator?.role || ann.Creator?.approvedRole) === role
    ).length;
  };

  const getTypeCount = (type: string) => {
    return announcements.filter((ann) => ann.type === type).length;
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Announcements">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <FiLoader className="inline animate-spin text-blue-600 mb-4" size={32} />
            <p className="text-gray-600">Loading announcements...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const hasActiveFilters = !!(searchTerm || selectedRoles.length > 0 || selectedTypes.length > 0);

  return (
    <DashboardLayout title="Announcements">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Announcements</h1>
            <p className="text-sm text-gray-500 mt-0.5">Stay updated with important messages.</p>
          </div>
          {canCreateAnnouncements && (
            <Link
              href="/admin/announcements/create"
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition"
            >
              <FiPlus size={16} /> Create
            </Link>
          )}
        </div>

        {/* Actionable notifications the student still owes a response to */}
        <StudentNotificationPrompts />

        {/* Search + filter shell */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-3 sm:p-4 space-y-3">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
              <input
                type="text"
                placeholder="Search by title, content, or name…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 items-center">
                {searchTerm && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-800 text-xs rounded-full border border-blue-200">
                    <span>“{searchTerm}”</span>
                    <button onClick={() => setSearchTerm('')} className="hover:text-blue-900"><FiX size={12} /></button>
                  </span>
                )}
                {selectedRoles.map((role) => (
                  <span key={role} className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-800 text-xs rounded-full border border-purple-200">
                    <span>{role}</span>
                    <button onClick={() => toggleRole(role)} className="hover:text-purple-900"><FiX size={12} /></button>
                  </span>
                ))}
                {selectedTypes.map((type) => (
                  <span key={type} className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-800 text-xs rounded-full border border-green-200">
                    <span>{type}</span>
                    <button onClick={() => toggleType(type)} className="hover:text-green-900"><FiX size={12} /></button>
                  </span>
                ))}
                <button onClick={clearFilters} className="text-xs text-gray-600 hover:text-gray-900 font-medium">Clear all</button>
              </div>
            )}

            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 border border-gray-200"
            >
              <span className="inline-flex items-center gap-2 font-medium">
                <FiFilter size={14} /> Filters
                {(selectedRoles.length + selectedTypes.length) > 0 && (
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-[11px] rounded-full font-semibold">
                    {selectedRoles.length + selectedTypes.length}
                  </span>
                )}
              </span>
              <FiChevronDown size={16} className={`text-gray-500 transition-transform ${showFilterPanel ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showFilterPanel && (
            <div className="border-t border-gray-200 p-3 sm:p-4 space-y-4 bg-gray-50">
              <div>
                <h3 className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-2">Uploader role</h3>
                <div className="flex flex-wrap gap-1.5">
                  {availableRoles.map((role) => {
                    const on = selectedRoles.includes(role);
                    return (
                      <button
                        key={role}
                        onClick={() => toggleRole(role)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                          on ? 'bg-purple-600 text-white border-purple-600'
                             : 'bg-white text-gray-700 border-gray-300 hover:border-purple-300'
                        }`}
                      >
                        {role} <span className={`ml-1 ${on ? 'text-purple-100' : 'text-gray-400'}`}>{getRoleCount(role)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-2">Type</h3>
                <div className="flex flex-wrap gap-1.5">
                  {typeOptions.map((type) => {
                    const on = selectedTypes.includes(type);
                    return (
                      <button
                        key={type}
                        onClick={() => toggleType(type)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                          on ? 'bg-green-600 text-white border-green-600'
                             : 'bg-white text-gray-700 border-gray-300 hover:border-green-300'
                        }`}
                      >
                        {type} <span className={`ml-1 ${on ? 'text-green-100' : 'text-gray-400'}`}>{getTypeCount(type)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm">
              <FiAlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <div className="font-semibold text-red-900">Error</div>
                <div className="text-red-700">{error}</div>
              </div>
            </div>
          )}

          {filteredAnnouncements.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-gray-300 rounded-xl bg-white">
              <p className="text-gray-800 font-medium">No announcements found</p>
              <p className="text-gray-500 text-sm mt-1">
                {announcements.length > 0 ? 'Try adjusting your search or filters.' : 'Check back later for new updates.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredAnnouncements.map((announcement) => (
                <AnnouncementCard key={announcement.id} announcement={announcement} showRole={true} />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
