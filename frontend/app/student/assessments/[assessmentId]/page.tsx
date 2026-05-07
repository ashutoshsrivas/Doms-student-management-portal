'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FiArrowLeft,
  FiSave,
  FiCheck,
  FiX,
  FiChevronUp,
  FiChevronDown,
  FiAlertCircle,
  FiClock,
} from 'react-icons/fi';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import DashboardLayout from '@/app/components/DashboardLayout';

interface AssessmentQuestion {
  id: string;
  questionText: string;
  questionType: 'TEXT' | 'MCQ' | 'FILE';
  pointsValue: number;
  orderIndex: number;
  metadata?: {
    options?: string[];
    correctAnswers?: number[];
    multipleCorrect?: boolean;
  };
}

interface Assessment {
  id: string;
  title: string;
  description?: string;
  type: 'AUTO_GRADE' | 'MANUAL';
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  totalPoints: number;
  deadline?: string;
  AssessmentQuestions?: AssessmentQuestion[];
}

interface StudentResponse {
  [questionId: string]: {
    response: string | string[];
    questionType: string;
    fileUrl?: string;
  };
}

export default function TakeAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const assessmentId = params.assessmentId as string;

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [responses, setResponses] = useState<StudentResponse>({});
  const [expandedQuestion, setExpandedQuestion] = useState<number>(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState(false);

  // Helper function to get response value safely
  const getResponseValue = (questionId: string, questionType: string): string | string[] => {
    const response = responses[questionId]?.response;
    if (response === null || response === undefined) {
      return questionType === 'MCQ' ? [] : '';
    }
    return response;
  };

  // Fetch assessment details and start submission
  const fetchAssessmentAndStart = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch assessment details
      const assessmentResponse = await apiClient.get(`/assessments/${assessmentId}`);
      const assessmentData = assessmentResponse.data.assessment;
      setAssessment(assessmentData);

      // Start submission
      try {
        const submissionResponse = await apiClient.post(
          `/assessments/${assessmentId}/submissions/start`,
          {}
        );

        setSubmissionId(submissionResponse.data.submission.id);

        // Initialize responses object
        const initialResponses: StudentResponse = {};
        assessmentData.AssessmentQuestions?.forEach((q: AssessmentQuestion) => {
          initialResponses[q.id] = {
            response: q.questionType === 'MCQ' && assessmentData.metadata?.multipleCorrect ? [] : '',
            questionType: q.questionType,
          };
        });
        setResponses(initialResponses);
      } catch (submissionError: any) {
        console.error('Submission error details:', {
          status: submissionError.response?.status,
          message: submissionError.response?.data?.message,
          data: submissionError.response?.data,
        });
        
        // Check if error is specifically due to already submitted
        const errorMessage = submissionError.response?.data?.message || '';
        
        if (submissionError.response?.status === 400) {
          if (errorMessage.includes('already has an active submission')) {
            // Assessment has an existing submission (in progress or submitted)
            console.log('Assessment has existing submission');
            setIsAlreadySubmitted(true);
            
            // Initialize empty responses for display
            const initialResponses: StudentResponse = {};
            assessmentData.AssessmentQuestions?.forEach((q: AssessmentQuestion) => {
              initialResponses[q.id] = {
                response: q.questionType === 'MCQ' && assessmentData.metadata?.multipleCorrect ? [] : '',
                questionType: q.questionType,
              };
            });
            setResponses(initialResponses);
            
            // Show a warning to the student
            toast.error('You have already submitted this assessment', {
              duration: 5000,
            });
          } else if (errorMessage.includes('not available')) {
            // Assessment not published
            toast.error('This assessment is not available at the moment');
            router.push('/student/assessments');
          } else if (errorMessage.includes('Student session not found')) {
            // Student session issue
            toast.error('Student session not found. Please contact support');
            router.push('/student/assessments');
          } else {
            // Other 400 error
            toast.error(errorMessage || 'Failed to start submission');
            router.push('/student/assessments');
          }
        } else {
          // Non-400 error
          console.error('Non-400 submission error:', submissionError);
          toast.error('Failed to start submission');
          router.push('/student/assessments');
        }
      }
    } catch (error: any) {
      console.error('Failed to load assessment:', error);
      toast.error(error.response?.data?.message || 'Failed to load assessment');
      router.push('/student/assessments');
    } finally {
      setLoading(false);
    }
  }, [assessmentId, currentUser?.studentSessionId, router]);

  useEffect(() => {
    if (!currentUser) return;
    fetchAssessmentAndStart();
  }, [currentUser, fetchAssessmentAndStart]);

  const handleResponseChange = async (questionId: string, value: string | string[]) => {
    const newResponses = {
      ...responses,
      [questionId]: {
        ...responses[questionId],
        response: value,
      },
    };
    setResponses(newResponses);

    // Auto-save response
    if (submissionId) {
      setSaving(true);
      try {
        await apiClient.post(
          `/assessments/submissions/${submissionId}/answers/${questionId}`,
          { response: value }
        );
      } catch (error) {
        console.error('Failed to save response:', error);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleMCQChange = (questionId: string, optionIndex: number, isMultiple: boolean) => {
    const currentValue = responses[questionId]?.response as string[];

    if (isMultiple) {
      const newValue = Array.isArray(currentValue) ? [...currentValue] : [];
      const idx = newValue.indexOf(optionIndex.toString());

      if (idx > -1) {
        newValue.splice(idx, 1);
      } else {
        newValue.push(optionIndex.toString());
      }

      handleResponseChange(questionId, newValue);
    } else {
      handleResponseChange(questionId, optionIndex.toString());
    }
  };

  const handleFileUpload = async (questionId: string, file: File) => {
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await apiClient.post('/assessments/upload-file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const fileUrl = uploadResponse.data.fileUrl;
      const fileName = uploadResponse.data.fileName;

      // Update local state with file URL
      const newResponses = {
        ...responses,
        [questionId]: {
          ...responses[questionId],
          response: fileName,
          fileUrl,
        },
      };
      setResponses(newResponses);

      // Save to backend
      if (submissionId) {
        await apiClient.post(
          `/assessments/submissions/${submissionId}/answers/${questionId}`,
          { response: fileName, fileUrl }
        );
      }

      toast.success(`File uploaded: ${fileName}`);
    } catch (error: any) {
      console.error('File upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload file');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitAssessment = async () => {
    if (!submissionId) return;

    try {
      setSaving(true);
      await apiClient.post(`/assessments/submissions/${submissionId}/submit`);
      toast.success('Assessment submitted successfully!');
      router.push('/student/assessments');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit assessment');
    } finally {
      setSaving(false);
      setShowSubmitConfirm(false);
    }
  };

  const getProgress = () => {
    if (!assessment?.AssessmentQuestions) return 0;
    const answered = Object.values(responses).filter((r) => {
      if (Array.isArray(r.response)) return r.response.length > 0;
      return r.response.trim().length > 0;
    }).length;
    return Math.round((answered / assessment.AssessmentQuestions.length) * 100);
  };

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-700">Loading assessment...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!assessment) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-700">Assessment not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const progress = getProgress();

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.push('/student/assessments')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <FiArrowLeft size={24} />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{assessment.title}</h1>
              {assessment.description && (
                <p className="text-gray-700 mt-1">{assessment.description}</p>
              )}
            </div>
          </div>

          {/* Info Bar */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 flex gap-6 items-center flex-wrap">
            <div>
              <p className="text-gray-700 text-sm">Total Points</p>
              <p className="text-lg font-semibold text-gray-900">{assessment.totalPoints}</p>
            </div>

            <div>
              <p className="text-gray-700 text-sm">Questions</p>
              <p className="text-lg font-semibold text-gray-900">
                {assessment.AssessmentQuestions?.length || 0}
              </p>
            </div>

            {assessment.deadline && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <FiClock size={18} />
                <span>Deadline: {formatDeadline(assessment.deadline)}</span>
              </div>
            )}

            {/* Progress Bar */}
            <div className="flex-1 min-w-[200px]">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium text-gray-700">Progress</p>
                <p className="text-sm font-semibold text-gray-900">{progress}%</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-4 mb-8">
            {assessment.AssessmentQuestions?.map((question, index) => (
              <div
                key={question.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
              >
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() =>
                    setExpandedQuestion(expandedQuestion === index ? -1 : index)
                  }
                >
                  <div className="flex items-start justify-between">
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

                  {expandedQuestion === index ? (
                      <FiChevronUp className="text-gray-700 mt-1" />
                    ) : (
                      <FiChevronDown className="text-gray-700 mt-1" />
                    )}
                  </div>
                </div>

                {/* Expanded Question Content */}
                {expandedQuestion === index && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    {question.questionType === 'TEXT' && (
                      <textarea
                        value={getResponseValue(question.id, 'TEXT') as string}
                        onChange={(e) => handleResponseChange(question.id, e.target.value)}
                        placeholder="Enter your answer here..."
                        disabled={isAlreadySubmitted}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed"
                        rows={6}
                      />
                    )}

                    {question.questionType === 'MCQ' && (
                      <div className="space-y-3">
                        {question.metadata?.options?.map((option, optionIndex) => (
                          <label key={optionIndex} className={`flex items-center gap-3 p-3 rounded-lg hover:bg-white cursor-pointer transition-colors ${isAlreadySubmitted ? 'cursor-not-allowed opacity-75' : ''}`}>
                            {question.metadata?.multipleCorrect ? (
                              <input
                                type="checkbox"
                                checked={
                                  Array.isArray(getResponseValue(question.id, 'MCQ'))
                                    ? (getResponseValue(question.id, 'MCQ') as string[]).includes(
                                        optionIndex.toString()
                                      )
                                    : false
                                }
                                onChange={() =>
                                  handleMCQChange(question.id, optionIndex, true)
                                }
                                disabled={isAlreadySubmitted}
                                className="w-4 h-4 disabled:cursor-not-allowed"
                              />
                            ) : (
                              <input
                                type="radio"
                                name={question.id}
                                checked={
                                  getResponseValue(question.id, 'MCQ') ===
                                  optionIndex.toString()
                                }
                                onChange={() =>
                                  handleMCQChange(question.id, optionIndex, false)
                                }
                                disabled={isAlreadySubmitted}
                                className="w-4 h-4 disabled:cursor-not-allowed"
                              />
                            )}
                            <span className="text-gray-900">{option}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {question.questionType === 'FILE' && (
                      <div className={`border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors ${isAlreadySubmitted ? 'bg-gray-50 opacity-75' : ''}`}>
                        <input
                          type="file"
                          id={`file-${question.id}`}
                          className="hidden"
                          disabled={saving || isAlreadySubmitted}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(question.id, file);
                            }
                          }}
                        />
                        <label
                          htmlFor={`file-${question.id}`}
                          className={`cursor-pointer block ${saving || isAlreadySubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <p className="text-gray-900 font-medium">
                            {isAlreadySubmitted ? 'File submitted' : saving ? 'Uploading...' : 'Click to upload file'}
                          </p>
                          <p className="text-gray-700 text-sm mt-1">
                            {(getResponseValue(question.id, 'FILE') as string) || 'No file selected'}
                          </p>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            {isAlreadySubmitted ? (
              <>
                <button
                  disabled={true}
                  className="bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 mx-auto cursor-not-allowed"
                >
                  <FiCheck size={20} />
                  Already Submitted
                </button>
                <p className="text-gray-700 text-sm mt-4">
                  You have already submitted this assessment. Your submission cannot be modified.
                </p>
                <button
                  onClick={() => router.push('/student/assessments')}
                  className="mt-4 bg-gray-600 hover:bg-gray-700 text-white px-8 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <FiArrowLeft size={18} />
                  Back to Assessments
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowSubmitConfirm(true)}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <FiCheck size={20} />
                  {saving ? 'Submitting...' : 'Submit Assessment'}
                </button>
                <p className="text-gray-700 text-sm mt-4">
                  {saving ? 'Saving...' : 'Your answers are auto-saved'}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-blue-100 rounded-full mb-4">
                <FiAlertCircle className="text-blue-600" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Submit Assessment?
              </h3>
              <p className="text-gray-700 text-center mb-6">
                Once submitted, you will not be able to modify your answers. Make sure you have answered all questions you want to answer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSubmitConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitAssessment}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
                >
                  {saving ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
