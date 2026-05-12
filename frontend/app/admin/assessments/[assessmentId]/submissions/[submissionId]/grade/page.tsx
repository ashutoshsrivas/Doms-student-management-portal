'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FiArrowLeft,
  FiSave,
  FiX,
  FiAlertCircle,
} from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';

interface RubricCriteria {
  id: string;
  criteriaName: string;
  description: string;
  maxPoints: number;
  questionId?: string;
  Question?: {
    id: string;
    questionText: string;
  };
}

interface Rubric {
  id: string;
  name: string;
  description: string;
  totalPoints: number;
  RubricCriteria: RubricCriteria[];
  studentResponses?: { [key: string]: { response: string; fileUrl?: string } };
}

interface Submission {
  id: string;
  status: string;
  totalScore?: number;
  AssessmentResponses?: Array<{
    id: string;
    questionId: string;
    response: string;
    fileUrl?: string;
  }>;
  StudentSession: {
    Student: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

interface RubricScore {
  rubricCriteriaId: string;
  score: number;
  feedback: string;
}

export default function GradeSubmissionPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.submissionId as string;
  const assessmentId = params.assessmentId as string;

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [selectedRubric, setSelectedRubric] = useState<Rubric | null>(null);
  const [rubricScores, setRubricScores] = useState<RubricScore[]>([]);
  const [studentResponses, setStudentResponses] = useState<{ [key: string]: { response: string; fileUrl?: string } }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch assessment and submissions using the results endpoint
      const resultsRes = await apiClient.get(`/assessments/${assessmentId}/results`);
      const sub = resultsRes.data.submissions?.find((s: Submission) => s.id === submissionId);
      setSubmission(sub);

      // Build student responses map from AssessmentResponses
      if (sub?.AssessmentResponses) {
        const responsesMap: { [key: string]: { response: string; fileUrl?: string } } = {};
        sub.AssessmentResponses.forEach((resp: { questionId: string; response: string; fileUrl?: string }) => {
          responsesMap[resp.questionId] = {
            response: resp.response,
            fileUrl: resp.fileUrl,
          };
        });
        setStudentResponses(responsesMap);
      }

      // Fetch rubrics for this assessment
      const rubricsRes = await apiClient.get(`/rubrics/assessment/${assessmentId}`);
      setRubrics(rubricsRes.data.rubrics || []);

      // Initialize rubric scores
      if (rubricsRes.data.rubrics?.length > 0) {
        const firstRubric = rubricsRes.data.rubrics[0];
        // First rubric already has RubricCriteria included from the endpoint
        setSelectedRubric(firstRubric);
        initializeScores(firstRubric);
      }

      // Fetch existing rubric scores if graded
      try {
        const scoresRes = await apiClient.get(`/rubrics/submissions/${submissionId}/rubric-scores`);
        if (scoresRes.data.scores?.length > 0) {
          const scores: RubricScore[] = scoresRes.data.scores.map((s: { rubricCriteriaId: string; score: string | number; feedback?: string }) => ({
            rubricCriteriaId: s.rubricCriteriaId,
            score: parseFloat(String(s.score)) || 0,
            feedback: s.feedback || '',
          }));
          setRubricScores(scores);
        }
      } catch (error: unknown) {
        // Silently fail - no scores exist yet (401 is expected)
        console.log('[fetchData] No existing scores:', (error as { response?: { status?: number } }).response?.status);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load grading data');
    } finally {
      setLoading(false);
    }
  };

  const initializeScores = (rubric: Rubric) => {
    const scores = rubric.RubricCriteria.map((criterion) => ({
      rubricCriteriaId: criterion.id,
      score: 0,
      feedback: '',
    }));
    setRubricScores(scores);
  };

  useEffect(() => {
    const load = async () => { await fetchData(); };
    load();
  }, [submissionId, assessmentId]);

  const handleRubricChange = (rubric: Rubric) => {
    // Rubric from the list already has RubricCriteria included
    setSelectedRubric(rubric);
    initializeScores(rubric);
  };

  const handleScoreChange = (criteriaId: string, score: number) => {
    const parsedScore = parseFloat(String(score)) || 0;
    setRubricScores((prev) =>
      prev.map((rs) =>
        rs.rubricCriteriaId === criteriaId
          ? { 
              ...rs, 
              score: Math.min(parsedScore, parseFloat(String(getRubricCriteria(criteriaId)?.maxPoints)) || 0)
            }
          : rs
      )
    );
  };

