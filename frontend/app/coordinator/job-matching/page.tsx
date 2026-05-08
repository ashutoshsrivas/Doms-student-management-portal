'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import useAuthStore from '@/app/store/authStore';
import { FiArrowLeft, FiLoader, FiSearch, FiUser, FiAward, FiTrendingUp } from 'react-icons/fi';
import toast from 'react-hot-toast';

function JobMatchingContent() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuthStore();
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  // Fetch available sessions
  useEffect(() => {
    if (!token) return;

    const fetchSessions = async () => {
      try {
        setLoadingSessions(true);
        const response = await fetch('http://localhost:4000/api/sessions?limit=100', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (data.sessions && Array.isArray(data.sessions)) {
          setSessions(data.sessions);
          // Auto-select first session if available
          if (data.sessions.length > 0) {
            setSelectedSessionId(data.sessions[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching sessions:', error);
        toast.error('Error loading sessions');
      } finally {
        setLoadingSessions(false);
      }
    };

    fetchSessions();
  }, [token]);

  const handleSearchStudents = async (e) => {
    e.preventDefault();

    if (!jobDescription.trim()) {
      toast.error('Please enter a job description');
      return;
    }

    if (!selectedSessionId) {
      toast.error('Please select a session');
      return;
    }

    setLoading(true);
    setMatches([]);
    setSelectedStudent(null);

    try {
      const response = await fetch('http://localhost:4000/api/job-matching/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ jobDescription, sessionId: selectedSessionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to match students');
      }

      if (data.success) {
        setMatches(data.data.topMatches);
        toast.success(`Found ${data.data.topMatches.length} matching students`);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Error matching students');
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudentDetails = async (match) => {
    setSelectedStudent(match);
    setLoadingDetails(true);

    try {
      const response = await fetch(`http://localhost:4000/api/job-matching/student/${match.studentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setStudentDetails(data.data);
      } else {
        toast.error('Failed to load student details');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error loading student details');
    } finally {
      setLoadingDetails(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <FiLoader className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4">
            <Link
              href="/coordinator/dashboard"
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <FiArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Job Matching</h1>
              <p className="text-gray-600 mt-1">Find the best students for your job openings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Job Description Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Find Matching Students</h2>
              <form onSubmit={handleSearchStudents} className="space-y-4">
                {/* Session Selection */}
                <div>
                  <label htmlFor="session" className="block text-sm font-medium text-gray-700 mb-2">
                    Select Batch/Session <span className="text-red-500">*</span>
                  </label>
                  {loadingSessions ? (
                    <div className="flex items-center justify-center py-3">
                      <FiLoader className="animate-spin text-blue-600" size={18} />
                      <span className="ml-2 text-sm text-gray-600">Loading sessions...</span>
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className="text-center py-3">
                      <p className="text-sm text-gray-600">No sessions available</p>
                    </div>
                  ) : (
                    <select
                      id="session"
                      value={selectedSessionId}
                      onChange={(e) => setSelectedSessionId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Select a session --</option>
                      {sessions.map((session) => (
                        <option key={session.id} value={session.id}>
                          {session.name} ({session._count?.StudentSessions || 0} students)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label htmlFor="jobDesc" className="block text-sm font-medium text-gray-700 mb-2">
                    Paste Job Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="jobDesc"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Include job title, responsibilities, required skills, experience level, qualifications, etc."
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !selectedSessionId}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
                >
                  {loading ? (
                    <>
                      <FiLoader className="animate-spin" size={18} />
                      Searching...
                    </>
                  ) : (
                    <>
                      <FiSearch size={18} />
                      Find Matches
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>💡 Tip:</strong> The more detailed your job description, the more accurate the matches will be. Include specific skills, experience level, and any must-have qualifications.
                </p>
              </div>
            </div>
          </div>

          {/* Right Panel - Results */}
          <div className="lg:col-span-2">
            {matches.length === 0 && !loading && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <FiSearch size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">
                  {jobDescription.trim() ? 'No matches found' : 'Enter a job description to find matching students'}
                </p>
              </div>
            )}

            {/* Results List */}
            {matches.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Top Matches ({matches.length})
                </h2>
                {matches.map((match, idx) => (
                  <div
                    key={match.studentId}
                    className={`bg-white rounded-lg shadow p-6 cursor-pointer transition hover:shadow-lg ${
                      selectedStudent?.studentId === match.studentId ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => handleViewStudentDetails(match)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          #{idx + 1}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{match.studentName}</h3>
                          <p className="text-sm text-gray-600">{match.studentEmail}</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="text-right">
                          <div className="text-3xl font-bold text-blue-600">{match.matchScore}%</div>
                          <p className="text-xs text-gray-600">Match Score</p>
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-700 mb-3">{match.reasoning}</p>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                          <FiAward size={14} /> Key Strengths
                        </p>
                        <ul className="space-y-1">
                          {match.keyStrengths.map((strength, i) => (
                            <li key={i} className="text-sm text-green-700 bg-green-50 px-2 py-1 rounded">
                              ✓ {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Gap Areas</p>
                        <ul className="space-y-1">
                          {match.gapAreas.map((gap, i) => (
                            <li key={i} className="text-sm text-orange-700 bg-orange-50 px-2 py-1 rounded">
                              ⚠ {gap}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewStudentDetails(match);
                      }}
                      className="w-full text-sm py-2 px-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-medium transition"
                    >
                      {loadingDetails && selectedStudent?.studentId === match.studentId ? (
                        <FiLoader className="inline animate-spin mr-2" size={14} />
                      ) : (
                        <FiUser className="inline mr-2" size={14} />
                      )}
                      View Full Profile
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Student Details Modal */}
            {selectedStudent && studentDetails && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  {/* Modal Header */}
                  <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">{studentDetails.personalInfo.name}</h2>
                      <p className="text-blue-100 mt-1">{studentDetails.personalInfo.department}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedStudent(null);
                        setStudentDetails(null);
                      }}
                      className="text-white hover:bg-blue-500 p-2 rounded-lg transition"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Modal Content */}
                  <div className="p-6 space-y-6">
                    {/* Personal Info */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Personal Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="font-medium text-gray-900">{studentDetails.personalInfo.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Phone</p>
                          <p className="font-medium text-gray-900">{studentDetails.personalInfo.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Registration Number</p>
                          <p className="font-medium text-gray-900">{studentDetails.personalInfo.registrationNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Department</p>
                          <p className="font-medium text-gray-900">{studentDetails.personalInfo.department}</p>
                        </div>
                      </div>
                    </div>

                    {/* Professional Profile */}
                    {(studentDetails.profile.careerObjective || studentDetails.profile.aboutMe) && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Professional Profile</h3>
                        {studentDetails.profile.careerObjective && (
                          <div className="mb-3">
                            <p className="text-sm text-gray-600">Career Objective</p>
                            <p className="text-gray-700">{studentDetails.profile.careerObjective}</p>
                          </div>
                        )}
                        {studentDetails.profile.aboutMe && (
                          <div>
                            <p className="text-sm text-gray-600">About</p>
                            <p className="text-gray-700">{studentDetails.profile.aboutMe}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Skills */}
                    {studentDetails.profile.skills && studentDetails.profile.skills.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Skills</h3>
                        <div className="flex flex-wrap gap-2">
                          {studentDetails.profile.skills.map((skill, i) => (
                            <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Work Experience */}
                    {studentDetails.profile.workExperiences && studentDetails.profile.workExperiences.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <FiTrendingUp size={18} /> Work Experience
                        </h3>
                        <div className="space-y-3">
                          {studentDetails.profile.workExperiences.map((exp, i) => (
                            <div key={i} className="p-3 border border-gray-200 rounded-lg">
                              <p className="font-medium text-gray-900">{exp.position} at {exp.company}</p>
                              <p className="text-sm text-gray-600">{exp.duration}</p>
                              {exp.description && <p className="text-sm text-gray-700 mt-2">{exp.description}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Achievements */}
                    {studentDetails.profile.achievements && studentDetails.profile.achievements.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <FiAward size={18} /> Achievements
                        </h3>
                        <ul className="space-y-2">
                          {studentDetails.profile.achievements.map((achievement, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-green-600">✓</span>
                              <span className="text-gray-700">{achievement.title || achievement}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Projects */}
                    {studentDetails.profile.projects && studentDetails.profile.projects.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Projects</h3>
                        <div className="space-y-3">
                          {studentDetails.profile.projects.map((project, i) => (
                            <div key={i} className="p-3 border border-gray-200 rounded-lg">
                              <p className="font-medium text-gray-900">{project.title}</p>
                              {project.description && <p className="text-sm text-gray-700 mt-1">{project.description}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Certifications */}
                    {studentDetails.profile.certifications && studentDetails.profile.certifications.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Certifications</h3>
                        <div className="space-y-2">
                          {studentDetails.profile.certifications.map((cert, i) => (
                            <p key={i} className="text-gray-700 flex items-center gap-2">
                              <span className="text-blue-600">★</span> {cert}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex gap-3">
                    <button
                      onClick={() => {
                        setSelectedStudent(null);
                        setStudentDetails(null);
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                    >
                      Close
                    </button>
                    <a
                      href={`/admin/sessions/${selectedStudent.sessionId}/students/${selectedStudent.studentId}/profile`}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-center"
                    >
                      View Full Profile
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JobMatchingPage() {
  return (
    <ProtectedRoute requiredRoles={['PLACEMENT_COORDINATOR']}>
      <JobMatchingContent />
    </ProtectedRoute>
  );
}
