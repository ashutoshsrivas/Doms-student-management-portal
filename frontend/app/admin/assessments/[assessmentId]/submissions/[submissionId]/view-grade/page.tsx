'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiEdit2, FiSave, FiX } from 'react-icons/fi';

interface RubricCriteria {
  id: string;
  criteriaName: string;
  description: string;
  maxPoints: number;
  Question?: { questionText: string };
}

interface Rubric {
  id: string;
  name: string;
  description: string;
  totalPoints: number;
  RubricCriteria: RubricCriteria[];
}

interface RubricScore {
  id: string;
  rubricCriteriaId: string;
  score: number;
  feedback: string;
  RubricCriteria: RubricCriteria;
}

interface Student {
  firstName: string;
  lastName: string;
  email: string;
}

interface Submission {
  id: string;
  status: string;
  totalScore: number;
  gradedAt: string;
  StudentSession: {
    Student: Student;
  };
}

interface Assessment {
  id: string;
  title: string;
}

export default function ViewGradePage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.assessmentId as string;
  const submissionId = params.submissionId as string;

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [rubricScores, setRubricScores] = useState<RubricScore[]>([]);
  const [editedScores, setEditedScores] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch all submissions for the assessment
      const submissionRes = await apiClient.get(
        `/assessments/${assessmentId}/results`
      );
      const submissionData = submissionRes.data.submissions?.find(
        (s: Submission) => s.id === submissionId
      );
      
      if (!submissionData) {
        toast.error('Submission not found');
        router.back();
        return;
      }

      setSubmission(submissionData);

      // Fetch rubric if submission has one
      if (submissionData.rubricId) {
        const rubricRes = await apiClient.get(
          `/rubrics/assessment/${assessmentId}`
        );
        const selectedRubric = rubricRes.data.rubrics?.find(
          (r: Rubric) => r.id === submissionData.rubricId
        );
        if (selectedRubric) {
          setRubric(selectedRubric);
        }

        // Fetch existing rubric scores
        try {
          const scoresRes = await apiClient.get(
            `/rubrics/submissions/${submissionId}/rubric-scores`
          );
          if (scoresRes.data.scores) {
            const scores: RubricScore[] = scoresRes.data.scores.map((s: any) => ({
              ...s,
              score: parseFloat(s.score) || 0,
            }));
            setRubricScores(scores);
            
            // Initialize edit state with current scores
            const editState: Record<string, any> = {};
            scores.forEach((score) => {
              editState[score.rubricCriteriaId] = {
                score: score.score,
                feedback: score.feedback || '',
              };
            });
            setEditedScores(editState);
          }
        } catch (error: any) {
          console.log('No existing scores found');
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load submission details');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (criteriaId: string, score: number) => {
    const maxPoints = rubric?.RubricCriteria.find((c) => c.id === criteriaId)?.maxPoints || 0;
    const parsedScore = parseFloat(score) || 0;

    setEditedScores((prev) => ({
      ...prev,
      [criteriaId]: {
        ...prev[criteriaId],
        score: Math.min(Math.max(parsedScore, 0), maxPoints),
      },
    }));
  };

  const handleFeedbackChange = (criteriaId: string, feedback: string) => {
    setEditedScores((prev) => ({
      ...prev,
      [criteriaId]: {
        ...prev[criteriaId],
        feedback,
      },
    }));
  };

  const getTotalScore = () => {
    const total = Object.values(editedScores).reduce((sum: number, score: any) => {
      return sum + (parseFloat(score.score) || 0);
    }, 0);
    return isNaN(total) ? 0 : parseFloat(total.toFixed(2));
  };

  const getMaxScore = () => {
    const max = parseFloat(rubric?.totalPoints as any) || 0;
    return isNaN(max) ? 0 : max;
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      
      // Convert edited scores to rubric scores format
      const updatedRubricScores = Object.entries(editedScores).map(
        ([criteriaId, data]: [string, any]) => ({
          rubricCriteriaId: criteriaId,
          score: data.score,
          feedback: data.feedback,
        })
      );

      await apiClient.post(
        `/rubrics/submissions/${submissionId}/grade-with-rubric`,
        {
          rubricId: rubric?.id,
          rubricScores: updatedRubricScores,
        }
      );

      toast.success('Grades updated successfully');
      setEditing(false);
      await fetchData();
    } catch (error) {
      console.error('Failed to update grades:', error);
      toast.error('Failed to update grades');
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
            <p className="text-gray-700">Loading submission details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!submission || !rubric) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <p className="text-gray-700">Submission or rubric not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'FACULTY', 'HOD']}>
      <DashboardLayout>
        <div className="p-8 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <FiArrowLeft className="w-6 h-6 text-slate-700" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">View Grades</h1>
                <p className="text-slate-600 mt-1">
                  {submission.StudentSession.Student.firstName}{' '}
                  {submission.StudentSession.Student.lastName}
                </p>
              </div>
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <FiEdit2 className="w-5 h-5" />
                Edit Grades
              </button>
            )}
          </div>

          {/* Rubric Info */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-slate-900 mb-2">{rubric.name}</h2>
            {rubric.description && (
              <p className="text-slate-600">{rubric.description}</p>
            )}
          </div>

          {/* Criteria Scores */}
          <div className="space-y-4">
            {rubric.RubricCriteria.map((criterion) => {
              const existingScore = rubricScores.find(
                (s) => s.rubricCriteriaId === criterion.id
              );
              const editedScore = editedScores[criterion.id] || {
                score: existingScore?.score || 0,
                feedback: existingScore?.feedback || '',
              };

              return (
                <div key={criterion.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {criterion.criteriaName}
                    </h3>
                    <p className="text-slate-600 text-sm mt-1">
                      {criterion.description}
                    </p>
                    {criterion.Question && (
                      <p className="text-slate-500 text-sm mt-2 italic">
                        Q: {criterion.Question.questionText}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {/* Score Input */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Score (max: {parseFloat(criterion.maxPoints) || 0})
                      </label>
                      {editing ? (
                        <input
                          type="number"
                          min="0"
                          max={parseFloat(criterion.maxPoints) || 0}
                          step="0.1"
                          value={editedScore.score}
                          onChange={(e) =>
                            handleScoreChange(criterion.id, parseFloat(e.target.value))
                          }
                          className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <div className="px-3 py-2 bg-slate-100 rounded-lg text-slate-900 font-semibold">
                          {parseFloat(editedScore.score) || 0}
                        </div>
                      )}
                    </div>

                    {/* Max Points Display */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Max Points
                      </label>
                      <div className="px-3 py-2 bg-slate-100 rounded-lg text-slate-900">
                        {parseFloat(criterion.maxPoints) || 0}
                      </div>
                    </div>

                    {/* Percentage */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Percentage
                      </label>
                      <div className="px-3 py-2 bg-slate-100 rounded-lg text-slate-900">
                        {(
                          ((parseFloat(editedScore.score) || 0) /
                            (parseFloat(criterion.maxPoints) || 1)) *
                          100
                        ).toFixed(1)}
                        %
                      </div>
                    </div>
                  </div>

                  {/* Feedback */}
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Feedback
                    </label>
                    {editing ? (
                      <textarea
                        value={editedScore.feedback}
                        onChange={(e) =>
                          handleFeedbackChange(criterion.id, e.target.value)
                        }
                        placeholder="Add feedback for this criterion..."
                        rows={3}
                        className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-slate-100 rounded-lg text-slate-700 min-h-[60px]">
                        {editedScore.feedback || (
                          <span className="text-slate-500 italic">No feedback</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total Score Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 mt-8 border-l-4 border-blue-600">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-slate-600 text-sm font-medium mb-1">Current Score</p>
                <p className="text-3xl font-bold text-blue-600">
                  {getTotalScore().toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-slate-600 text-sm font-medium mb-1">Max Score</p>
                <p className="text-3xl font-bold text-slate-700">
                  {getMaxScore().toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-slate-600 text-sm font-medium mb-1">Percentage</p>
                <p className="text-3xl font-bold text-green-600">
                  {(
                    ((getTotalScore() / getMaxScore()) * 100) ||
                    0
                  ).toFixed(1)}
                  %
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {editing && (
            <div className="flex gap-4 mt-8">
              <button
                onClick={handleSaveChanges}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                <FiSave className="w-5 h-5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  fetchData(); // Reset edits
                }}
                className="flex items-center gap-2 px-6 py-2 bg-slate-300 text-slate-900 rounded-lg hover:bg-slate-400 transition"
              >
                <FiX className="w-5 h-5" />
                Cancel
              </button>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
