'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiFilter,
  FiSearch,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiPlay,
  FiArrowRight,
  FiFileText,
  FiEye,
} from 'react-icons/fi';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import DashboardLayout from '@/app/components/DashboardLayout';

interface AssignedAssessment {
  id: string;
  title: string;
  description?: string;
  type: 'AUTO_GRADE' | 'MANUAL';
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  deadline?: string;
  totalPoints: number;
  createdAt: string;
  AssessmentQuestions?: Array<{
    id: string;
    questionText: string;
  }>;
  submissions?: Array<{
    id: string;
    status: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';
    totalScore?: number;
    submittedAt?: string;
  }>;
}

type SubmissionStatus = 'not-started' | 'in-progress' | 'submitted' | 'graded';

export default function StudentAssessmentsPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const [assessments, setAssessments] = useState<AssignedAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | 'all'>('all');

  // Redirect if not authenticated or not student
  useEffect(() => {
    if (!currentUser) {
      router.push('/auth/login');
    } else if (currentUser.role !== 'STUDENT') {
      router.push('/dashboard');
    }
  }, [currentUser, router]);

  // Fetch assigned assessments
  const fetchAssessments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/assessments/student/assigned`);
      
      const assessmentList = response.data.assessments || [];
      console.log('Fetched assessments:', assessmentList);
      
      // Debug submissions data
      assessmentList.forEach((assessment: AssignedAssessment) => {
        console.log(`Assessment "${assessment.title}":`, {
          id: assessment.id,
          submissions: assessment.submissions,
          submissionsLength: assessment.submissions?.length || 0,
        });
      });
      
      setAssessments(assessmentList);
    } catch (error: unknown) {
      console.error('Failed to fetch assessments:', error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const load = async () => { await fetchAssessments(); };
    load();
  }, [currentUser, fetchAssessments]);

  const getSubmissionStatus = (assessment: AssignedAssessment): SubmissionStatus => {
    if (!assessment.submissions || assessment.submissions.length === 0) {
      return 'not-started';
    }

    // Check all submissions and get the latest relevant status
    for (let i = assessment.submissions.length - 1; i >= 0; i--) {
      const submission = assessment.submissions[i];
      if (submission.status === 'GRADED') return 'graded';
      if (submission.status === 'SUBMITTED') return 'submitted';
      if (submission.status === 'IN_PROGRESS') return 'in-progress';
    }
    
    return 'not-started';
  };

  const getStatusBadge = (submissionStatus: SubmissionStatus) => {
    const badges = {
      'not-started': {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        icon: FiFileText,
        label: 'Not Started',
      },
      'in-progress': {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        icon: FiClock,
        label: 'In Progress',
      },
      'submitted': {
        bg: 'bg-green-100',
        text: 'text-green-800',
        icon: FiCheckCircle,
        label: 'Submitted',
      },
      'graded': {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        icon: FiCheckCircle,
        label: 'Graded',
      },
    };

    const badge = badges[submissionStatus];
    const Icon = badge.icon;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit ${badge.bg} ${badge.text}`}>
        <Icon size={14} />
        {badge.label}
      </span>
    );
  };

  const isDeadlinePassed = (deadline?: string) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  const getDaysRemaining = (deadline?: string) => {
    if (!deadline) return null;
    const now = new Date();
    const end = new Date(deadline);
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Filter and search logic
  const filteredAssessments = assessments.filter((assessment) => {
    const searchMatch =
      assessment.title.toLowerCase().includes(search.toLowerCase()) ||
      assessment.description?.toLowerCase().includes(search.toLowerCase());

    const submissionStatus = getSubmissionStatus(assessment);
    const statusMatch = statusFilter === 'all' || submissionStatus === statusFilter;

    return searchMatch && statusMatch;
  });

  const handleStartAssessment = (assessmentId: string, submissionStatus: SubmissionStatus) => {
    // Prevent navigation if already submitted
    if (submissionStatus === 'submitted') {
      toast.error('This assessment has already been submitted');
      return;
    }
    
    if (submissionStatus === 'graded') {
      toast.error('This assessment has been graded. View results instead');
      return;
    }
    
    router.push(`/student/assessments/${assessmentId}`);
  };

  if (!currentUser) {
    return null; // Redirect is happening in useEffect
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 py-8 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading assessments...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900">Assessments</h1>
            <p className="text-gray-700 mt-2">View and complete your assigned assessments</p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div className="relative">
                <FiSearch className="absolute left-3 top-3 text-gray-600" />
                <input
                  type="text"
                  placeholder="Search assessments..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as SubmissionStatus | 'all')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="submitted">Submitted</option>
                <option value="graded">Graded</option>
              </select>
            </div>
          </div>

          {/* Assessments List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading assessments...</p>
            </div>
          ) : filteredAssessments.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center shadow-sm">
              <FiFilter size={40} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-700">
                {assessments.length === 0 ? 'No assessments assigned yet' : 'No assessments match your search'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAssessments.map((assessment) => {
                const submissionStatus = getSubmissionStatus(assessment);
                const daysRemaining = getDaysRemaining(assessment.deadline);
                const isOverdue = isDeadlinePassed(assessment.deadline);
                
                console.log(`Rendering assessment ${assessment.title}:`, {
                  submissionStatus,
                  submissions: assessment.submissions,
                  submissionsCount: assessment.submissions?.length || 0,
                });
                
                return (
                  <div
                    key={assessment.id}
                    className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-all p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900">{assessment.title}</h3>
                        {assessment.description && (
                          <p className="text-gray-700 text-sm mt-1 line-clamp-2">{assessment.description}</p>
                        )}
                      </div>
                      {getStatusBadge(submissionStatus)}
                    </div>

                    {/* Assessment Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                      {/* Questions */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-gray-600 text-xs font-semibold uppercase">Questions</p>
                        <p className="text-gray-900 font-medium mt-1">
                          {assessment.AssessmentQuestions?.length || 0}
                        </p>
                      </div>

                      {/* Points */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-gray-600 text-xs font-semibold uppercase">Total Points</p>
                        <p className="text-gray-900 font-medium mt-1">{assessment.totalPoints}</p>
                      </div>

                      {/* Deadline */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-gray-600 text-xs font-semibold uppercase">Deadline</p>
                        {assessment.deadline ? (
                          <div>
                            <p className="text-gray-900 font-medium mt-1">{formatDate(assessment.deadline)}</p>
                            {daysRemaining !== null && daysRemaining >= 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                {daysRemaining === 0 ? 'Due today' : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`}
                              </p>
                            )}
                            {isOverdue && (
                              <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
                                <FiAlertCircle size={12} />
                                Overdue
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-600 text-sm mt-1">No deadline</p>
                        )}
                      </div>

                      {/* Score (if graded) */}
                      {submissionStatus === 'graded' && assessment.submissions?.length ? (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-gray-600 text-xs font-semibold uppercase">Your Score</p>
                          <p className="text-gray-900 font-medium mt-1">
                            {assessment.submissions[0].totalScore || 0}/{assessment.totalPoints}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                      {submissionStatus === 'not-started' ? (
                        <button
                          onClick={() => handleStartAssessment(assessment.id, submissionStatus)}
                          className="flex items-center gap-2 flex-1 justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                        >
                          <FiPlay size={18} />
                          Start Assessment
                        </button>
                      ) : submissionStatus === 'in-progress' ? (
                        <button
                          onClick={() => handleStartAssessment(assessment.id, submissionStatus)}
                          className="flex items-center gap-2 flex-1 justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                        >
                          <FiArrowRight size={18} />
                          Continue Assessment
                        </button>
                      ) : submissionStatus === 'submitted' ? (
                        <button
                          disabled
                          className="flex items-center gap-2 flex-1 justify-center bg-gray-300 text-gray-600 px-4 py-2 rounded-lg font-medium cursor-not-allowed opacity-75"
                        >
                          <FiCheckCircle size={18} />
                          Already Submitted
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartAssessment(assessment.id, submissionStatus)}
                          className="flex items-center gap-2 flex-1 justify-center bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition-colors font-medium"
                        >
                          <FiEye size={18} />
                          View Assessment
                        </button>
                      )}

                      {submissionStatus === 'graded' && (
                        <button
                          onClick={() => router.push(`/student/assessments/${assessment.id}/results`)}
                          className="flex items-center gap-2 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors font-medium border border-purple-300"
                        >
                          View Results
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
