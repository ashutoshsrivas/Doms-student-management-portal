'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FiArrowLeft,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiUsers,
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiAlertCircle,
  FiTrendingUp,
} from 'react-icons/fi';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import DashboardLayout from '@/app/components/DashboardLayout';

interface Assessment {
  id: string;
  title: string;
  description?: string;
  type: 'AUTO_GRADE' | 'MANUAL';
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  assignmentScope: 'ALL_STUDENTS' | 'CATEGORY' | 'SPECIFIC_STUDENT';
  academicSessionId: string;
  createdBy: string;
  deadline?: string;
  totalPoints: number;
  createdAt: string;
  updatedAt: string;
  Creator?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  AssessmentQuestions?: AssessmentQuestion[];
}

interface AssessmentQuestion {
  id: string;
  assessmentId: string;
  questionText: string;
  questionType: 'TEXT' | 'MCQ' | 'FILE';
  pointsValue: number;
  orderIndex: number;
  metadata: {
    options?: string[];
    correctAnswers?: number[];
    multipleCorrect?: boolean;
  };
}

interface AssignmentRecord {
  id: string;
  assessmentId: string;
  studentSessionId?: string;
  categoryId?: string;
  assignedAt: string;
  StudentSession?: {
    id: string;
    User: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  SessionCategory?: {
    id: string;
    name: string;
  };
}

interface StudentSession {
  id: string;
  studentSessionId: string;
  status: string;
  enrollmentDate: string;
  Student: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    registrationNumber: string;
    profileImage?: string;
    department?: string;
  };
}

interface SessionCategory {
  id: string;
  name: string;
  color?: string;
}

const questionTypes = [
  { value: 'TEXT', label: 'Text Answer' },
  { value: 'MCQ', label: 'Multiple Choice' },
  { value: 'FILE', label: 'File Upload' },
];

