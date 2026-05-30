'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FiArrowLeft, FiCheckCircle, FiClock, FiUser, FiFileText } from 'react-icons/fi';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import DashboardLayout from '@/app/components/DashboardLayout';

interface StudentResponse {
  id: string;
  responseText: string;
  fileUrl?: string;
  status: string;
  submittedAt: string;
  feedback?: string;
  StudentSession: {
    Student: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

interface RequirementDetail {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: string;
}

export default function ViewResponsesPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const requirementId = params.requirementId as string;

  const [requirement, setRequirement] = useState<RequirementDetail | null>(null);
  const [responses, setResponses] = useState<StudentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Redirect if not faculty
  useEffect(() => {
    if (!['FACULTY', 'CHAIR_HEAD', 'MENTOR'].includes(user?.role || '')) {
      router.push('/dashboard');
    }
  }, [user?.role, router]);

  const fetchResponsesData = async () => {
    try {
      setLoading(true);

      // Fetch responses for this requirement
      const response = await apiClient.get(`/mentor/requirements/${requirementId}/responses`);
      console.log('[ViewResponses] Responses:', response.data);

      setResponses(response.data.responses || []);

      // Extract requirement info from first response if available
      if (response.data.responses?.length > 0) {
        const firstResponse = response.data.responses[0];
        if (firstResponse.MentorRequirement) {
          setRequirement(firstResponse.MentorRequirement);
        }
      } else {
        // If no responses, try to fetch requirement details separately
        try {
          const reqDetailsResponse = await apiClient.get(
            `/mentor/teams/requirements/${requirementId}`
          );
          if (reqDetailsResponse.data.requirement) {
            setRequirement(reqDetailsResponse.data.requirement);
          }
        } catch (err) {
          console.warn('Could not fetch requirement details:', err);
        }
      }
    } catch (error) {
      console.error('Failed to fetch responses:', error);
      toast.error('Failed to load responses');
    } finally {
      setLoading(false);
    }
  };

  // Fetch requirement and responses
  useEffect(() => {
    if (requirementId) {
      const load = async () => { await fetchResponsesData(); };
      load();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirementId]);

  const handleProvideFeedback = async (responseId: string) => {
    if (!feedbackText.trim()) {
      toast.error('Please enter feedback');
      return;
    }

    try {
      setSubmittingFeedback(true);
      await apiClient.put(`/mentor/responses/${responseId}/feedback`, {
        feedback: feedbackText,
      });
      toast.success('Feedback provided successfully');

      // Update response in state
      setResponses(
        responses.map(r =>
          r.id === responseId ? { ...r, feedback: feedbackText } : r
        )
      );

      setEditingFeedbackId(null);
      setFeedbackText('');
    } catch (error) {
      console.error('Failed to provide feedback:', error);
      toast.error('Failed to provide feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-600">Loading responses...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-200 rounded-lg transition"
            >
              <FiArrowLeft className="text-2xl" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Student Responses</h1>
              {requirement && <p className="text-gray-600 mt-1">{requirement.title}</p>}
            </div>
          </div>

          {/* Requirement Details */}
          {requirement && (
            <div className="bg-white rounded-lg p-6 mb-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">{requirement.title}</h2>
              <p className="text-gray-700 mb-4">{requirement.description}</p>
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Due: {new Date(requirement.dueDate).toLocaleDateString()}</span>
                <span className={`px-3 py-1 rounded-full font-medium ${
                  requirement.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {requirement.status}
                </span>
              </div>
            </div>
          )}

          {/* Responses List */}
          <div className="space-y-4">
            {responses.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
                <FiFileText className="text-4xl text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No responses submitted yet</p>
              </div>
            ) : (
              <>
                <div className="text-sm text-gray-600 mb-4">
                  {responses.length} response{responses.length !== 1 ? 's' : ''} submitted
                </div>
                {responses.map(response => (
                  <div
                    key={response.id}
                    className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-md transition"
                  >
                    {/* Student Info */}
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                      <FiUser className="text-gray-400 text-lg" />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {response.StudentSession?.Student?.firstName}{' '}
                          {response.StudentSession?.Student?.lastName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {response.StudentSession?.Student?.email}
                        </p>
                      </div>
                      <div className="text-right text-sm text-gray-600">
                        <p>Submitted: {new Date(response.submittedAt).toLocaleDateString()}</p>
                        <span className="inline-flex items-center gap-1 mt-1 text-green-600">
                          <FiCheckCircle /> {response.status}
                        </span>
                      </div>
                    </div>

                    {/* Response Content */}
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Response Text:</h3>
                      <div className="bg-gray-50 p-4 rounded-lg text-gray-800 whitespace-pre-wrap">
                        {response.responseText}
                      </div>
                    </div>

                    {/* File Link */}
                    {response.fileUrl && (
                      <div className="mb-4">
                        <a
                          href={response.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm font-medium flex items-center gap-2"
                        >
                          <FiFileText /> View Uploaded File
                        </a>
                      </div>
                    )}

                    {/* Feedback Section */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Your Feedback:</h3>

                      {response.feedback && editingFeedbackId !== response.id ? (
                        <div className="mb-3">
                          <p className="text-gray-800">{response.feedback}</p>
                          <button
                            onClick={() => {
                              setEditingFeedbackId(response.id);
                              setFeedbackText(response.feedback || '');
                            }}
                            className="text-sm text-blue-600 hover:underline mt-2"
                          >
                            Edit Feedback
                          </button>
                        </div>
                      ) : (
                        <>
                          <textarea
                            value={
                              editingFeedbackId === response.id
                                ? feedbackText
                                : response.feedback || ''
                            }
                            onChange={e => setFeedbackText(e.target.value)}
                            disabled={editingFeedbackId !== response.id}
                            placeholder="Click 'Provide Feedback' to add feedback..."
                            rows={3}
                            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-white disabled:cursor-default"
                          />
                          {editingFeedbackId === response.id && (
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => handleProvideFeedback(response.id)}
                                disabled={submittingFeedback}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                              >
                                {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingFeedbackId(null);
                                  setFeedbackText('');
                                }}
                                disabled={submittingFeedback}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                          {!editingFeedbackId && !response.feedback && (
                            <button
                              onClick={() => {
                                setEditingFeedbackId(response.id);
                                setFeedbackText('');
                              }}
                              className="text-sm text-blue-600 hover:underline mt-2 font-medium"
                            >
                              Provide Feedback
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
