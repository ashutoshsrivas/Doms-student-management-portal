'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FiArrowLeft,
  FiDownload,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
} from 'react-icons/fi';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import DashboardLayout from '@/app/components/DashboardLayout';

interface RubricCriteria {
  id: string;
  criteriaName: string;
  description?: string;
  maxPoints: number;
  orderIndex?: number;
  questionId?: string;
  Question?: {
    questionText: string;
  };
}

interface RubricScore {
  id: string;
  rubricCriteriaId: string;
  score: number;
  feedback?: string;
}

interface AssessmentResponse {
  id: string;
  questionId: string;
  response: string;
  fileUrl?: string;
  AssessmentQuestion?: {
    questionText: string;
    questionType: 'TEXT' | 'MCQ' | 'FILE';
  };
}

interface Submission {
  id: string;
  assessmentId: string;
  status: 'SUBMITTED' | 'GRADED';
  totalScore?: number;
  submittedAt?: string;
  gradedAt?: string;
  rubricId?: string;
  AssessmentResponses?: AssessmentResponse[];
  GradedByUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface Assessment {
  id: string;
  title: string;
  description?: string;
  totalPoints: number;
  AssessmentQuestions?: Array<{
    id: string;
    questionText: string;
    questionType: string;
  }>;
}

export default function StudentResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const assessmentId = params.assessmentId as string;

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [rubricCriteria, setRubricCriteria] = useState<RubricCriteria[]>([]);
  const [rubricScores, setRubricScores] = useState<RubricScore[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect if not authenticated or not student
  useEffect(() => {
    if (!currentUser) {
      router.push('/auth/login');
    } else if (currentUser.role !== 'STUDENT') {
      router.push('/dashboard');
    }
  }, [currentUser, router]);

  // Fetch results
  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch assessment details
      const assessmentRes = await apiClient.get(`/assessments/${assessmentId}`);
      setAssessment(assessmentRes.data.assessment);

      // Fetch student's submission
      const submissionsRes = await apiClient.get(
        `/assessments/${assessmentId}/submissions`
      );
      const submissions = submissionsRes.data.submissions || [];

      if (submissions.length === 0) {
        toast.error('No submission found for this assessment');
        router.push('/student/assessments');
        return;
      }

      // Get latest submission
      const latestSubmission = submissions[submissions.length - 1];
      setSubmission(latestSubmission);

      // If submission is graded, fetch rubric and scores
      if (latestSubmission.status === 'GRADED' && latestSubmission.rubricId) {
        try {
          // Fetch rubric
          const rubricRes = await apiClient.get(
            `/rubrics/assessment/${assessmentId}`
          );
          const rubric = rubricRes.data.rubrics?.[0];
          if (rubric?.RubricCriteria) {
            setRubricCriteria(rubric.RubricCriteria);
          }

          // Fetch rubric scores
          const scoresRes = await apiClient.get(
            `/rubrics/submissions/${latestSubmission.id}/rubric-scores`
          );
          setRubricScores(scoresRes.data.scores || []);
        } catch (error) {
          console.log('Could not fetch rubric data:', error);
        }
      }
    } catch (error: unknown) {
      console.error('Failed to fetch results:', error);
      toast.error(
        (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to load results'
      );
    } finally {
      setLoading(false);
    }
  }, [assessmentId, router]);

  useEffect(() => {
    if (!currentUser) return;
    const load = async () => { await fetchResults(); };
    load();
  }, [currentUser, fetchResults]);

  const getScoreForCriteria = (criteriaId: string) => {
    return rubricScores.find((s) => s.rubricCriteriaId === criteriaId);
  };

  const getTotalRubricScore = () => {
    return rubricScores.reduce((sum, score) => sum + score.score, 0);
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

  if (!assessment || !submission) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-600">Results not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/student/assessments')}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition-colors"
            >
              <FiArrowLeft size={20} />
              Back to Assessments
            </button>

            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {assessment.title}
              </h1>
              {assessment.description && (
                <p className="text-gray-600">{assessment.description}</p>
              )}
            </div>
          </div>

          {/* Submission Status */}
          <div
            className={`rounded-lg border p-4 mb-6 ${
              submission.status === 'GRADED'
                ? 'bg-purple-50 border-purple-200'
                : 'bg-blue-50 border-blue-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {submission.status === 'GRADED' ? (
                <FiCheckCircle className="text-purple-600" size={24} />
              ) : (
                <FiAlertCircle className="text-blue-600" size={24} />
              )}
              <div>
                <p className="font-semibold text-gray-900">
                  Status: {submission.status}
                </p>
                <p className="text-sm text-gray-700">
                  Submitted on{' '}
                  {submission.submittedAt
                    ? new Date(submission.submittedAt).toLocaleString()
                    : 'Unknown'}
                </p>
                {submission.status === 'GRADED' && submission.gradedAt && (
                  <p className="text-sm text-gray-700">
                    Graded by{' '}
                    {submission.GradedByUser
                      ? `${submission.GradedByUser.firstName} ${submission.GradedByUser.lastName}`
                      : 'Unknown'}
                    {' on '}
                    {new Date(submission.gradedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Score Card */}
          {submission.status === 'GRADED' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Your Score</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                  <p className="text-gray-700 text-sm font-semibold">
                    Overall Score
                  </p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {submission.totalScore || 0}/{assessment.totalPoints}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {assessment.totalPoints > 0
                      ? `${((submission.totalScore || 0) / assessment.totalPoints * 100).toFixed(1)}%`
                      : 'N/A'}
                  </p>
                </div>

                {rubricCriteria.length > 0 && (
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                    <p className="text-gray-700 text-sm font-semibold">
                      Rubric Score
                    </p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">
                      {getTotalRubricScore()}/
                      {rubricCriteria.reduce(
                        (sum, c) => sum + c.maxPoints,
                        0
                      )}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {rubricCriteria.length} criteria
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rubric Breakdown */}
          {rubricCriteria.length > 0 && submission.status === 'GRADED' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Rubric Breakdown
              </h2>
              <div className="space-y-4">
                {rubricCriteria.map((criterion) => {
                  const score = getScoreForCriteria(criterion.id);
                  const percentage = criterion.maxPoints > 0
                    ? ((score?.score || 0) / criterion.maxPoints * 100)
                    : 0;

                  return (
                    <div key={criterion.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {criterion.criteriaName}
                          </h3>
                          {criterion.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {criterion.description}
                            </p>
                          )}
                          {criterion.questionId && criterion.Question && (
                            <p className="text-sm text-blue-600 mt-2 bg-blue-50 p-2 rounded">
                              📝 Linked to: {criterion.Question.questionText}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-gray-900">
                            {score?.score || 0}/{criterion.maxPoints}
                          </p>
                          <p className="text-xs text-gray-600">
                            {percentage.toFixed(0)}%
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        ></div>
                      </div>

                      {/* Feedback */}
                      {score?.feedback && (
                        <div className="mt-3 bg-gray-50 rounded-lg p-3 border-l-4 border-blue-500">
                          <p className="text-sm font-semibold text-gray-900 mb-1">
                            Feedback:
                          </p>
                          <p className="text-sm text-gray-700">
                            {score.feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Student Responses */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Your Responses
            </h2>

            {submission.AssessmentResponses &&
            submission.AssessmentResponses.length > 0 ? (
              <div className="space-y-4">
                {submission.AssessmentResponses.map((response, idx) => (
                  <div
                    key={response.id}
                    className="border-b border-gray-200 pb-4 last:border-b-0"
                  >
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Question {idx + 1}:{' '}
                      {response.AssessmentQuestion?.questionText ||
                        'N/A'}
                    </h3>

                    <div className="bg-gray-50 rounded-lg p-4">
                      {response.AssessmentQuestion?.questionType ===
                      'FILE' ? (
                        <div className="flex items-center gap-2">
                          {response.fileUrl ? (
                            <a
                              href={response.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                            >
                              📎 Download Submitted File
                            </a>
                          ) : (
                            <p className="text-gray-600">
                              {response.response || 'No file submitted'}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {response.response || 'No response provided'}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No responses found</p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
