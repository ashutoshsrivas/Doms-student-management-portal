'use client';

import { useState, useEffect } from 'react';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import DashboardLayout from '@/app/components/DashboardLayout';

type SIPQuestion = {
  id: string;
  question: string;
  description?: string;
  createdAt: string;
};

type SIPAnswer = {
  answerText?: string;
  answerDocument?: string;
  submittedAt: string;
};

export default function StudentSIPQuestionsContent() {
  const { user } = useAuthStore();
  const [questions, setQuestions] = useState<SIPQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [academicSessionId, setAcademicSessionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, SIPAnswer>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, File | null>>({});
  const [answerForms, setAnswerForms] = useState<Record<string, { answerText?: string }>>({});
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [sipEnabled, setSipEnabled] = useState(false);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const sessionResponse = await apiClient.get('/sessions/me/session');
        if (!sessionResponse.data?.session) {
          toast.error('You are not enrolled in any session');
          setLoading(false);
          return;
        }

        const session = sessionResponse.data.session;
        setAcademicSessionId(session.id);
        setSipEnabled(session.sipEnabled || false);

        if (!session.sipEnabled) {
          setLoading(false);
          return;
        }

        const questionsResponse = await apiClient.get(
          `/sip-questions/session/${session.id}`
        );
        setQuestions(questionsResponse.data || []);

        // Fetch existing answers for all questions
        const answersMap: Record<string, SIPAnswer> = {};
        for (const question of questionsResponse.data || []) {
          try {
            const answerResponse = await apiClient.get(
              `/sip-questions/${question.id}/my-answer`
            );
            if (answerResponse.data?.answer) {
              answersMap[question.id] = answerResponse.data.answer;
            }
          } catch (error) {
            // No answer yet for this question
          }
        }
        setAnswers(answersMap);
      } catch (error) {
        console.error('Error fetching questions:', error);
        toast.error('Failed to load questions');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  const handleAnswerSubmit = async (questionId: string) => {
    const answerForm = answerForms[questionId];
    const file = uploadingFiles[questionId];

    if (!answerForm?.answerText?.trim() && !file) {
      toast.error('Please provide an answer (text or document)');
      return;
    }

    try {
      setSubmitting(prev => ({ ...prev, [questionId]: true }));

      const formData = new FormData();
      if (answerForm?.answerText) {
        formData.append('answerText', answerForm.answerText);
      }
      if (file) {
        formData.append('document', file);
      }

      const response = await apiClient.post(
        `/sip-questions/${questionId}/answer`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      setAnswers(prev => ({
        ...prev,
        [questionId]: response.data.answer,
      }));
      setAnswerForms(prev => ({ ...prev, [questionId]: {} }));
      setUploadingFiles(prev => ({ ...prev, [questionId]: null }));

      toast.success('Answer submitted successfully');
    } catch (error) {
      console.error('Error submitting answer:', error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(
        err?.response?.data?.message || 'Failed to submit answer'
      );
    } finally {
      setSubmitting(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const handleFileSelect = (questionId: string, file: File | null | undefined) => {
    setUploadingFiles(prev => ({ ...prev, [questionId]: file ?? null }));
  };

  const handleAnswerTextChange = (questionId: string, text: string) => {
    setAnswerForms(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], answerText: text },
    }));
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-900 font-semibold">Loading...</div>;
  }

  if (!sipEnabled) {
    return (
      <DashboardLayout title="SIP Questions">
        <div className="bg-white rounded-lg shadow-lg p-6 text-center border-l-4 border-yellow-700">
          <p className="text-gray-900 font-semibold text-lg">
            SIP (Internship Program) is not yet enabled for your session. Please wait for your administrator to enable it.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="SIP Questions">
      <div className="space-y-6">
        {questions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <p className="text-gray-900 font-semibold">No questions posted yet</p>
          </div>
        ) : (
          questions.map(question => {
            const existingAnswer = answers[question.id];
            const answerForm = answerForms[question.id] || {};
            const uploadFile = uploadingFiles[question.id];

            return (
              <div
                key={question.id}
                className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-700"
              >
                <div className="mb-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-2">
                    {question.question}
                  </h3>
                  {question.description && (
                    <p className="text-gray-700 font-semibold text-base mb-3">
                      {question.description}
                    </p>
                  )}
                  <p className="text-gray-600 text-sm font-semibold">
                    Posted on {new Date(question.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {existingAnswer ? (
                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <p className="text-gray-900 font-bold mb-2">Your Answer:</p>
                    {existingAnswer.answerText && (
                      <div className="mb-3">
                        <p className="text-gray-700 font-semibold whitespace-pre-wrap">
                          {existingAnswer.answerText}
                        </p>
                      </div>
                    )}
                    {existingAnswer.answerDocument && (
                      <div>
                        <a
                          href={existingAnswer.answerDocument}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 font-bold hover:underline"
                        >
                          View Submitted Document
                        </a>
                      </div>
                    )}
                    <p className="text-gray-600 text-xs font-semibold mt-3">
                      Submitted on{' '}
                      {new Date(existingAnswer.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                ) : null}

                {editingQuestionId === question.id || !existingAnswer ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-gray-900 font-bold text-sm mb-2">
                        Your Answer (Text)
                      </label>
                      <textarea
                        placeholder="Enter your answer..."
                        value={answerForm.answerText || ''}
                        onChange={e => handleAnswerTextChange(question.id, e.target.value)}
                        className="w-full border-2 border-gray-300 rounded px-4 py-3 text-gray-900 font-medium placeholder-gray-600"
                        rows={4}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-900 font-bold text-sm mb-2">
                        Or Upload Document
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded px-4 py-6 text-center">
                        <input
                          type="file"
                          onChange={e => handleFileSelect(question.id, e.target.files?.[0])}
                          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                          className="hidden"
                          id={`file-input-${question.id}`}
                        />
                        <label
                          htmlFor={`file-input-${question.id}`}
                          className="cursor-pointer"
                        >
                          {uploadFile ? (
                            <p className="text-gray-900 font-bold">{uploadFile.name}</p>
                          ) : (
                            <>
                              <p className="text-gray-900 font-bold mb-1">
                                Click to upload or drag and drop
                              </p>
                              <p className="text-gray-600 font-semibold text-sm">
                                PDF, DOC, DOCX, TXT, JPG, PNG (max 50MB)
                              </p>
                            </>
                          )}
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAnswerSubmit(question.id)}
                        disabled={submitting[question.id]}
                        className="bg-green-700 text-white px-6 py-3 rounded font-bold hover:bg-green-800 disabled:opacity-50 text-base"
                      >
                        {submitting[question.id]
                          ? 'Submitting...'
                          : existingAnswer
                          ? 'Update Answer'
                          : 'Submit Answer'}
                      </button>
                      {existingAnswer && editingQuestionId === question.id && (
                        <button
                          onClick={() => setEditingQuestionId(null)}
                          className="bg-gray-700 text-white px-6 py-3 rounded font-bold hover:bg-gray-800 text-base"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingQuestionId(question.id)}
                    className="bg-blue-700 text-white px-6 py-3 rounded font-bold hover:bg-blue-800 text-base"
                  >
                    Edit Answer
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
}