  const handleFeedbackChange = (criteriaId: string, feedback: string) => {
    setRubricScores((prev) =>
      prev.map((rs) =>
        rs.rubricCriteriaId === criteriaId ? { ...rs, feedback } : rs
      )
    );
  };

  const getRubricCriteria = (criteriaId: string) => {
    return selectedRubric?.RubricCriteria.find((c) => c.id === criteriaId);
  };

  const getTotalScore = () => {
    const total = rubricScores.reduce((sum, rs) => {
      const score = parseFloat(String(rs.score)) || 0;
      return sum + score;
    }, 0);
    return isNaN(total) ? 0 : parseFloat(total.toFixed(2));
  };

  const getMaxScore = () => {
    const max = parseFloat(String(selectedRubric?.totalPoints || 0)) || 0;
    return isNaN(max) ? 0 : max;
  };

  const handleSubmitGrades = async () => {
    if (!selectedRubric || rubricScores.length === 0) {
      toast.error('Please select a rubric and add scores');
      return;
    }

    try {
      setSaving(true);
      const totalScore = getTotalScore();
      console.log('[Grade Submission] Submitting grades:');
      console.log('  - Rubric ID:', selectedRubric.id);
      console.log('  - Calculated Total Score:', totalScore);
      console.log('  - Rubric Scores:', JSON.stringify(rubricScores, null, 2));
      
      const response = await apiClient.post(`/rubrics/submissions/${submissionId}/grade-with-rubric`, {
        rubricId: selectedRubric.id,
        rubricScores,
      });
      console.log('[Grade Submission] Response:', response.data);
      
      toast.success('Submission graded successfully');
      router.push(`/admin/assessments/${assessmentId}/results`);
    } catch (error) {
      console.error('Failed to grade submission:', error);
      toast.error('Failed to grade submission');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-700">Loading grading interface...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!submission) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-700">Submission not found</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'HOD', 'FACULTY', 'MENTOR', 'PLACEMENT_COORDINATOR']}>
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto pb-12">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <FiArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Grade Submission</h1>
              <p className="text-gray-600 mt-1">
                {submission.StudentSession.Student.firstName} {submission.StudentSession.Student.lastName}
              </p>
            </div>
          </div>

