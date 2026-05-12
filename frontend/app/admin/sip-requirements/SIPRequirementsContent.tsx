'use client';

import { useState, useEffect } from 'react';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import DashboardLayout from '@/app/components/DashboardLayout';

export default function SIPRequirementsContent() {
  const { user } = useAuthStore();
  const [requirements, setRequirements] = useState<{ id: string; title?: string; companyName?: string; jobRole?: string; description?: string; location?: string; stipend?: string; type?: string }[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    companyName: '',
    jobRole: '',
    location: '',
    stipend: '',
    type: 'ON_CAMPUS',
    requirements: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sessions = await apiClient.get('/sessions?page=1&limit=100');
        if (sessions.data && sessions.data.sessions && sessions.data.sessions.length > 0) {
          const activeSession = sessions.data.sessions.find((s: { id: string; isActive?: boolean }) => s.isActive) || sessions.data.sessions[0];
          setSessionId(activeSession.id);

          const reqs = await apiClient.get(`/sip-requirements/${activeSession.id}`);
          setRequirements(reqs.data);
        }
      } catch (error) {
        console.error('Error fetching requirements:', error);
        toast.error('Failed to load requirements');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handlePostRequirement = async () => {
    if (!sessionId) {
      toast.error('No active session found');
      return;
    }

    try {
      setPosting(true);
      const payload = {
        ...formData,
        sessionId,
      };
      const response = await apiClient.post('/sip-requirements', payload);
      setRequirements(prev => [response.data.requirement, ...prev]);
      setFormData({
        title: '',
        description: '',
        companyName: '',
        jobRole: '',
        location: '',
        stipend: '',
        type: 'ON_CAMPUS',
        requirements: [],
      });
      setShowForm(false);
      toast.success('Requirement posted successfully');
    } catch (error) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to post requirement');
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteRequirement = async (requirementId: string) => {
    try {
      await apiClient.delete(`/sip-requirements/${requirementId}`);
      setRequirements(prev => prev.filter(r => r.id !== requirementId));
      toast.success('Requirement deleted');
    } catch (error) {
      toast.error('Failed to delete requirement');
    }
  };

  if (loading) return <div className="text-center py-8 text-gray-900 font-bold text-lg">Loading...</div>;

  return (
    <DashboardLayout title="SIP Requirements">
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-700">
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-700 text-white px-6 py-3 rounded font-bold hover:bg-blue-800 text-base"
          >
            {showForm ? 'Cancel' : 'Post New Requirement'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-700">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Post Internship Requirement</h3>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Title"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="col-span-2 border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-600"
              />
              <input
                type="text"
                placeholder="Company Name"
                value={formData.companyName}
                onChange={e => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                className="col-span-1 border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-600"
              />
              <input
                type="text"
                placeholder="Job Role"
                value={formData.jobRole}
                onChange={e => setFormData(prev => ({ ...prev, jobRole: e.target.value }))}
                className="col-span-1 border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-600"
              />
              <input
                type="text"
                placeholder="Location"
                value={formData.location}
                onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="col-span-1 border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-600"
              />
              <input
                type="number"
                placeholder="Stipend (INR)"
                value={formData.stipend}
                onChange={e => setFormData(prev => ({ ...prev, stipend: e.target.value }))}
                className="col-span-1 border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-600"
              />
              <select
                value={formData.type}
                onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="col-span-2 border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-bold"
              >
                <option value="ON_CAMPUS">On Campus</option>
                <option value="OFF_CAMPUS">Off Campus</option>
                <option value="CORPORATE">Corporate</option>
                <option value="FAMILY_BUSINESS">Family Business</option>
                <option value="ENTREPRENEURSHIP">Entrepreneurship</option>
                <option value="SOCIAL_INTERNSHIP">Social Internship</option>
                <option value="GOVT_PROJECTS">Govt. Projects</option>
              </select>
              <textarea
                placeholder="Description"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="col-span-2 border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-600"
                rows={4}
              />
            </div>
            <button
              onClick={handlePostRequirement}
              disabled={posting}
              className="mt-4 bg-green-700 text-white px-6 py-3 rounded font-bold hover:bg-green-800 disabled:opacity-50 text-base"
            >
              {posting ? 'Posting...' : 'Post Requirement'}
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-6 border-b-2 border-gray-300">
            <h3 className="text-xl font-bold text-gray-900">Open Requirements</h3>
            <p className="text-gray-700 text-base font-semibold mt-1">{requirements.length} positions available</p>
          </div>

          {requirements.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-900 font-bold text-base">No requirements posted yet</p>
            </div>
          ) : (
            <div className="divide-y-2 divide-gray-300">
              {requirements.map(req => (
                <div key={req.id} className="p-6 hover:bg-blue-50 transition border-l-4 border-blue-300">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-bold text-lg text-gray-900">{req.title}</h4>
                      <p className="text-gray-700 text-base font-semibold mt-1">{req.companyName}</p>
                      <div className="mt-4 grid grid-cols-2 gap-4 text-base">
                        <div>
                          <span className="text-gray-700 font-bold">Role:</span> <span className="text-gray-900 font-semibold">{req.jobRole}</span>
                        </div>
                        <div>
                          <span className="text-gray-700 font-bold">Location:</span> <span className="text-gray-900 font-semibold">{req.location}</span>
                        </div>
                        <div>
                          <span className="text-gray-700 font-bold">Stipend:</span> <span className="text-gray-900 font-semibold">₹{req.stipend}</span>
                        </div>
                        <div>
                          <span className="text-gray-700 font-bold">Type:</span>{' '}
                          <span className="bg-blue-200 text-blue-900 px-3 py-1 rounded text-sm font-bold">{req.type}</span>
                        </div>
                      </div>
                      {req.description && <p className="text-gray-900 mt-4 font-semibold">{req.description}</p>}
                    </div>
                    <button
                      onClick={() => handleDeleteRequirement(req.id)}
                      className="text-red-700 hover:text-red-900 text-base font-bold underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
