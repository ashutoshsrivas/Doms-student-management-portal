'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/app/store/authStore';
import DashboardLayout from '@/app/components/DashboardLayout';
import AnnouncementCard, { type Announcement } from '@/app/components/Announcements/AnnouncementCard';
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

  return (
    <DashboardLayout title="Announcements">
      <div className="py-6 px-2 md:px-4 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Announcements</h1>
            <p className="text-gray-600 mt-1 text-sm">Stay updated with important announcements.</p>
          </div>
          <div>
            {canCreateAnnouncements && (
              <Link
                href="/admin/announcements/create"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
              >
                <FiPlus size={18} /> Create Announcement
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by title, content, or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
          </div>

          {/* Active Filters Display */}
          {(searchTerm || selectedRoles.length > 0 || selectedTypes.length > 0) && (
            <div className="flex flex-wrap gap-2 items-start">
              {searchTerm && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 text-sm rounded-full">
                  <span>Search: <strong>{searchTerm}</strong></span>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="hover:text-blue-900"
                  >
                    <FiX size={14} />
                  </button>
                </div>
              )}
              {selectedRoles.map((role) => (
                <div key={role} className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-800 text-sm rounded-full">
                  <span>{role}</span>
                  <button
                    onClick={() => toggleRole(role)}
                    className="hover:text-purple-900"
                  >
                    <FiX size={14} />
                  </button>
                </div>
              ))}
              {selectedTypes.map((type) => (
                <div key={type} className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 text-sm rounded-full">
                  <span>{type}</span>
                  <button
                    onClick={() => toggleType(type)}
                    className="hover:text-green-900"
                  >
                    <FiX size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Filter Panel Toggle */}
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition"
          >
            <div className="flex items-center gap-2">
              <FiFilter size={18} className="text-gray-600" />
              <span className="font-medium text-gray-700">Advanced Filters</span>
              {(selectedRoles.length > 0 || selectedTypes.length > 0) && (
                <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full font-semibold">
                  {selectedRoles.length + selectedTypes.length}
                </span>
              )}
            </div>
            <FiChevronDown
              size={20}
              className={`text-gray-600 transition-transform ${showFilterPanel ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Collapsible Filter Panel */}
          {showFilterPanel && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-4 bg-gray-50">
              {/* Role Filter */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span>Uploader Role</span>
                  <span className="text-xs bg-gray-300 text-gray-700 px-2 py-0.5 rounded">{availableRoles.length} available</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                  {availableRoles.map((role) => (
                    <button
                      key={role}
                      onClick={() => toggleRole(role)}
                      className={`px-3 py-2 rounded-lg font-medium text-sm transition ${
                        selectedRoles.includes(role)
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-white border border-gray-300 text-gray-700 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>{role}</span>
                        <span className="text-xs opacity-75">({getRoleCount(role)})</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Type Filter */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Announcement Type</h3>
                <div className="grid grid-cols-2 gap-2">
                  {typeOptions.map((type) => (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      className={`px-3 py-2 rounded-lg font-medium text-sm transition ${
                        selectedTypes.includes(type)
                          ? 'bg-green-600 text-white shadow-md'
                          : 'bg-white border border-gray-300 text-gray-700 hover:border-green-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>{type}</span>
                        <span className="text-xs opacity-75">({getTypeCount(type)})</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <FiAlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-medium text-red-900">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {filteredAnnouncements.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No announcements found</p>
            <p className="text-gray-500 mt-1">
              {announcements.length > 0
                ? 'Try adjusting your search or filters'
                : 'Check back later for new updates'}
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredAnnouncements.map((announcement) => (
              <AnnouncementCard key={announcement.id} announcement={announcement} showRole={true} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