          {/* Student Info Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Student Name</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {submission.StudentSession.Student.firstName} {submission.StudentSession.Student.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Email</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {submission.StudentSession.Student.email}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <p className="text-lg font-semibold text-gray-900 mt-1 capitalize">
                  {submission.status}
                </p>
              </div>
              {submission.totalScore !== undefined && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Current Score</p>
                  <p className="text-lg font-semibold text-green-600 mt-1">
                    {submission.totalScore}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Rubric Selection */}
          {rubrics.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Select Rubric <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedRubric?.id || ''}
                onChange={(e) => {
                  const rubric = rubrics.find((r) => r.id === e.target.value);
                  if (rubric) handleRubricChange(rubric);
                }}
                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
              >
                <option value="">Choose a rubric...</option>
                {rubrics.map((rubric) => (
                  <option key={rubric.id} value={rubric.id}>
                    {rubric.name} ({rubric.totalPoints} points)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* No Rubrics */}
          {rubrics.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6 flex items-start gap-4">
              <FiAlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={24} />
              <div>
                <h3 className="font-semibold text-yellow-900">No Rubrics Available</h3>
                <p className="text-yellow-800 mt-1">
                  Please create a rubric for this assessment before grading.
                </p>
              </div>
            </div>
          )}

          {/* Rubric Grading Interface */}
          {selectedRubric && (
            <div className="space-y-6">
              {/* Rubric Info */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900">{selectedRubric.name}</h2>
                <p className="text-gray-600 mt-2">{selectedRubric.description}</p>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 p-5 rounded-lg">
                <p className="text-sm font-medium text-blue-900">
                  <span className="text-blue-700">Total Points Available:</span> <span className="text-xl font-bold text-blue-900">{selectedRubric.totalPoints}</span>
                </p>
                <p className="text-sm font-medium text-blue-900 mt-2">
                  <span className="text-blue-700">Your Score:</span> <span className="text-xl font-bold text-indigo-600">{getTotalScore()}</span> <span className="text-blue-700">/ {getMaxScore()}</span>
                </p>
              </div>
              </div>

              {/* Grading Criteria */}
              <div className="space-y-6">
                {selectedRubric.RubricCriteria.map((criterion, idx) => {
                  const score = rubricScores.find((rs) => rs.rubricCriteriaId === criterion.id);

                  return (
                    <div
                      key={criterion.id}
                      className="bg-white rounded-lg border-2 border-slate-200 overflow-visible shadow-sm"
                    >
                      {/* Criterion Header */}
                      <div className="p-5 bg-gradient-to-r from-slate-50 to-blue-50 border-b-2 border-slate-200">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold flex-shrink-0">
                                C{idx + 1}
                              </span>
                              <h3 className="text-lg font-bold text-slate-900 break-words">
                                {criterion.criteriaName}
                              </h3>
                            </div>
                            <p className="text-slate-600 text-sm mt-2 break-words">
                              {criterion.description}
                            </p>
                            {criterion.Question && (
                              <p className="text-slate-500 text-xs mt-1 break-words">
                                📌 Linked to: {criterion.Question.questionText.substring(0, 50)}...
                              </p>
                            )}
                          </div>

                          <div className="text-right flex-shrink-0">
                            <p className="text-xs text-slate-600 font-semibold">Current Score</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {parseFloat(String(score?.score ?? 0)) || 0}<span className="text-lg text-slate-500">/{parseFloat(String(criterion.maxPoints ?? 0)) || 0}</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Student Response Section */}
                      {criterion.questionId && studentResponses[criterion.questionId] && (
                        <div className="px-6 pt-4 pb-2 bg-blue-50 border-b border-blue-200">
                          <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
                            <div className="flex items-start gap-3">
                              <span className="text-lg">📝</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-blue-900 mb-2">Student Response</p>
                                {criterion.Question && (
                                  <p className="text-sm text-blue-800 mb-3 italic">
                                    <strong>Question:</strong> {criterion.Question.questionText}
                                  </p>
                                )}
                                <div className="bg-blue-50 rounded p-3 text-sm text-slate-700 whitespace-pre-wrap break-words">
                                  {studentResponses[criterion.questionId]?.fileUrl ? (
                                    <a
                                      href={studentResponses[criterion.questionId].fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 underline flex items-center gap-2"
                                    >
                                      <span>📎</span>
                                      <span>{studentResponses[criterion.questionId].response}</span>
                                    </a>
                                  ) : (
                                    studentResponses[criterion.questionId]?.response
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Scoring Section - Always Visible */}
                      <div className="p-6 bg-white space-y-4">
                        {/* Score Input */}
                        <div>
                          <label className="block text-sm font-bold text-slate-800 mb-3">
                            Enter Score (Max: {criterion.maxPoints} points) <span className="text-red-500">*</span>
                          </label>
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <input
                                type="range"
                                min="0"
                              max={parseFloat(String(criterion.maxPoints ?? 0)) || 0}
                              step="0.5"
                              value={parseFloat(String(score?.score ?? 0)) || 0}
                              onChange={(e) =>
                                handleScoreChange(criterion.id, parseFloat(e.target.value))
                              }
                              className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <div className="flex justify-between text-xs text-slate-500 mt-1">
                              <span>0</span>
                              <span>{parseFloat(String(criterion.maxPoints ?? 0)) || 0}</span>
                              </div>
                            </div>
                            <input
                              type="number"
                              min="0"
                              max={parseFloat(String(criterion.maxPoints ?? 0)) || 0}
                              step="0.5"
                              value={parseFloat(String(score?.score ?? 0)) || 0}
                              onChange={(e) =>
                                handleScoreChange(criterion.id, parseFloat(e.target.value))
                              }
                              className="w-24 px-4 py-3 bg-blue-50 border-2 border-blue-300 rounded-lg text-slate-900 font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                              placeholder="0"
                            />
                          </div>
                        </div>

                        {/* Feedback */}
                        <div>
                          <label className="block text-sm font-bold text-slate-800 mb-3">
                            Feedback for Student
                          </label>
                          <textarea
                            value={score?.feedback || ''}
                            onChange={(e) =>
                              handleFeedbackChange(criterion.id, e.target.value)
                            }
                            placeholder="Provide constructive feedback for this criterion (optional)..."
                            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-8 mt-8 border-t-2 border-slate-200">
                <button
                  onClick={() => router.back()}
                  className="px-6 py-2 border-2 border-slate-300 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitGrades}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
                >
                  <FiSave size={18} />
                  {saving ? 'Saving...' : `Submit Grades (${getTotalScore().toFixed(1)}/${getMaxScore().toFixed(1)})`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
    </ProtectedRoute>
  );
}
