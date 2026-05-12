'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FiArrowLeft,
  FiDownload,
  FiEye,
  FiEdit3,
  FiCheck,
  FiX,
  FiBarChart2,
  FiPlus,
} from 'react-icons/fi';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import DashboardLayout from '@/app/components/DashboardLayout';

interface Assessment {
  id: string;
  title: string;
  totalPoints: number;
  status: string;
}

interface RubricCriteria {
  id: string;
  criteriaName: string;
  description?: string;
  maxPoints: number;
}

interface RubricScore {
  id: string;
  submissionId: string;
  rubricCriteriaId: string;
  score: number;
  feedback?: string;
  RubricCriteria?: RubricCriteria;
}

interface AssessmentSubmission {
  id: string;
  assessmentId: string;
  studentSessionId: string;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';
  totalScore?: number;
  submittedAt?: string;
  gradedAt?: string;
  StudentSession?: {
    id: string;
    Student: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  GradedByUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  AssessmentResponses?: Array<{
    id: string;
    questionId: string;
    response: string;
    fileUrl?: string;
    score?: number;
    isCorrect?: boolean;
    feedback?: string;
    AssessmentQuestion?: {
      questionType: 'TEXT' | 'MCQ' | 'FILE';
      questionText: string;
    };
  }>;
  RubricScores?: RubricScore[];
}

interface ResultsStats {
  totalSubmissions: number;
  submittedCount: number;
  gradedCount: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
}

interface StudentUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  studentSessionId?: string;
}