export default function AssessmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const assessmentId = params.assessmentId as string;

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  // Question Modal
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questionMode, setQuestionMode] = useState<'create' | 'edit'>('create');
  const [selectedQuestion, setSelectedQuestion] = useState<AssessmentQuestion | null>(null);
  const [questionForm, setQuestionForm] = useState({
    questionText: '',
    questionType: 'TEXT' as 'TEXT' | 'MCQ' | 'FILE',
    pointsValue: 1,
    metadata: {
      options: [] as string[],
      correctAnswers: [] as number[],
      multipleCorrect: false,
    },
  });

  // Assignment Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    studentSessionIds: [] as string[],
    categoryIds: [] as string[],
  });

  // Available students and categories for assignment
  const [availableStudents, setAvailableStudents] = useState<StudentSession[]>([]);
  const [availableCategories, setAvailableCategories] = useState<SessionCategory[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  // Fetch Assessment
  const fetchAssessment = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/assessments/${assessmentId}`);
      setAssessment(response.data.assessment);
      setQuestions(response.data.assessment.AssessmentQuestions || []);
    } catch (error) {
      console.error('Failed to fetch assessment:', error);
      toast.error('Failed to load assessment');
      router.push('/admin/assessments');
    } finally {
      setLoading(false);
    }
  }, [assessmentId, router]);

  // Fetch Assignments
  const fetchAssignments = useCallback(async () => {
    try {
      const response = await apiClient.get(`/assessments/${assessmentId}/assigned-students`);
      setAssignments(response.data.assignments || []);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
    }
  }, [assessmentId]);

  // Fetch Available Students for Assignment
  const sessionId = assessment?.academicSessionId;
  const fetchAvailableStudents = useCallback(async () => {
    if (!sessionId) return;
    try {
      const response = await apiClient.get(`/sessions/${sessionId}/students?limit=999999`);
      setAvailableStudents(response.data.students || []);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  }, [sessionId]);

  // Fetch Available Categories for Assignment
  const fetchAvailableCategories = useCallback(async () => {
    if (!sessionId) return;
    try {
      const response = await apiClient.get(`/sessions/${sessionId}/categories`);
      setAvailableCategories(response.data.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, [sessionId]);

  // Filter functions
  const filteredStudents = availableStudents.filter(student =>
    `${student.Student.firstName} ${student.Student.lastName} ${student.Student.email}`.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const filteredCategories = availableCategories.filter(category =>
    category.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  useEffect(() => {
    if (!currentUser) return;
    const allowedRoles = ['ADMIN', 'HOD', 'MENTOR', 'FACULTY', 'PLACEMENT_COORDINATOR'];
    if (!allowedRoles.includes(currentUser.role)) {
      router.push('/dashboard');
      return;
    }

    const load = async () => {
      await fetchAssessment();
      await fetchAssignments();
    };
    load();
  }, [currentUser, router, fetchAssessment, fetchAssignments]);

  const resetQuestionForm = () => {
    setQuestionForm({
      questionText: '',
      questionType: 'TEXT',
      pointsValue: 1,
      metadata: {
        options: [],
        correctAnswers: [],
        multipleCorrect: false,
      },
    });
    setSelectedQuestion(null);
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!questionForm.questionText.trim()) {
      toast.error('Question text is required');
      return;
    }

    if (questionForm.questionType === 'MCQ' && questionForm.metadata.options.length < 2) {
      toast.error('MCQ must have at least 2 options');
      return;
    }

    try {
      const payload = {
        questionText: questionForm.questionText,
        questionType: questionForm.questionType,
        pointsValue: questionForm.pointsValue,
        metadata: questionForm.metadata,
      };

      if (questionMode === 'create') {
        await apiClient.post(`/assessments/${assessmentId}/questions`, payload);
        toast.success('Question added successfully');
      } else if (selectedQuestion) {
        await apiClient.put(
          `/assessments/${assessmentId}/questions/${selectedQuestion.id}`,
          payload
        );
        toast.success('Question updated successfully');
      }

      setShowQuestionModal(false);
      resetQuestionForm();
      fetchAssessment();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to save question');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Delete this question?')) return;

    try {
      await apiClient.delete(`/assessments/${assessmentId}/questions/${questionId}`);
      toast.success('Question deleted successfully');
      fetchAssessment();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to delete question');
    }
  };

  const handleAddOption = () => {
    setQuestionForm({
      ...questionForm,
      metadata: {
        ...questionForm.metadata,
        options: [...questionForm.metadata.options, ''],
      },
    });
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = questionForm.metadata.options.filter((_, i) => i !== index);
    const newCorrectAnswers = questionForm.metadata.correctAnswers
      .filter((i) => i !== index)
      .map((i) => (i > index ? i - 1 : i));

    setQuestionForm({
      ...questionForm,
      metadata: {
        ...questionForm.metadata,
        options: newOptions,
        correctAnswers: newCorrectAnswers,
      },
    });
  };

  const handleToggleCorrectAnswer = (index: number) => {
    const newCorrectAnswers = questionForm.metadata.correctAnswers.includes(index)
      ? questionForm.metadata.correctAnswers.filter((i) => i !== index)
      : [...questionForm.metadata.correctAnswers, index];

    setQuestionForm({
      ...questionForm,
      metadata: {
        ...questionForm.metadata,
        correctAnswers: newCorrectAnswers,
      },
    });
  };

  const handleAssignStudents = async (e: React.FormEvent) => {
    e.preventDefault();

    if (assignmentForm.studentSessionIds.length === 0 && assignmentForm.categoryIds.length === 0) {
      toast.error('Select at least one student or category');
      return;
    }

    try {
      setAssignmentLoading(true);
      await apiClient.post(`/assessments/${assessmentId}/assign`, {
        studentSessionIds: assignmentForm.studentSessionIds,
        categoryIds: assignmentForm.categoryIds,
      });
      toast.success('Assessment assigned successfully');
      setShowAssignModal(false);
      setAssignmentForm({ studentSessionIds: [], categoryIds: [] });
      setStudentSearch('');
      setCategorySearch('');
      fetchAssignments();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to assign assessment');
    } finally {
      setAssignmentLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading assessment...</p>
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

  const isPublished = assessment.status === 'PUBLISHED';
  const isClosed = assessment.status === 'CLOSED';
  const isDraft = assessment.status === 'DRAFT';
  const canEdit = isDraft;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.push('/admin/assessments')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <FiArrowLeft size={24} />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{assessment.title}</h1>
              <p className="text-gray-600 mt-1">{assessment.description}</p>
            </div>
            <span
              className={`px-4 py-2 rounded-full text-sm font-semibold border ${
                isDraft
                  ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                  : isPublished
                    ? 'bg-green-100 text-green-800 border-green-300'
                    : 'bg-red-100 text-red-800 border-red-300'
              }`}
            >
              {assessment.status}
            </span>
          </div>

          {/* Assessment Info Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-gray-600 text-sm">Grading Type</p>
              <p className="text-lg font-semibold text-gray-900">{assessment.type}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-gray-600 text-sm">Total Points</p>
              <p className="text-lg font-semibold text-gray-900">{assessment.totalPoints}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-gray-600 text-sm">Questions</p>
              <p className="text-lg font-semibold text-gray-900">{questions.length}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-gray-600 text-sm">Assigned To</p>
              <p className="text-lg font-semibold text-gray-900">{assignments.length}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b border-gray-200 overflow-x-auto">
            <button className="px-4 py-2 text-blue-600 border-b-2 border-blue-600 font-medium whitespace-nowrap">
              Questions
            </button>
            <button
              onClick={() => {
                document.getElementById('assignments-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium whitespace-nowrap"
            >
              Assignments
            </button>
            <button
              onClick={() => router.push(`/admin/assessments/${assessmentId}/rubrics`)}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium whitespace-nowrap flex items-center gap-2"
            >
              <FiTrendingUp size={18} />
              Rubrics & Grading
            </button>
            <button
              onClick={() => router.push(`/admin/assessments/${assessmentId}/results`)}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium whitespace-nowrap flex items-center gap-2"
            >
              Results
            </button>
          </div>

          {/* Questions Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Questions</h2>
              {canEdit && (
                <button
                  onClick={() => {
                    resetQuestionForm();
                    setQuestionMode('create');
                    setShowQuestionModal(true);
                  }}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <FiPlus size={20} />
                  Add Question
                </button>
              )}
            </div>

            {questions.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <FiAlertCircle className="mx-auto text-gray-400 mb-4" size={40} />
                <p className="text-gray-600">No questions yet</p>
                {canEdit && (
                  <p className="text-gray-600 text-sm mt-2">Add questions to this assessment</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
                  >
                    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                      onClick={() =>
                        setExpandedQuestion(
                          expandedQuestion === question.id ? null : question.id
                        )
                      }
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                            Q{index + 1}
                          </span>
                          <p className="text-gray-900 font-medium">{question.questionText}</p>
                        </div>
                        <div className="flex items-center gap-3 mt-2 ml-12">
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {question.questionType}
                          </span>
                          <span className="text-xs text-gray-600">
                            {question.pointsValue} point{question.pointsValue !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {canEdit && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const metadata = question.metadata || {};
                                setQuestionForm({
                                  questionText: question.questionText,
                                  questionType: question.questionType,
                                  pointsValue: question.pointsValue,
                                  metadata: {
                                    options: metadata.options || [],
                                    correctAnswers: metadata.correctAnswers || [],
                                    multipleCorrect: metadata.multipleCorrect || false,
                                  },
                                });
                                setSelectedQuestion(question);
                                setQuestionMode('edit');
                                setShowQuestionModal(true);
                              }}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <FiEdit2 size={18} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteQuestion(question.id);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <FiTrash2 size={18} />
                            </button>
                          </>
                        )}
                        {expandedQuestion === question.id ? (
                          <FiChevronUp size={20} className="text-gray-600" />
                        ) : (
                          <FiChevronDown size={20} className="text-gray-600" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Question Details */}
                    {expandedQuestion === question.id && (
                      <div className="border-t border-gray-200 p-4 bg-gray-50">
                        {question.questionType === 'MCQ' && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3">Options</h4>
                            {question.metadata?.options && question.metadata.options.length > 0 ? (
                              <div className="space-y-2">
                                {question.metadata.options.map((option: string, i: number) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={question.metadata?.correctAnswers?.includes(i) || false}
                                      readOnly
                                      className="w-4 h-4"
                                    />
                                    <span className="text-gray-900">{option}</span>
                                    {question.metadata?.correctAnswers?.includes(i) && (
                                      <FiCheck className="ml-auto text-green-600" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm italic">No options added yet</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assignments Section */}
          <div id="assignments-section" className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Assignments</h2>
              {!isClosed && (
                <button
                  onClick={() => {
                    setShowAssignModal(true);
                    fetchAvailableStudents();
                    fetchAvailableCategories();
                  }}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <FiUsers size={20} />
                  Assign to Students
                </button>
              )}
            </div>

            {assignments.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <FiUsers className="mx-auto text-gray-400 mb-4" size={40} />
                <p className="text-gray-600">Not assigned to any students yet</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Student / Category
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Assigned Date
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {assignments.map((assignment) => (
                      <tr key={assignment.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {assignment.StudentSession?.Student ? (
                            <div>
                              <p className="font-medium">{assignment.StudentSession.Student.firstName} {assignment.StudentSession.Student.lastName}</p>
                              <p className="text-gray-600 text-xs">
                                {assignment.StudentSession.Student.email}
                              </p>
                            </div>
                          ) : assignment.SessionCategory ? (
                            <p className="font-medium">{assignment.SessionCategory.name}</p>
                          ) : (
                            <p className="text-gray-500 italic text-xs">Unknown Assignment</p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {assignment.StudentSession ? 'Student' : 'Category'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(assignment.assignedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {!isClosed && (
                            <button
                              onClick={async () => {
                                try {
                                  await apiClient.delete(
                                    `/assessments/${assessmentId}/assignments/${assignment.id}`
                                  );
                                  toast.success('Assignment removed');
                                  fetchAssignments();
                                } catch {
                                  toast.error('Failed to remove assignment');
                                }
                              }}
                              className="text-red-600 hover:text-red-800 transition-colors text-sm font-medium"
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Question Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">
                {questionMode === 'create' ? 'Add Question' : 'Edit Question'}
              </h2>
              <button
                onClick={() => {
                  setShowQuestionModal(false);
                  resetQuestionForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX size={24} />
              </button>
            </div>

            <form onSubmit={handleAddQuestion} className="p-6 space-y-4">
              {/* Question Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Question Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {questionTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() =>
                        setQuestionForm({
                          ...questionForm,
                          questionType: type.value as 'TEXT' | 'MCQ' | 'FILE',
                        })
                      }
                      className={`px-4 py-2 rounded-lg border-2 transition-all ${
                        questionForm.questionType === type.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Question Text *
                </label>
                <textarea
                  value={questionForm.questionText}
                  onChange={(e) =>
                    setQuestionForm({ ...questionForm, questionText: e.target.value })
                  }
                  placeholder="Enter the question..."
                  className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  rows={4}
                  maxLength={1000}
                />
              </div>

              {/* Points */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Points Value
                </label>
                <input
                  type="number"
                  value={questionForm.pointsValue}
                  onChange={(e) =>
                    setQuestionForm({
                      ...questionForm,
                      pointsValue: parseInt(e.target.value) || 1,
                    })
                  }
                  min="1"
                  className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              {/* MCQ Options */}
              {questionForm.questionType === 'MCQ' && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-semibold text-gray-900">
                      Options
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={questionForm.metadata.multipleCorrect}
                          onChange={(e) =>
                            setQuestionForm({
                              ...questionForm,
                              metadata: {
                                ...questionForm.metadata,
                                multipleCorrect: e.target.checked,
                              },
                            })
                          }
                          className="mr-2"
                        />
                        Multiple Correct
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    {questionForm.metadata.options.map((option: string, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={questionForm.metadata.correctAnswers.includes(index)}
                          onChange={() => handleToggleCorrectAnswer(index)}
                          className="w-4 h-4"
                        />
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...questionForm.metadata.options];
                            newOptions[index] = e.target.value;
                            setQuestionForm({
                              ...questionForm,
                              metadata: {
                                ...questionForm.metadata,
                                options: newOptions,
                              },
                            });
                          }}
                          placeholder={`Option ${index + 1}`}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <FiX size={18} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 transition-colors"
                  >
                    <FiPlus size={18} />
                    Add Option
                  </button>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuestionModal(false);
                    resetQuestionForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {questionMode === 'create' ? 'Add Question' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">Assign Assessment to Students</h2>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX size={24} />
              </button>
            </div>

            <form onSubmit={handleAssignStudents} className="p-6 space-y-6">
              {/* Assign to Specific Students */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Specific Students</h3>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 text-sm text-gray-900 placeholder-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto space-y-2 bg-gray-50">
                  {filteredStudents.length === 0 ? (
                    <p className="text-gray-500 text-sm italic">
                      {studentSearch ? 'No students match your search' : 'No students available in this session'}
                    </p>
                  ) : (
                    <>
                      {/* Select All Students */}
                      <label className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer transition-colors border-b border-gray-200 pb-3 mb-3">
                        <input
                          type="checkbox"
                          checked={filteredStudents.length > 0 && filteredStudents.every(stud => assignmentForm.studentSessionIds.includes(stud.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Select all filtered students
                              const allStudentIds = filteredStudents.map(stud => stud.id);
                              const newIds = Array.from(new Set([...assignmentForm.studentSessionIds, ...allStudentIds]));
                              setAssignmentForm({
                                ...assignmentForm,
                                studentSessionIds: newIds,
                              });
                            } else {
                              // Deselect all filtered students
                              const filteredIds = new Set(filteredStudents.map(stud => stud.id));
                              const newIds = assignmentForm.studentSessionIds.filter(id => !filteredIds.has(id));
                              setAssignmentForm({
                                ...assignmentForm,
                                studentSessionIds: newIds,
                              });
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <p className="text-gray-900 font-semibold text-sm">Select All ({filteredStudents.length})</p>
                      </label>

                      {/* Individual Students */}
                      {filteredStudents.map(student => (
                        <label key={student.id} className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={assignmentForm.studentSessionIds.includes(student.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAssignmentForm({
                                  ...assignmentForm,
                                  studentSessionIds: [...assignmentForm.studentSessionIds, student.id],
                                });
                              } else {
                                setAssignmentForm({
                                  ...assignmentForm,
                                  studentSessionIds: assignmentForm.studentSessionIds.filter(id => id !== student.id),
                                });
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <div>
                            <p className="text-gray-900 font-medium">{student.Student.firstName} {student.Student.lastName}</p>
                            <p className="text-xs text-gray-500">{student.Student.email}</p>
                          </div>
                        </label>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Assign to Categories */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Student Categories</h3>
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 text-sm text-gray-900 placeholder-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="border border-gray-200 rounded-lg p-4 max-h-40 overflow-y-auto space-y-2 bg-gray-50">
                  {filteredCategories.length === 0 ? (
                    <p className="text-gray-500 text-sm italic">
                      {categorySearch ? 'No categories match your search' : 'No categories available in this session'}
                    </p>
                  ) : (
                    <>
                      {/* Select All Categories */}
                      <label className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer transition-colors border-b border-gray-200 pb-3 mb-3">
                        <input
                          type="checkbox"
                          checked={filteredCategories.length > 0 && filteredCategories.every(cat => assignmentForm.categoryIds.includes(cat.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Select all filtered categories
                              const allCategoryIds = filteredCategories.map(cat => cat.id);
                              const newIds = Array.from(new Set([...assignmentForm.categoryIds, ...allCategoryIds]));
                              setAssignmentForm({
                                ...assignmentForm,
                                categoryIds: newIds,
                              });
                            } else {
                              // Deselect all filtered categories
                              const filteredIds = new Set(filteredCategories.map(cat => cat.id));
                              const newIds = assignmentForm.categoryIds.filter(id => !filteredIds.has(id));
                              setAssignmentForm({
                                ...assignmentForm,
                                categoryIds: newIds,
                              });
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <p className="text-gray-900 font-semibold text-sm">Select All ({filteredCategories.length})</p>
                      </label>

                      {/* Individual Categories */}
                      {filteredCategories.map(category => (
                        <label key={category.id} className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={assignmentForm.categoryIds.includes(category.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAssignmentForm({
                                  ...assignmentForm,
                                  categoryIds: [...assignmentForm.categoryIds, category.id],
                                });
                              } else {
                                setAssignmentForm({
                                  ...assignmentForm,
                                  categoryIds: assignmentForm.categoryIds.filter(id => id !== category.id),
                                });
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <div className="flex items-center gap-2">
                            {category.color && (
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }}></div>
                            )}
                            <p className="text-gray-900 font-medium">{category.name}</p>
                          </div>
                        </label>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Summary */}
              {(assignmentForm.studentSessionIds.length > 0 || assignmentForm.categoryIds.length > 0) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">Ready to assign to:</span> {assignmentForm.studentSessionIds.length} student{assignmentForm.studentSessionIds.length !== 1 ? 's' : ''} and {assignmentForm.categoryIds.length} categor{assignmentForm.categoryIds.length !== 1 ? 'ies' : 'y'}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setAssignmentForm({ studentSessionIds: [], categoryIds: [] });
                    setStudentSearch('');
                    setCategorySearch('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignmentLoading || (assignmentForm.studentSessionIds.length === 0 && assignmentForm.categoryIds.length === 0)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {assignmentLoading ? 'Assigning...' : 'Assign Assessment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
