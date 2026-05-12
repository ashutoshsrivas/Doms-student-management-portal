'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiUser, FiFileText, FiCheckCircle, FiClock, FiUpload } from 'react-icons/fi';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import DashboardLayout from '@/app/components/DashboardLayout';

interface Mentor {
  MentorTeam: {
    id: string;
    teamName: string;
    description: string;
    Faculty?: {
      id?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      department?: string;
    };
  };
}

interface Requirement {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: string;
  MentorTeam: {
    Faculty: {
      firstName: string;
      lastName: string;
    };
  };
  MentorResponses: Array<{
    id: string;
    studentSessionId: string;
    responseText?: string;
    fileUrl?: string;
    feedback?: string;
  }>;
}

export default function StudentMentorPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [studentSessionId, setStudentSessionId] = useState('');
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseForm, setResponseForm] = useState({
    responseText: '',
    file: null as File | null,
  });
  const [submitting, setSubmitting] = useState(false);

  // Redirect if not student
  useEffect(() => {
    if (user?.role !== 'STUDENT') {
      router.push('/dashboard');
    }
  }, [user?.role, router]);

  const fetchMentorsAndRequirements = async (ssId: string) => {
    try {
      setLoading(true);

      // Fetch mentors
      const mentorsResponse = await apiClient.get('/mentor/student-mentors', {
        params: { studentSessionId: ssId },
      });
      console.log('[Student Mentors] Mentors response:', mentorsResponse.data);
      setMentors(mentorsResponse.data.mentors || []);

      // Fetch requirements
      const reqResponse = await apiClient.get('/mentor/student-requirements', {
        params: { studentSessionId: ssId },
      });
      console.log('[Student Requirements] Requirements response:', reqResponse.data);
      setRequirements(reqResponse.data.requirements || []);
    } catch (error) {
      console.error('Failed to fetch mentors and requirements:', error);
      toast.error('Failed to load mentor information');
    } finally {
      setLoading(false);
    }
  };

  // Get student session ID and fetch data
  useEffect(() => {
    const getStudentSession = async () => {
      try {
        const response = await apiClient.get('/sessions/me/session');
        const sessionId = response.data.studentSessionId;
        setStudentSessionId(sessionId);
        fetchMentorsAndRequirements(sessionId);
      } catch (error) {
        console.error('Failed to get student session:', error);
        toast.error('Failed to load student session');
      }
    };

    if (user?.id) {
      getStudentSession();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRequirement || (!responseForm.responseText && !responseForm.file)) {
      toast.error('Please provide a response (text or file)');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('responseText', responseForm.responseText);
      formData.append('studentSessionId', studentSessionId);
      if (responseForm.file) {
        formData.append('file', responseForm.file);
      }

      console.log('[handleSubmitResponse] Submitting with file:', {
        hasFile: !!responseForm.file,
        fileName: responseForm.file?.name,
        fileSize: responseForm.file?.size,
      });

      const response = await apiClient.post(
        `/mentor/requirements/${selectedRequirement.id}/respond`,
        formData
      );

      toast.success('Response submitted successfully');
      setShowResponseModal(false);
      setResponseForm({ responseText: '', file: null });
      setSelectedRequirement(null);
      fetchMentorsAndRequirements(studentSessionId);
    } catch (error) {
      console.error('Failed to submit response:', error);
      toast.error('Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || user.role !== 'STUDENT') {
    return null;
  }

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  return (
    <DashboardLayout title="My Mentors">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-8">My Mentors & Requirements</h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-700 font-medium">Loading mentor information...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Mentors Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-indigo-500">
                <h2 className="text-xl font-bold text-indigo-900 mb-4 flex items-center gap-2 pb-3 border-b-2 border-indigo-200">
                  <FiUser className="text-indigo-600" /> My Mentors
                </h2>

                {mentors.length === 0 ? (
                  <p className="text-gray-600 text-sm py-4 font-medium">No mentors assigned yet</p>
                ) : (
                  <div className="space-y-4">
                    {mentors.map((mentor, idx) => (
                      <div key={idx} className="p-4 border-2 border-indigo-200 rounded-lg bg-gradient-to-br from-indigo-50 to-blue-50 hover:shadow-md transition">
                        <p className="font-bold text-indigo-900">
                          {mentor.MentorTeam?.Faculty?.firstName} {mentor.MentorTeam?.Faculty?.lastName}
                        </p>
                        <p className="text-xs text-indigo-700 mt-1">{mentor.MentorTeam?.Faculty?.email}</p>
                        {mentor.MentorTeam?.Faculty?.department && (
                          <p className="text-xs text-indigo-600">{mentor.MentorTeam?.Faculty?.department}</p>
                        )}
                        <p className="text-xs text-indigo-700 font-medium mt-2">Team: {mentor.MentorTeam?.teamName}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Requirements Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
                <h2 className="text-xl font-bold text-blue-900 mb-6 flex items-center gap-2 pb-3 border-b-2 border-blue-200">
                  <FiFileText className="text-blue-600" /> My Requirements
                </h2>

                {requirements.length === 0 ? (
                  <div className="text-center py-12">
                    <FiFileText className="text-4xl text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No requirements posted yet</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Your mentors will post requirements here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requirements.map(req => {
                      const myResponse = req.MentorResponses?.find(
                        r => r.studentSessionId === studentSessionId
                      );
                      const isOverdueDate = req.dueDate && isOverdue(req.dueDate);

                      return (
                        <div
                          key={req.id}
                          className="p-6 border-2 border-gray-300 rounded-lg hover:shadow-lg transition bg-white hover:border-blue-400"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="font-bold text-lg text-gray-900 flex-1">{req.title}</h3>
                            <span
                              className={`text-xs px-3 py-1 rounded-full font-bold ${
                                myResponse
                                  ? 'bg-green-200 text-green-900'
                                  : isOverdueDate
                                    ? 'bg-red-200 text-red-900'
                                    : 'bg-amber-200 text-amber-900'
                              }`}
                            >
                              {myResponse ? (
                                <span className="flex items-center gap-1">
                                  <FiCheckCircle /> Responded
                                </span>
                              ) : isOverdueDate ? (
                                'Overdue'
                              ) : (
                                'Pending'
                              )}
                            </span>
                          </div>

                          <p className="text-base text-gray-800 mb-4 leading-relaxed">{req.description}</p>

                          <div className="flex justify-between items-center text-sm text-gray-700 mb-4 pb-4 border-b-2 border-gray-200">
                            <span className="font-medium">
                              Mentor: <span className="text-blue-700">{req.MentorTeam?.Faculty?.firstName}{' '}
                              {req.MentorTeam?.Faculty?.lastName}</span>
                            </span>
                            {req.dueDate && (
                              <span className={`font-bold ${isOverdueDate ? 'text-red-600' : 'text-gray-600'}`}>
                                Due: {new Date(req.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          {/* Response Status */}
                          {myResponse ? (
                            <div className="bg-emerald-50 p-4 rounded-lg text-sm border-2 border-emerald-300">
                              <p className="font-bold text-emerald-900 mb-2">✓ Your Response:</p>
                              {myResponse.responseText && (
                                <p className="text-emerald-900 mb-3 whitespace-pre-wrap">{myResponse.responseText}</p>
                              )}
                              {myResponse.fileUrl && (
                                <a
                                  href={myResponse.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-700 hover:text-emerald-900 underline text-sm font-bold"
                                >
                                  View Uploaded File
                                </a>
                              )}
                              {myResponse.feedback && (
                                <div className="mt-4 pt-4 border-t-2 border-emerald-400">
                                  <p className="font-bold text-emerald-900 mb-2">💬 Mentor Feedback:</p>
                                  <p className="text-emerald-800 bg-emerald-100/50 p-2 rounded">{myResponse.feedback}</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedRequirement(req);
                                setShowResponseModal(true);
                              }}
                              className="w-full px-4 py-3 text-base font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg transition flex items-center justify-center gap-2 shadow-md"
                            >
                              <FiUpload /> Submit Response
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Response Modal */}
        {showResponseModal && selectedRequirement && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
              <h2 className="text-2xl font-bold mb-2">{selectedRequirement.title}</h2>
              <p className="text-gray-600 text-sm mb-6">
                Mentor: {selectedRequirement.MentorTeam?.Faculty?.firstName}{' '}
                {selectedRequirement.MentorTeam?.Faculty?.lastName}
              </p>

              <form onSubmit={handleSubmitResponse}>
                <div className="space-y-4">
                  {/* Response Text */}
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Your Response (Text)
                    </label>
                    <textarea
                      value={responseForm.responseText}
                      onChange={e =>
                        setResponseForm(prev => ({ ...prev, responseText: e.target.value }))
                      }
                      placeholder="Type your response here..."
                      rows={6}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:border-gray-400 transition shadow-sm"
                    />
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Upload File (Optional)
                    </label>
                    <div className="border-2 border-dashed border-blue-400 rounded-lg p-8 text-center cursor-pointer hover:border-blue-600 hover:bg-blue-50 transition bg-blue-50/30 shadow-sm">
                      <input
                        type="file"
                        onChange={e => {
                          setResponseForm(prev => ({
                            ...prev,
                            file: e.target.files?.[0] || null,
                          }));
                        }}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer block">
                        <FiUpload className="text-4xl text-blue-500 mx-auto mb-3 font-bold" />
                        <p className="text-base font-semibold text-gray-800">
                          {responseForm.file ? (
                            <span className="text-green-600">✓ {responseForm.file.name}</span>
                          ) : (
                            'Click to upload or drag and drop'
                          )}
                        </p>
                        <p className="text-xs text-gray-600 mt-2 font-medium">PDF, DOC, Image, or other files up to 100MB</p>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting...' : 'Submit Response'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowResponseModal(false);
                      setSelectedRequirement(null);
                      setResponseForm({ responseText: '', file: null });
                    }}
                    className="flex-1 px-4 py-3 border-2 border-gray-400 text-gray-900 rounded-lg hover:bg-gray-100 hover:border-gray-500 transition font-bold shadow-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
