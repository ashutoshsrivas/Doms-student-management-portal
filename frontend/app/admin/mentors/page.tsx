'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiPlus, FiEdit2, FiTrash2, FiUsers, FiChevronDown } from 'react-icons/fi';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import DashboardLayout from '@/app/components/DashboardLayout';

interface MentorTeam {
  id: string;
  sessionId: string;
  facultyId: string;
  teamName: string;
  description: string;
  status: string;
  Faculty?: { id: string; firstName: string; lastName: string; email: string };
  AcademicSession?: { id: string; name: string };
  MentorTeamMembers?: Array<{ id: string; studentSessionId: string; StudentSession?: { Student?: { firstName?: string; lastName?: string; email?: string } } }>;
}

interface Faculty {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  approvedRole?: string;
}

interface StudentSession {
  id: string;
  Student: { id: string; firstName: string; lastName: string; email?: string };
}

export default function MentorTeamManagement() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [teams, setTeams] = useState<MentorTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [formData, setFormData] = useState({
    sessionId: '',
    facultyId: '',
    teamName: '',
    description: '',
    studentSessionIds: [] as string[],
  });
  const [sessions, setSessions] = useState<{ id: string; name: string }[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [students, setStudents] = useState<StudentSession[]>([]);
  const [selectedSession, setSelectedSession] = useState('');

  const fetchTeams = async () => {
    try {
      const response = await apiClient.get('/mentor/teams');
      setTeams(response.data.teams || []);
    } catch (error) {
      console.error('Failed to fetch mentor teams:', error);
      toast.error('Failed to load mentor teams');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await apiClient.get('/sessions');
      setSessions(response.data.sessions || []);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const fetchFaculties = async () => {
    try {
      // Faculty Member picker = every non-STUDENT user. The backend allows
      // any active staff (admin / HOD / faculty / chair-head / coordinator
      // / PC / trainer / mentor) to be assigned as a team's mentor.
      const res = await apiClient.get('/users');
      const all = (res.data.users || []) as Faculty[];
      const eligible = all
        .filter((u) => u.approvedRole && u.approvedRole !== 'STUDENT')
        .sort((a, b) => (`${a.firstName} ${a.lastName}`).localeCompare(`${b.firstName} ${b.lastName}`));
      setFaculties(eligible);
    } catch (error) {
      console.error('Failed to fetch faculties:', error);
      toast.error('Failed to load user list — check your permissions');
    }
  };

  const fetchStudents = async (sessionId: string) => {
    try {
      const response = await apiClient.get(`/sessions/${sessionId}/students?limit=999999`);
      setStudents(response.data.students || []);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  // Redirect if not admin
  useEffect(() => {
    if (!['ADMIN', 'HOD', 'CHAIR_HEAD'].includes(user?.role || '')) {
      router.push('/dashboard');
    }
  }, [user?.role, router]);

  // Fetch initial data
  useEffect(() => {
    const load = async () => {
      await fetchTeams();
      await fetchSessions();
      await fetchFaculties();
    };
    load();
  }, []);

  // Fetch students when session changes
  useEffect(() => {
    if (selectedSession) {
      const load = async () => { await fetchStudents(selectedSession); };
      load();
    }
  }, [selectedSession]);

  // Filter students based on search
  const filteredStudents = students.filter(student =>
    `${student.Student?.firstName} ${student.Student?.lastName} ${student.Student?.email}`.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.sessionId || !formData.facultyId || !formData.teamName) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const response = await apiClient.post('/mentor/teams', {
        sessionId: formData.sessionId,
        facultyId: formData.facultyId,
        teamName: formData.teamName,
        description: formData.description,
        studentSessionIds: formData.studentSessionIds,
      });

      toast.success('Mentor team created successfully');
      setShowModal(false);
      setStudentSearch('');
      setFormData({
        sessionId: '',
        facultyId: '',
        teamName: '',
        description: '',
        studentSessionIds: [],
      });
      fetchTeams();
    } catch (error) {
      console.error('Failed to create team:', error);
      toast.error('Failed to create mentor team');
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!window.confirm('Are you sure you want to delete this team?')) return;

    try {
      await apiClient.delete(`/mentor/teams/${teamId}`);
      toast.success('Team deleted successfully');
      fetchTeams();
    } catch (error) {
      console.error('Failed to delete team:', error);
      toast.error('Failed to delete team');
    }
  };

  const handleEditTeam = (team: MentorTeam) => {
    setEditingTeamId(team.id);
    setFormData({
      sessionId: team.sessionId,
      facultyId: team.facultyId,
      teamName: team.teamName,
      description: team.description,
      studentSessionIds: team.MentorTeamMembers?.map(m => m.studentSessionId) || [],
    });
    setSelectedSession(team.sessionId);
    setShowEditModal(true);
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingTeamId || !formData.sessionId || !formData.facultyId || !formData.teamName) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Update team info (faculty, name, description)
      await apiClient.put(`/mentor/teams/${editingTeamId}`, {
        facultyId: formData.facultyId,
        teamName: formData.teamName,
        description: formData.description,
      });

      // Handle member updates - get current team to compare
      const currentTeam = teams.find(t => t.id === editingTeamId);
      const currentMemberIds = currentTeam?.MentorTeamMembers?.map(m => m.studentSessionId) || [];
      const newMemberIds = formData.studentSessionIds;

      // Remove members that are no longer selected
      const membersToRemove = currentMemberIds.filter(id => !newMemberIds.includes(id));
      for (const memberId of membersToRemove) {
        const memberRecord = currentTeam?.MentorTeamMembers?.find(m => m.studentSessionId === memberId);
        if (memberRecord?.id) {
          await apiClient.delete(`/mentor/teams/${editingTeamId}/members/${memberRecord.id}`);
        }
      }

      // Add new members
      const membersToAdd = newMemberIds.filter(id => !currentMemberIds.includes(id));
      if (membersToAdd.length > 0) {
        await apiClient.post(`/mentor/teams/${editingTeamId}/members`, {
          studentSessionIds: membersToAdd,
        });
      }

      toast.success('Team updated successfully');
      setShowEditModal(false);
      setEditingTeamId(null);
      setFormData({
        sessionId: '',
        facultyId: '',
        teamName: '',
        description: '',
        studentSessionIds: [],
      });
      fetchTeams();
    } catch (error) {
      console.error('Failed to update team:', error);
      toast.error('Failed to update team');
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setFormData(prev => ({
      ...prev,
      studentSessionIds: prev.studentSessionIds.includes(studentId)
        ? prev.studentSessionIds.filter(id => id !== studentId)
        : [...prev.studentSessionIds, studentId],
    }));
  };

  if (!user || !['ADMIN', 'HOD', 'CHAIR_HEAD'].includes(user.role)) {
    return null;
  }

  return (
    <DashboardLayout title="Mentor Team Management">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mentor Team Management</h1>
            <p className="text-gray-600 mt-2">Create and manage mentor-mentee teams</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <FiPlus /> Create Team
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading mentor teams...</p>
            </div>
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-12">
            <FiUsers className="text-4xl text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No mentor teams created yet</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Create First Team
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {teams.map(team => (
              <div
                key={team.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{team.teamName}</h3>
                    <p className="text-gray-600 text-sm mt-1">
                      Session: {team.AcademicSession?.name}
                    </p>
                    {team.description && (
                      <p className="text-gray-600 text-sm mt-2">{team.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditTeam(team)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                      title="Edit team"
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                      title="Delete team"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Faculty: </span>
                    <span className="font-medium text-gray-900">
                      {team.Faculty?.firstName} {team.Faculty?.lastName}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status: </span>
                    <span
                      className={`inline-block px-2 py-1 rounded text-white text-xs font-medium ${
                        team.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-500'
                      }`}
                    >
                      {team.status}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    Members ({team.MentorTeamMembers?.length || 0})
                  </p>
                  {team.MentorTeamMembers && team.MentorTeamMembers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {team.MentorTeamMembers.map(member => (
                        <div
                          key={member.id}
                          className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
                        >
                          {member.StudentSession?.Student?.firstName}{' '}
                          {member.StudentSession?.Student?.lastName}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No members added yet</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Team Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6">Create Mentor Team</h2>

              <form onSubmit={handleCreateTeam}>
                <div className="space-y-4">
                  {/* Session Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Academic Session *
                    </label>
                    <select
                      value={formData.sessionId}
                      onChange={e => {
                        setFormData(prev => ({ ...prev, sessionId: e.target.value }));
                        setSelectedSession(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a session</option>
                      {sessions.map(session => (
                        <option key={session.id} value={session.id}>
                          {session.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Faculty Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Faculty Member *
                    </label>
                    <select
                      value={formData.facultyId}
                      onChange={e => setFormData(prev => ({ ...prev, facultyId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a faculty</option>
                      {faculties.map(faculty => (
                        <option key={faculty.id} value={faculty.id}>
                          {faculty.firstName} {faculty.lastName}{faculty.approvedRole ? ` — ${faculty.approvedRole}` : ''} ({faculty.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Team Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Team Name *
                    </label>
                    <input
                      type="text"
                      value={formData.teamName}
                      onChange={e => setFormData(prev => ({ ...prev, teamName: e.target.value }))}
                      placeholder="e.g., Group A - Batch 2024"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Optional description"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Student Selection */}
                  {selectedSession && students.length > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-900">
                          Add Students ({formData.studentSessionIds.length} selected)
                        </label>
                      </div>

                      {/* Search Input */}
                      <input
                        type="text"
                        placeholder="Search students by name or email..."
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />

                      {/* Student List */}
                      <div className="border border-gray-300 rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
                        {filteredStudents.length > 0 ? (
                          filteredStudents.map(student => (
                            <label key={student.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition">
                              <input
                                type="checkbox"
                                checked={formData.studentSessionIds.includes(student.id)}
                                onChange={() => toggleStudentSelection(student.id)}
                                className="w-4 h-4 border-gray-300 rounded"
                              />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-gray-900 block">
                                  {student.Student?.firstName} {student.Student?.lastName}
                                </span>
                                <span className="text-xs text-gray-500 block">{student.Student?.email}</span>
                              </div>
                            </label>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-4">
                            {studentSearch ? 'No students match your search' : 'No students available'}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Create Team
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setStudentSearch('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 transition font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingTeamId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6">Edit Mentor Team</h2>

              <form onSubmit={handleUpdateTeam}>
                <div className="space-y-4">
                  {/* Session Selection - Read Only */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Academic Session
                    </label>
                    <input
                      type="text"
                      value={sessions.find(s => s.id === formData.sessionId)?.name || ''}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    />
                  </div>

                  {/* Faculty Selection - Editable */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Faculty Member *
                    </label>
                    <select
                      value={formData.facultyId}
                      onChange={e => setFormData(prev => ({ ...prev, facultyId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a faculty</option>
                      {faculties.map(faculty => (
                        <option key={faculty.id} value={faculty.id}>
                          {faculty.firstName} {faculty.lastName}{faculty.approvedRole ? ` — ${faculty.approvedRole}` : ''} ({faculty.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Team Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Team Name *
                    </label>
                    <input
                      type="text"
                      value={formData.teamName}
                      onChange={e => setFormData(prev => ({ ...prev, teamName: e.target.value }))}
                      placeholder="e.g., Group A - Batch 2024"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Optional description"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Student Selection */}
                  {selectedSession && students.length > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-900">
                          Team Members ({formData.studentSessionIds.length} selected)
                        </label>
                      </div>

                      {/* Search Input */}
                      <input
                        type="text"
                        placeholder="Search students by name or email..."
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />

                      {/* Student List */}
                      <div className="border border-gray-300 rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
                        {filteredStudents.length > 0 ? (
                          filteredStudents.map(student => (
                            <label key={student.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition">
                              <input
                                type="checkbox"
                                checked={formData.studentSessionIds.includes(student.id)}
                                onChange={() => toggleStudentSelection(student.id)}
                                className="w-4 h-4 border-gray-300 rounded"
                              />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-gray-900 block">
                                  {student.Student?.firstName} {student.Student?.lastName}
                                </span>
                                <span className="text-xs text-gray-500 block">{student.Student?.email}</span>
                              </div>
                            </label>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-4">
                            {studentSearch ? 'No students match your search' : 'No students available'}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Update Team
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingTeamId(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 transition font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
