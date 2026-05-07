'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import useAuthStore from '@/app/store/authStore';
import AnnouncementCard from '@/app/components/Announcements/AnnouncementCard';
import { FiArrowLeft, FiLoader, FiPlus, FiTrash2, FiEdit2 } from 'react-icons/fi';
import toast from 'react-hot-toast';

function AdminAnnouncementsContent() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuthStore();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
        const response = await fetch('http://localhost:4000/api/announcements', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (data.success) {
          setAnnouncements(data.data);
        } else {
          toast.error(data.message || 'Failed to load announcements');
        }
      } catch (err) {
        console.error('Error fetching announcements:', err);
        toast.error('Error loading announcements');
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, [user, token]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`http://localhost:4000/api/announcements/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setAnnouncements((prev) => prev.filter((ann) => ann.id !== id));
        toast.success('Announcement deleted successfully');
      } else {
        toast.error(data.message || 'Failed to delete announcement');
      }
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Error deleting announcement');
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FiLoader className="inline animate-spin text-blue-600 mb-4" size={32} />
          <p className="text-gray-600">Loading announcements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/dashboard"
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <FiArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Manage Announcements</h1>
                <p className="text-gray-600 mt-1">View and manage all announcements</p>
              </div>
            </div>
            <Link
              href="/admin/announcements/create"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
            >
              <FiPlus size={18} /> Create Announcement
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {announcements.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-600 text-lg">No announcements yet</p>
            <Link
              href="/admin/announcements/create"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
            >
              Create your first announcement
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="relative">
                <AnnouncementCard announcement={announcement} />
                {/* Actions Overlay */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <Link
                    href={`/admin/announcements/${announcement.id}/edit`}
                    className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                  >
                    <FiEdit2 size={18} />
                  </Link>
                  <button
                    onClick={() => handleDelete(announcement.id)}
                    disabled={deletingId === announcement.id}
                    className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition disabled:opacity-50"
                  >
                    {deletingId === announcement.id ? (
                      <FiLoader className="animate-spin" size={18} />
                    ) : (
                      <FiTrash2 size={18} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminAnnouncementsPage() {
  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'HOD', 'PLACEMENT_COORDINATOR']}>
      <AdminAnnouncementsContent />
    </ProtectedRoute>
  );
}