export default function AssessmentResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const assessmentId = params.assessmentId as string;

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [submissions, setSubmissions] = useState<AssessmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ResultsStats | null>(null);
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'date'>('name');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'GRADED'>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedStudentSessionId, setSelectedStudentSessionId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [allUsers, setAllUsers] = useState<StudentUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<StudentUser[]>([]);
  const [creatingSubmission, setCreatingSubmission] = useState(false);
  const [selectedUserError, setSelectedUserError] = useState<string>('');

  // Fetch Assessment and Results
  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/assessments/${assessmentId}/results`);

      setAssessment(response.data.assessment);
      const subs = response.data.submissions || [];
      setSubmissions(subs);

      // Calculate stats
      if (subs.length > 0) {
        const submitted = subs.filter((s: AssessmentSubmission) => s.submittedAt);
        const graded = subs.filter((s: AssessmentSubmission) => s.status === 'GRADED');
        
        // Extract valid scores from graded submissions, converting strings to numbers
        const scores = graded
          .map((s: AssessmentSubmission) => {
            const score = typeof s.totalScore === 'string' ? parseFloat(s.totalScore) : s.totalScore;
            return score;
          })
          .filter((score: number | null | undefined): score is number => typeof score === 'number' && !isNaN(score) && score !== null && score !== undefined);

        setStats({
          totalSubmissions: subs.length,
          submittedCount: submitted.length,
          gradedCount: graded.length,
          averageScore: scores.length > 0 ? Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10) / 10 : 0,
          highestScore: scores.length > 0 ? Math.max(...scores) : 0,
          lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
        });
      }
    } catch (error: unknown) {
      console.error('Failed to fetch results:', error);
      if ((error as { response?: { status?: number } }).response?.status === 403) {
        toast.error('You do not have access to view results');
        router.push('/admin/assessments');
      } else {
        toast.error('Failed to load results');
      }
    } finally {
      setLoading(false);
    }
  }, [assessmentId, router]);

  useEffect(() => {
    if (!currentUser) return;
    const load = async () => { await fetchResults(); };
    load();
  }, [currentUser, fetchResults]);

  // Fetch all users for searching
  const fetchAllUsers = async () => {
    try {
      const response = await apiClient.get(`/users?role=STUDENT&limit=1000`);
      const users: StudentUser[] = response.data.users || [];
      
      // Map to include placeholder for session ID - will be fetched as needed
      const usersWithSessions = users.map(user => ({
        ...user,
        studentSessionId: '' // Will be populated when user is selected
      }));
      
      setAllUsers(usersWithSessions);
      setFilteredUsers(usersWithSessions);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    }
  };

  // Filter users based on search query
  const handleSearchUsers = (query: string) => {
    setSearchQuery(query);
    const filtered = allUsers.filter((user) => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const email = user.email.toLowerCase();
      const q = query.toLowerCase();
      return fullName.includes(q) || email.includes(q);
    });
    setFilteredUsers(filtered);
  };

  // Check if user already has submission for this assessment
  const getUserSubmissionStatus = (userId: string) => {
    // Find if this user has a student session with a submission
    const userSubmission = submissions.find((sub) => {
      return sub.StudentSession?.Student?.id === userId;
    });
    return userSubmission;
  };

  const handleSelectUser = (userId: string) => {
    setSelectedStudentId(userId);
    const existingSubmission = getUserSubmissionStatus(userId);
    if (existingSubmission) {
      setSelectedUserError(`This student already has a ${existingSubmission.status} submission`);
      setSelectedStudentSessionId(existingSubmission.studentSessionId);
    } else {
      setSelectedUserError('');
      // For users without submissions, use their userId
      setSelectedStudentSessionId(userId);
    }
  };

  const handleCreateSubmission = async () => {
    if (!selectedStudentId) {
      toast.error('Please select a student');
      return;
    }

    if (selectedUserError) {
      toast.error(selectedUserError);
      return;
    }

    try {
      setCreatingSubmission(true);
      
      // Send userId and let backend find the latest student session
      const response = await apiClient.post(`/assessments/${assessmentId}/submissions`, {
        userId: selectedStudentId,
      });
      
      toast.success('Submission created successfully');
      setShowCreateModal(false);
      setSelectedStudentId('');
      setSelectedStudentSessionId('');
      setSearchQuery('');
      setSelectedUserError('');
      fetchResults();
    } catch (error: unknown) {
      console.error('Failed to create submission:', error);
      const axiosError = error as { response?: { data?: { message?: string; code?: string } } };
      const errorMessage = axiosError.response?.data?.message || 'Failed to create submission';
      toast.error(errorMessage);
      if (axiosError.response?.data?.code === 'SUBMISSION_EXISTS') {
        setSelectedUserError(errorMessage);
      }
    } finally {
      setCreatingSubmission(false);
    }
  };

  const handleOpenCreateModal = async () => {
    setShowCreateModal(true);
    setSelectedStudentId('');
    setSelectedStudentSessionId('');
    setSearchQuery('');
    setSelectedUserError('');
    await fetchAllUsers();
  };

  const getSortedSubmissions = () => {
    let sorted = [...submissions];

    // Always exclude IN_PROGRESS submissions from results view
    sorted = sorted.filter((s) => s.status !== 'IN_PROGRESS');

    // Filter by status
    if (statusFilter !== 'ALL') {
      sorted = sorted.filter((s) => s.status === statusFilter);
    }

    // Sort
    switch (sortBy) {
      case 'score':
        sorted.sort((a, b) => {
          const scoreA = a.totalScore || 0;
          const scoreB = b.totalScore || 0;
          return scoreB - scoreA;
        });
        break;
      case 'date':
        sorted.sort((a, b) => {
          const dateA = new Date(a.submittedAt || 0).getTime();
          const dateB = new Date(b.submittedAt || 0).getTime();
          return dateB - dateA;
        });
        break;
      case 'name':
      default:
        sorted.sort((a, b) => {
          const nameA = `${a.StudentSession?.Student?.firstName || ''} ${a.StudentSession?.Student?.lastName || ''}`;
          const nameB = `${b.StudentSession?.Student?.firstName || ''} ${b.StudentSession?.Student?.lastName || ''}`;
          return nameA.localeCompare(nameB);
        });
    }

    return sorted;
  };

  const downloadResults = async () => {
    // Filter only submitted assessments (including graded ones, since they were submitted)
    const submittedAssessments = submissions.filter((s) => 
      s.status === 'SUBMITTED' || s.status === 'GRADED'
    );

    if (submittedAssessments.length === 0) {
      toast.error('No submitted assessments to download');
      return;
    }

    // Get all unique questions across all submissions
    const questionsMap = new Map<string, { id: string; text: string; type: string }>();
    submittedAssessments.forEach((submission) => {
      submission.AssessmentResponses?.forEach((response) => {
        if (!questionsMap.has(response.questionId)) {
          questionsMap.set(response.questionId, {
            id: response.questionId,
            text: response.AssessmentQuestion?.questionText || 'Unknown Question',
            type: response.AssessmentQuestion?.questionType || 'N/A',
          });
        }
      });
    });

    const questions = Array.from(questionsMap.values()).sort((a, b) => {
      // Sort by question order (extract number from question text if possible)
      const aNum = parseInt(a.text.match(/\d+/)?.[0] || '0');
      const bNum = parseInt(b.text.match(/\d+/)?.[0] || '0');
      return aNum - bNum;
    });

    // Fetch all rubrics for this assessment to get all criteria
    let allCriteria: RubricCriteria[] = [];
    try {
      const rubricsResponse = await apiClient.get(`/rubrics?assessmentId=${assessmentId}`);
      if (rubricsResponse.data.rubrics && Array.isArray(rubricsResponse.data.rubrics)) {
        const criteriaMap = new Map<string, RubricCriteria>();
        rubricsResponse.data.rubrics.forEach((rubric: { RubricCriteria?: RubricCriteria[] }) => {
          if (rubric.RubricCriteria && Array.isArray(rubric.RubricCriteria)) {
            rubric.RubricCriteria.forEach((criterion: RubricCriteria) => {
              if (!criteriaMap.has(criterion.id)) {
                criteriaMap.set(criterion.id, criterion);
              }
            });
          }
        });
        allCriteria = Array.from(criteriaMap.values());
      }
    } catch (error) {
      console.log('No rubrics found or error fetching rubrics');
    }

    // Also get criteria from submissions' RubricScores in case they're not in rubrics
    submittedAssessments.forEach((submission) => {
      submission.RubricScores?.forEach((rubricScore) => {
        if (rubricScore.RubricCriteria && 
            !allCriteria.find(c => c.id === rubricScore.RubricCriteria?.id)) {
          allCriteria.push(rubricScore.RubricCriteria);
        }
      });
    });

    // Build header row: Name, Email, Q Responses, Criteria Grades, Submission Time, Grading Time
    const headers = [
      'Name',
      'Email',
      ...questions.map((q, idx) => `Q${idx + 1}`),
      ...allCriteria.map((c) => `${c.criteriaName}`),
      'Submission Time',
      'Grading Time',
    ];

    // Build data rows
    const rows: string[] = [];
    rows.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','));

    submittedAssessments.forEach((submission) => {
      const studentName = submission.StudentSession?.Student 
        ? `${submission.StudentSession.Student.firstName} ${submission.StudentSession.Student.lastName}`
        : 'N/A';
      const studentEmail = submission.StudentSession?.Student?.email || 'N/A';
      const submittedAt = submission.submittedAt
        ? new Date(submission.submittedAt).toLocaleString()
        : 'N/A';
      const gradedAt = submission.gradedAt
        ? new Date(submission.gradedAt).toLocaleString()
        : 'N/A';

      // Create response map for quick lookup
      const responseMap = new Map<string, { response: string; fileUrl?: string }>();
      submission.AssessmentResponses?.forEach((response) => {
        responseMap.set(response.questionId, response);
      });

      // Create rubric score map for quick lookup
      const rubricScoreMap = new Map<string, RubricScore>();
      submission.RubricScores?.forEach((rubricScore) => {
        if (rubricScore.RubricCriteria) {
          rubricScoreMap.set(rubricScore.RubricCriteria.id, rubricScore);
        }
      });

      // Build question response data
      const questionResponses = questions.map((q) => {
        const response = responseMap.get(q.id);
        if (!response) return '';
        
        let responseText = '';
        if (response.fileUrl) {
          responseText = `[File: ${response.fileUrl}]`;
        } else if (response.response) {
          responseText = response.response;
        } else {
          responseText = 'No response';
        }
        
        return responseText;
      });

      // Build criteria grades data
      const criteriaGrades = allCriteria.map((c) => {
        const rubricScore = rubricScoreMap.get(c.id);
        if (!rubricScore) return '';
        return rubricScore.score;
      });

      // Build complete row data: Name, Email, Q Responses, Criteria Grades, Submission Time, Grading Time
      const rowData = [
        studentName,
        studentEmail,
        ...questionResponses,
        ...criteriaGrades,
        submittedAt,
        gradedAt,
      ];

      rows.push(rowData.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','));
    });

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${assessment?.title}-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success(`Downloaded ${submittedAssessments.length} submitted assessment(s)`);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading results...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!assessment) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-600">Assessment not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const sortedSubmissions = getSortedSubmissions();

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/admin/assessments/${assessmentId}`)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <FiArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{assessment.title}</h1>
                <p className="text-gray-600">Results & Submissions</p>
              </div>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              <FiPlus size={18} />
              Create Submission
            </button>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-gray-600 text-sm">Total Assigned</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSubmissions}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-gray-600 text-sm">Submitted</p>
                <p className="text-2xl font-bold text-blue-600">{stats.submittedCount}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-gray-600 text-sm">Graded</p>
                <p className="text-2xl font-bold text-green-600">{stats.gradedCount}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-gray-600 text-sm">Average Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.averageScore.toFixed(1)}/{assessment.totalPoints}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-gray-600 text-sm">Highest Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.highestScore}/{assessment.totalPoints}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-gray-600 text-sm">Lowest Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.lowestScore}/{assessment.totalPoints}
                </p>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 flex gap-4 justify-between items-center flex-wrap">
            <div className="flex gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'SUBMITTED' | 'GRADED')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Status</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="GRADED">Graded</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'score' | 'date')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">Sort by Name</option>
                <option value="score">Sort by Score</option>
                <option value="date">Sort by Date</option>
              </select>
            </div>

            <button
              onClick={() => downloadResults()}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <FiDownload size={18} />
              Download CSV
            </button>
          </div>

          {/* Submissions List */}
          {sortedSubmissions.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <FiBarChart2 className="mx-auto text-gray-400 mb-4" size={40} />
              <p className="text-gray-600">No submissions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-all overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {submission.StudentSession?.Student
                              ? `${submission.StudentSession.Student.firstName} ${submission.StudentSession.Student.lastName}`
                              : 'Unknown Student'}
                          </h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              submission.status === 'GRADED'
                                ? 'bg-green-100 text-green-800'
                                : submission.status === 'SUBMITTED'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {submission.status}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 mt-1">
                          {submission.StudentSession?.Student?.email}
                        </p>

                        <div className="flex gap-6 mt-3 text-sm">
                          {submission.submittedAt && (
                            <div>
                              <p className="text-gray-600">Submitted</p>
                              <p className="font-medium text-gray-900">
                                {new Date(submission.submittedAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          )}

                          {submission.status === 'GRADED' && submission.totalScore !== null && (
                            <div>
                              <p className="text-gray-600">Score</p>
                              <p className="font-bold text-lg text-gray-900">
                                {submission.totalScore}/{assessment.totalPoints}
                              </p>
                            </div>
                          )}

                          {submission.gradedAt && (
                            <div>
                              <p className="text-gray-600">Graded By</p>
                              <p className="font-medium text-gray-900">
                                {submission.GradedByUser
                                  ? `${submission.GradedByUser.firstName} ${submission.GradedByUser.lastName}`
                                  : 'Unknown'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setExpandedSubmission(
                              expandedSubmission === submission.id ? null : submission.id
                            )
                          }
                          className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <FiEye size={18} />
                          <span className="text-sm">View</span>
                        </button>

                        {submission.status !== 'GRADED' && (
                          <button
                            onClick={() => router.push(`/admin/assessments/${assessmentId}/submissions/${submission.id}/grade`)}
                            className="flex items-center gap-2 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          >
                            <FiEdit3 size={18} />
                            <span className="text-sm">Grade</span>
                          </button>
                        )}

                        {submission.status === 'GRADED' && (
                          <button
                            onClick={() => router.push(`/admin/assessments/${assessmentId}/submissions/${submission.id}/view-grade`)}
                            className="flex items-center gap-2 px-4 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <FiCheck size={18} />
                            <span className="text-sm">View Grade</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedSubmission === submission.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-3">Answers</h4>
                        <div className="space-y-3">
                          {submission.AssessmentResponses?.map((response, idx) => (
                            <div
                              key={response.id}
                              className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">Question {idx + 1}</p>
                                  {response.AssessmentQuestion?.questionType === 'FILE' && response.fileUrl ? (
                                    <div className="mt-1 flex items-center gap-2">
                                      <a
                                        href={response.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1 text-sm"
                                      >
                                        <FiDownload size={14} />
                                        {response.response || 'Download File'}
                                      </a>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-600 mt-1">{response.response}</p>
                                  )}
                                </div>
                                {response.isCorrect !== null && (
                                  <div className="flex items-center gap-1 ml-3">
                                    {response.isCorrect ? (
                                      <FiCheck className="text-green-600" />
                                    ) : (
                                      <FiX className="text-red-600" />
                                    )}
                                    {response.score !== null && (
                                      <span className="text-sm font-medium text-gray-900">
                                        {response.score} pts
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              {response.feedback && (
                                <p className="text-xs text-gray-600 mt-2 italic">{response.feedback}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Submission Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-lg flex-shrink-0">
                <h2 className="text-xl font-bold text-white">Create New Submission</h2>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Search Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Students
                  </label>
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => handleSearchUsers(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Users List */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Student
                  </label>
                  <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
                    {filteredUsers.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        <p className="text-sm">No students found</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {filteredUsers.map((user) => {
                          const existingSubmission = getUserSubmissionStatus(user.id);
                          const isDisabled = !!existingSubmission;
                          const isSelected = selectedStudentId === user.id;

                          return (
                            <button
                              key={user.id}
                              onClick={() => !isDisabled && handleSelectUser(user.id)}
                              disabled={isDisabled}
                              className={`w-full text-left px-4 py-3 border-b border-gray-200 transition-colors ${
                                isSelected
                                  ? 'bg-blue-50 border-l-4 border-l-blue-600'
                                  : isDisabled
                                    ? 'bg-gray-50 cursor-not-allowed opacity-60'
                                    : 'hover:bg-gray-50 cursor-pointer'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900">
                                    {user.firstName} {user.lastName}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                </div>
                                {existingSubmission && (
                                  <span
                                    className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                                      existingSubmission.status === 'GRADED'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}
                                  >
                                    {existingSubmission.status}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Error or Info Message */}
                {selectedStudentId && selectedUserError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-700">{selectedUserError}</p>
                  </div>
                )}

                {selectedStudentId && !selectedUserError && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-700">
                      ✓ Ready to create submission for this student
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 px-6 py-4 border-t border-gray-200 justify-end flex-shrink-0">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedStudentId('');
                    setSearchQuery('');
                    setSelectedUserError('');
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSubmission}
                  disabled={!selectedStudentId || creatingSubmission || !!selectedUserError}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
                >
                  {creatingSubmission ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
