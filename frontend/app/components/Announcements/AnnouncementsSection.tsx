'use client';

import { useEffect, useState } from 'react';
import AnnouncementCard from './AnnouncementCard';
import { FiLoader } from 'react-icons/fi';

export default function AnnouncementsSection() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:4000/api/announcements/public');
        const data = await response.json();

        if (data.success) {
          setAnnouncements(data.data);
        } else {
          setError('Failed to load announcements');
        }
      } catch (err) {
        console.error('Error fetching announcements:', err);
        setError('Error loading announcements');
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  if (loading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center">
            <FiLoader className="inline animate-spin text-blue-600" size={32} />
            <p className="mt-4 text-gray-600">Loading announcements...</p>
          </div>
        </div>
      </section>
    );
  }

  if (announcements.length === 0) {
    return null; // Don't show section if no announcements
  }

  return (
    <section id="announcements" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4 max-w-6xl">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Latest Announcements</h2>
        <p className="text-gray-600 mb-8">Stay updated with important news and updates from GESoM</p>

        <div className="grid gap-6">
          {announcements.map((announcement) => (
            <AnnouncementCard key={announcement.id} announcement={announcement} />
          ))}
        </div>
      </div>
    </section>
  );
}
