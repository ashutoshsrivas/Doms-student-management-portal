'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiUsers, FiPlus, FiEdit2, FiCheckCircle, FiClock } from 'react-icons/fi';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import DashboardLayout from '@/app/components/DashboardLayout';

interface MentorTeamMember {
  StudentSession?: {
    Student?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

interface MentorTeam {
  id: string;
  teamName: string;
  status: string;
  MentorTeamMembers: MentorTeamMember[];
}

interface Mentee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface MentorResponse {
  id: string;
  studentSessionId: string;
}

interface Requirement {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: string;
  MentorResponses?: MentorResponse[];
}

export default function FacultyMentorDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [mentorTeams, setMentorTeams] = useState<MentorTeam[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<MentorTeam | null>(null);
  const [mentees, setMentees] = useState<{ id: string; firstName: string; lastName: string; email: string }[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequirementModal, setShowRequirementModal] = useState(false);
  const [selectedMentee, setSelectedMentee] = useState<Mentee | null>(null);
  const [requirementForm, setRequirementForm] = useState({
    title: '',
    description: '',
    dueDate: '',
  });

  // Redirect if not faculty/mentor/chair-head/PC
  useEffect(() => {
    if (!['FACULTY', 'CHAIR_HEAD', 'MENTOR', 'PLACEMENT_COORDINATOR'].includes(user?.role || '')) {
      router.push('/dashboard');
    }
  }, [user?.role, router]);

  const fetchTeamData = async (teamId: string) => {
    try {
      // Fetch team details with mentees
      const teamResponse = await apiClient.get(`/mentor/teams/${teamId}`);
      const team = teamResponse.data.team;
      const teamMentees = team.MentorTeamMembers?.map(
        (member: MentorTeamMember) => member.StudentSession?.Student
      ).filter(Boolean) || [];
      setMentees(teamMentees);

      // Fetch requirements
      const reqResponse = await apiClient.get(`/mentor/teams/${teamId}/requirements`);
      setRequirements(reqResponse.data.requirements || []);
    } catch (error) {
      console.error('Failed to fetch team data:', error);
      toast.error('Failed to load team data');
    }
  };

  const fetchMentorTeams = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/mentor/teams', { params: { facultyId: user?.id } });
      const teams = response.data.teams || [];
      setMentorTeams(teams);

      if (teams.length > 0) {
        setSelectedTeam(teams[0]);
        fetchTeamData(teams[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch mentor teams:', error);
      toast.error('Failed to load mentor teams');
    } finally {
      setLoading(false);
    }
  };

  // Fetch mentor teams
  useEffect(() => {
    const load = async () => { await fetchMentorTeams(); };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateRequirement = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTeam || !requirementForm.title || !requirementForm.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const response = await apiClient.post(
        `/mentor/teams/${selectedTeam.id}/requirements`,
        {
          title: requirementForm.title,
          description: requirementForm.description,
          dueDate: requirementForm.dueDate || null,
        }
      );

      toast.success('Requirement posted successfully');
      setShowRequirementModal(false);
      setRequirementForm({ title: '', description: '', dueDate: '' });
      fetchTeamData(selectedTeam.id);
    } catch (error) {
      console.error('Failed to create requirement:', error);
      toast.error('Failed to post requirement');
    }
  };

  if (!user || !['FACULTY', 'CHAIR_HEAD', 'MENTOR', 'PLACEMENT_COORDINATOR'].includes(user.role)) {
    return null;
  }

  return (
    <DashboardLayout title="Mentor Dashboard">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Mentor Teams</h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading mentor teams...</p>
            </div>
          </div>
        ) : mentorTeams.length === 0 ? (
          <div className="text-center py-12">
            <FiUsers className="text-4xl text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No mentor teams assigned yet</p>
            <p className="text-gray-500 text-sm mt-2">Contact admin to be assigned as a mentor</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Teams Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Teams</h2>
                <div className="space-y-2">
                  {mentorTeams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => {
                        setSelectedTeam(team);
                        fetchTeamData(team.id);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg transition ${
                        selectedTeam?.id === team.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-50 text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <p className="font-medium">{team.teamName}</p>
                      <p className={`text-sm ${selectedTeam?.id === team.id ? 'text-blue-100' : 'text-gray-600'}`}>
                        {team.MentorTeamMembers?.length || 0} members
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content */}
            {selectedTeam && (
              <div className="lg:col-span-2 space-y-6">
                {/* Mentees Section */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">My Mentees</h2>
                    <span className="text-sm text-gray-500">
                      {mentees.length} student{mentees.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {mentees.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">No mentees in this team yet</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {mentees.map(mentee => (
                        <div
                          key={mentee.id}
                          className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition cursor-pointer"
                          onClick={() => setSelectedMentee(mentee)}
                        >
                          <p className="font-medium text-gray-900">
                            {mentee.firstName} {mentee.lastName}
                          </p>
                          <p className="text-sm text-gray-600">{mentee.email}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Requirements Section */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Posted Requirements</h2>
                    <button
                      onClick={() => setShowRequirementModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      <FiPlus /> Post Requirement
                    </button>
                  </div>

                  {requirements.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">No requirements posted yet</p>
                  ) : (
                    <div className="space-y-4">
                      {requirements.map(req => {
                        const respondedCount = req.MentorResponses?.length || 0;
                        const totalMentees = mentees.length;
                        const pendingCount = totalMentees - respondedCount;

                        return (
                          <div key={req.id} className="p-4 border border-gray-200 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-medium text-gray-900">{req.title}</h3>
                              <span
                                className={`text-xs px-2 py-1 rounded font-medium ${
                                  req.status === 'ACTIVE'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {req.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{req.description}</p>
                            {req.dueDate && (
                              <p className="text-xs text-gray-500 mb-3">
                                Due: {new Date(req.dueDate).toLocaleDateString()}
                              </p>
                            )}

                            {/* Response Status */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="flex items-center gap-2 text-green-600">
                                <FiCheckCircle /> {respondedCount} Responded
                              </div>
                              <div className="flex items-center gap-2 text-orange-600">
                                <FiClock /> {pendingCount} Pending
                              </div>
                            </div>

                            {/* View Responses Button */}
                            <button
                              onClick={() => router.push(`/faculty/mentors/requirements/${req.id}`)}
                              className="mt-3 w-full px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded transition"
                            >
                              View Responses
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Requirement Modal */}
        {showRequirementModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
              <h2 className="text-2xl font-bold mb-6">Post Requirement</h2>

              <form onSubmit={handleCreateRequirement}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={requirementForm.title}
                      onChange={e =>
                        setRequirementForm(prev => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="e.g., Project Proposal Submission"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={requirementForm.description}
                      onChange={e =>
                        setRequirementForm(prev => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Describe the requirement here..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={requirementForm.dueDate}
                      onChange={e =>
                        setRequirementForm(prev => ({ ...prev, dueDate: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Post Requirement
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRequirementModal(false)}
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
