'use client';

import { useState, useEffect } from 'react';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import DashboardLayout from '@/app/components/DashboardLayout';
import Link from 'next/link';

export default function AdminAnswersContent({ questionId }: { questionId: string }) {
  const { user } = useAuthStore();
  const [question, setQuestion] = useState<{ question: string; description?: string; createdAt: string } | null>(null);
  const [answers, setAnswers] = useState<{ id: string; SIP?: { StudentSession?: { Student?: { firstName?: string; lastName?: string; email?: string } } }; answerText?: string; answerDocument?: string; submittedAt: string; [key: string]: unknown }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnswers = async () => {
      try {
        // Fetch question details
        try {
          const questionResponse = await apiClient.get(
            `/sip-questions/${questionId}`
          );
          setQuestion(questionResponse.data);
        } catch (error) {
          console.log('Could not fetch question details');
        }

        // Fetch all answers to this question
        const answersResponse = await apiClient.get(
          `/sip-questions/${questionId}/answers`
        );
        setAnswers(answersResponse.data || []);
      } catch (error) {
        console.error('Error fetching answers:', error);
        toast.error('Failed to load answers');
      } finally {
        setLoading(false);
      }
    };

    fetchAnswers();
  }, [questionId]);

  if (loading) {
    return <div className="text-center py-8 text-gray-900 font-semibold">Loading...</div>;
  }

  return (
    <DashboardLayout title="SIP Question Answers">
      <div className="space-y-6">
        <Link
          href="/admin/sip-questions"
          className="inline-block bg-blue-700 text-white px-6 py-3 rounded font-bold hover:bg-blue-800 text-base"
        >
          ← Back to Questions
        </Link>

        {question && (
          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-700">
            <h2 className="font-bold text-xl text-gray-900 mb-2">
              {question.question}
            </h2>
            {question.description && (
              <p className="text-gray-700 font-semibold text-base mb-3">
                {question.description}
              </p>
            )}
            <p className="text-gray-600 text-sm font-semibold">
              Posted on {new Date(question.createdAt).toLocaleDateString()}
            </p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-6 border-b-2 border-gray-300">
            <h3 className="text-lg font-bold text-gray-900">
              Answers ({answers.length})
            </h3>
          </div>

          {answers.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-700 font-semibold">No answers submitted yet</p>
            </div>
          ) : (
            <div className="divide-y-2 divide-gray-300">
              {answers.map(answer => {
                const studentName =
                  answer.SIP?.StudentSession?.Student?.firstName &&
                  answer.SIP?.StudentSession?.Student?.lastName
                    ? `${answer.SIP.StudentSession.Student.firstName} ${answer.SIP.StudentSession.Student.lastName}`
                    : 'Unknown Student';

                const studentEmail = answer.SIP?.StudentSession?.Student?.email || 'N/A';

                return (
                  <div key={answer.id} className="p-6 hover:bg-blue-50 transition">
                    <div className="mb-4">
                      <h4 className="font-bold text-lg text-gray-900 mb-1">
                        {studentName}
                      </h4>
                      <p className="text-gray-600 font-semibold text-sm mb-3">
                        {studentEmail}
                      </p>
                    </div>

                    {answer.answerText && (
                      <div className="mb-4 bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-900 font-bold text-sm mb-2">
                          Text Answer:
                        </p>
                        <p className="text-gray-700 font-semibold whitespace-pre-wrap">
                          {answer.answerText}
                        </p>
                      </div>
                    )}

                    {answer.answerDocument && (
                      <div className="mb-4">
                        <p className="text-gray-900 font-bold text-sm mb-2">
                          Document:
                        </p>
                        <a
                          href={answer.answerDocument}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 font-bold hover:underline"
                        >
                          View Document
                        </a>
                      </div>
                    )}

                    <p className="text-gray-600 text-xs font-semibold">
                      Submitted on{' '}
                      {new Date(answer.submittedAt).toLocaleDateString()} at{' '}
                      {new Date(answer.submittedAt).toLocaleTimeString()}
                    </p>
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
