'use client';

import { useState, useEffect } from 'react';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import DashboardLayout from '@/app/components/DashboardLayout';
import Link from 'next/link';

export default function AdminSIPQuestionsContent() {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<{ id: string; name: string; isActive?: boolean; startDate?: string; endDate?: string }[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<{ id: string; question: string; description?: string; createdAt?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    question: '',
    description: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sessionsResponse = await apiClient.get('/sessions?page=1&limit=100');
        const allSessions: { id: string; name: string; isActive?: boolean; startDate?: string; endDate?: string }[] = sessionsResponse.data.sessions || [];
        setSessions(allSessions);

        if (allSessions.length > 0) {
          const activeSession = allSessions.find(s => s.isActive) || allSessions[0];
          setSelectedSessionId(activeSession.id);
          fetchQuestions(activeSession.id);
        }
      } catch (error) {
        console.error('Error fetching sessions:', error);
        toast.error('Failed to load sessions');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchQuestions = async (sessionId: string) => {
    try {
      const response = await apiClient.get(`/sip-questions/session/${sessionId}`);
      setQuestions(response.data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to load questions');
    }
  };

  const handleSessionChange = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    fetchQuestions(sessionId);
  };

  const handlePostQuestion = async () => {
    if (!formData.question.trim()) {
      toast.error('Please enter a question');
      return;
    }

    if (!selectedSessionId) {
      toast.error('Please select a session');
      return;
    }

    try {
      setPosting(true);
      const response = await apiClient.post('/sip-questions', {
        sessionId: selectedSessionId,
        question: formData.question,
        description: formData.description,
      });

      setQuestions(prev => [response.data.question, ...prev]);
      setFormData({ question: '', description: '' });
      setShowForm(false);
      toast.success('Question posted successfully');
    } catch (error) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to post question');
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      setDeletingId(questionId);
      await apiClient.delete(`/sip-questions/${questionId}`);
      setQuestions(prev => prev.filter(q => q.id !== questionId));
      toast.success('Question deleted successfully');
    } catch (error) {
      toast.error('Failed to delete question');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-900 font-semibold">Loading...</div>;
  }

  return (
    <DashboardLayout title="SIP Questions Management">
      <div className="space-y-6">
        {/* Session Selection */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-700">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Select Session</h3>
          <div className="space-y-2">
            {sessions.map(session => (
              <button
                key={session.id}
                onClick={() => handleSessionChange(session.id)}
                className={`w-full text-left p-4 rounded-lg border-2 transition ${
                  selectedSessionId === session.id
                    ? 'border-blue-700 bg-blue-50'
                    : 'border-gray-300 bg-white hover:border-blue-700'
                }`}
              >
                <p className="font-bold text-gray-900">{session.name}</p>
                <p className="text-gray-600 text-sm font-semibold">
                  {session.startDate ? new Date(session.startDate).toLocaleDateString() : ""} - {session.endDate ? new Date(session.endDate).toLocaleDateString() : ""}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Post New Question */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-700">
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-green-700 text-white px-6 py-3 rounded font-bold hover:bg-green-800 text-base"
          >
            {showForm ? 'Cancel' : 'Post New Question'}
          </button>

          {showForm && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-gray-900 font-bold text-sm mb-2">Question *</label>
                <textarea
                  placeholder="Enter the question..."
                  value={formData.question}
                  onChange={e => setFormData(prev => ({ ...prev, question: e.target.value }))}
                  className="w-full border-2 border-gray-300 rounded px-4 py-3 text-gray-900 font-medium placeholder-gray-600"
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-gray-900 font-bold text-sm mb-2">Description (Optional)</label>
                <textarea
                  placeholder="Add any additional details or instructions..."
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border-2 border-gray-300 rounded px-4 py-3 text-gray-900 font-medium placeholder-gray-600"
                  rows={3}
                />
              </div>
              <button
                onClick={handlePostQuestion}
                disabled={posting}
                className="bg-green-700 text-white px-6 py-3 rounded font-bold hover:bg-green-800 disabled:opacity-50 text-base"
              >
                {posting ? 'Posting...' : 'Post Question'}
              </button>
            </div>
          )}
        </div>

        {/* Questions List */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-6 border-b-2 border-gray-300">
            <h3 className="text-lg font-bold text-gray-900">Questions ({questions.length})</h3>
          </div>

          {questions.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-700 font-semibold">No questions posted yet</p>
            </div>
          ) : (
            <div className="divide-y-2 divide-gray-300">
              {questions.map(question => (
                <div key={question.id} className="p-6 hover:bg-blue-50 transition">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-base text-gray-900">{question.question}</h4>
                      {question.description && (
                        <p className="text-gray-700 text-sm mt-2 font-medium">{question.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Link
                        href={`/admin/sip-questions/${question.id}/answers`}
                        className="bg-blue-700 text-white px-4 py-2 rounded font-bold hover:bg-blue-800 text-sm"
                      >
                        View Answers
                      </Link>
                      <button
                        onClick={() => handleDeleteQuestion(question.id)}
                        disabled={deletingId === question.id}
                        className="bg-red-700 text-white px-4 py-2 rounded font-bold hover:bg-red-800 disabled:opacity-50 text-sm"
                      >
                        {deletingId === question.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-600 text-xs font-semibold">
                    Posted on {question.createdAt ? new Date(question.createdAt).toLocaleDateString() : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
