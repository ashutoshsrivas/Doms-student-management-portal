'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiFilter,
  FiSearch,
  FiX,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiEye,
  FiLock,
  FiChevronRight,
} from 'react-icons/fi';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import DashboardLayout from '@/app/components/DashboardLayout';

interface DistributionRow {
  id: string;
  facultyId: string;
  addedBy: string;
  Faculty?: { id: string; firstName: string; lastName: string; email: string };
}

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
  Distributions?: DistributionRow[];
  AssessmentQuestions?: Array<{
    id: string;
    questionText: string;
    questionType: string;
  }>;
  AcademicSession?: {
    id: string;
    name: string;
  };
}

interface Session {
  id: string;
  name: string;
}

interface FacultyUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  approvedRole: string;
  department?: string;
}

const DISTRIBUTOR_ROLES = ['ADMIN', 'HOD', 'PLACEMENT_COORDINATOR'];
const DISTRIBUTE_TARGET_ROLES = ['FACULTY', 'CHAIR_HEAD', 'MENTOR', 'HOD', 'ADMIN', 'PLACEMENT_COORDINATOR', 'COORDINATOR', 'TRAINER'];

const statusColors = {
  DRAFT: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  PUBLISHED: 'bg-green-100 text-green-800 border-green-300',
  CLOSED: 'bg-red-100 text-red-800 border-red-300',
};

const statusIcons = {
  DRAFT: FiAlertCircle,
  PUBLISHED: FiCheckCircle,
  CLOSED: FiLock,
};

export default function AssessmentsPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'MANUAL' as 'AUTO_GRADE' | 'MANUAL',
    assignmentScope: 'ALL_STUDENTS' as 'ALL_STUDENTS' | 'CATEGORY' | 'SPECIFIC_STUDENT',
    academicSessionId: '',
    deadline: '',
    totalPoints: 0,
  });

  const canDistribute = !!currentUser && DISTRIBUTOR_ROLES.includes(currentUser.role);
  const [facultyList, setFacultyList] = useState<FacultyUser[]>([]);
  const [facultyLoading, setFacultyLoading] = useState(false);
  const [selectedFacultyIds, setSelectedFacultyIds] = useState<string[]>([]);
  const [facultySearch, setFacultySearch] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; assessmentId?: string }>({
    show: false,
  });

  // Redirect if not authorized
  useEffect(() => {
    if (currentUser) {
      const allowedRoles = ['ADMIN', 'HOD', 'MENTOR', 'FACULTY', 'CHAIR_HEAD', 'PLACEMENT_COORDINATOR'];
      if (!allowedRoles.includes(currentUser.role)) {
        router.push('/dashboard');
      }
    }
  }, [currentUser, router]);

  // Fetch sessions
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await apiClient.get('/sessions?limit=100');
        setSessions(response.data.sessions || []);
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
      }
    };
    fetchSessions();
  }, []);

  // Fetch assessments
  const fetchAssessments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (sessionFilter) params.append('academicSessionId', sessionFilter);
      if (statusFilter) params.append('status', statusFilter);

      const response = await apiClient.get(`/assessments?${params.toString()}`);
      let assessmentList = response.data.assessments || [];

      // Client-side search filter
      if (search) {
        const searchLower = search.toLowerCase();
        assessmentList = assessmentList.filter(
          (a: Assessment) =>
            a.title.toLowerCase().includes(searchLower) ||
            a.description?.toLowerCase().includes(searchLower) ||
            `${a.Creator?.firstName} ${a.Creator?.lastName}`.toLowerCase().includes(searchLower)
        );
      }

      setAssessments(assessmentList);
    } catch (error) {
      console.error('Failed to fetch assessments:', error);
      toast.error('Failed to load assessments');
    } finally {
      setLoading(false);
    }
  }, [search, sessionFilter, statusFilter]);

  useEffect(() => {
    const load = async () => {
      await fetchAssessments();
    };
    load();
  }, [fetchAssessments]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'MANUAL',
      assignmentScope: 'ALL_STUDENTS',
      academicSessionId: '',
      deadline: '',
      totalPoints: 0,
    });
    setSelectedAssessment(null);
    setSelectedFacultyIds([]);
    setFacultySearch('');
  };

  const loadFacultyList = useCallback(async () => {
    if (!canDistribute || facultyList.length > 0 || facultyLoading) return;
    try {
      setFacultyLoading(true);
      // Pull each role in one shot — /users/admin/filter takes a single role.
      const rolePulls = await Promise.all(
        DISTRIBUTE_TARGET_ROLES.map((role) =>
          apiClient
            .get(`/users/admin/filter?role=${role}&limit=500`)
            .then((r) => (r.data?.users || []) as FacultyUser[])
            .catch(() => [] as FacultyUser[])
        )
      );
      const seen = new Set<string>();
      const merged: FacultyUser[] = [];
      for (const users of rolePulls) {
        for (const u of users) {
          if (!seen.has(u.id)) {
            seen.add(u.id);
            merged.push(u);
          }
        }
      }
      merged.sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      );
      setFacultyList(merged);
    } catch (error) {
      console.error('Failed to load faculty list:', error);
    } finally {
      setFacultyLoading(false);
    }
  }, [canDistribute, facultyList.length, facultyLoading]);

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setShowModal(true);
    loadFacultyList();
  };

  const openEditModal = (assessment: Assessment) => {
    setFormData({
      title: assessment.title,
      description: assessment.description || '',
      type: assessment.type,
      assignmentScope: assessment.assignmentScope,
      academicSessionId: assessment.academicSessionId,
      deadline: assessment.deadline ? new Date(assessment.deadline).toISOString().split('T')[0] : '',
      totalPoints: assessment.totalPoints,
    });
    setSelectedAssessment(assessment);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Assessment title is required');
      return;
    }

    if (!formData.academicSessionId) {
      toast.error('Session is required');
      return;
    }

    try {
      if (modalMode === 'create') {
        const payload: Record<string, unknown> = {
          ...formData,
          deadline: formData.deadline ? new Date(formData.deadline) : null,
        };
        if (canDistribute && selectedFacultyIds.length > 0) {
          payload.distributeTo = selectedFacultyIds;
        }
        const resp = await apiClient.post('/assessments', payload);
        if (resp.data?.distributedCount) {
          toast.success(`Assessment distributed to ${resp.data.distributedCount} faculty`);
        } else {
          toast.success('Assessment created successfully');
        }
      } else if (selectedAssessment) {
        await apiClient.put(`/assessments/${selectedAssessment.id}`, {
          ...formData,
          deadline: formData.deadline ? new Date(formData.deadline) : null,
        });
        toast.success('Assessment updated successfully');
      }

      setShowModal(false);
      resetForm();
      fetchAssessments();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message =
        axiosError.response?.data?.message || (modalMode === 'create' ? 'Failed to create assessment' : 'Failed to update assessment');
      toast.error(message);
    }
  };

  const handlePublish = async (assessmentId: string) => {
    try {
      await apiClient.post(`/assessments/${assessmentId}/publish`);
      toast.success('Assessment published successfully');
      fetchAssessments();
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to publish assessment');
    }
  };

  const handleClose = async (assessmentId: string) => {
    try {
      await apiClient.post(`/assessments/${assessmentId}/close`);
      toast.success('Assessment closed successfully');
      fetchAssessments();
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to close assessment');
    }
  };

  const handleUnpublish = async (assessmentId: string) => {
    try {
      await apiClient.post(`/assessments/${assessmentId}/unpublish`);
      toast.success('Assessment unpublished successfully');
      fetchAssessments();
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to unpublish assessment');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.assessmentId) return;

    try {
      await apiClient.delete(`/assessments/${deleteConfirm.assessmentId}`);
      setDeleteConfirm({ show: false });
      toast.success('Assessment deleted successfully');
      await fetchAssessments();
    } catch (error: unknown) {
      console.error('Delete error:', error);
      toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to delete assessment');
    }
  };

  const handleNavigateToDetails = (assessmentId: string) => {
    router.push(`/admin/assessments/${assessmentId}`);
  };

  const getStatusBadgeClass = (status: string) => {
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!currentUser) return null;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900">Assessments</h1>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <FiPlus size={20} />
              Create Assessment
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Search & Filter</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <FiSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search assessments..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Session Filter */}
              <select
                value={sessionFilter}
                onChange={(e) => setSessionFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Sessions</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>

          {/* Assessments List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading assessments...</p>
            </div>
          ) : assessments.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center shadow-sm">
              <FiFilter size={40} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No assessments found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assessments.map((assessment) => {
                const StatusIcon = statusIcons[assessment.status as keyof typeof statusIcons];
                return (
                  <div
                    key={assessment.id}
                    className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-all p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Title and Status */}
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-gray-900">{assessment.title}</h3>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-1 ${getStatusBadgeClass(
                              assessment.status
                            )}`}
                          >
                            <StatusIcon size={14} />
                            {assessment.status}
                          </span>
                          {currentUser && assessment.createdBy !== currentUser.id && assessment.Creator && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-purple-50 text-purple-800 border-purple-200">
                              Designed by {assessment.Creator.firstName} {assessment.Creator.lastName}
                            </span>
                          )}
                          {currentUser && assessment.createdBy === currentUser.id && (assessment.Distributions?.length ?? 0) > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-indigo-50 text-indigo-800 border-indigo-200">
                              Distributed to {assessment.Distributions?.length} faculty
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        {assessment.description && (
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{assessment.description}</p>
                        )}

                        {/* Metadata Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                          {/* Creator */}
                          <div>
                            <p className="text-gray-600 text-xs font-semibold uppercase">Creator</p>
                            <p className="text-gray-900">
                              {assessment.Creator
                                ? `${assessment.Creator.firstName} ${assessment.Creator.lastName}`
                                : 'Unknown'}
                            </p>
                          </div>

                          {/* Session */}
                          <div>
                            <p className="text-gray-600 text-xs font-semibold uppercase">Session</p>
                            <p className="text-gray-900">{assessment.AcademicSession?.name || 'N/A'}</p>
                          </div>

                          {/* Questions Count */}
                          <div>
                            <p className="text-gray-600 text-xs font-semibold uppercase">Questions</p>
                            <p className="text-gray-900">
                              {assessment.AssessmentQuestions?.length || 0} questions
                            </p>
                          </div>

                          {/* Total Points */}
                          <div>
                            <p className="text-gray-600 text-xs font-semibold uppercase">Points</p>
                            <p className="text-gray-900">{assessment.totalPoints} points</p>
                          </div>
                        </div>

                        {/* Deadline */}
                        {assessment.deadline && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <FiClock size={14} />
                            <span>Deadline: {formatDate(assessment.deadline)}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        {/* View/Manage Button */}
                        <button
                          onClick={() => handleNavigateToDetails(assessment.id)}
                          className="flex items-center gap-1 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Manage questions and assignments"
                        >
                          <FiEye size={18} />
                          <span className="text-sm">Manage</span>
                        </button>

                        {/* Status-specific actions */}
                        {assessment.status === 'DRAFT' && (
                          <>
                            <button
                              onClick={() => openEditModal(assessment)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit assessment"
                            >
                              <FiEdit2 size={18} />
                            </button>
                            <button
                              onClick={() => handlePublish(assessment.id)}
                              className="px-3 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors text-sm font-medium"
                              title="Publish assessment"
                            >
                              Publish
                            </button>
                          </>
                        )}

                        {assessment.status === 'PUBLISHED' && (
                          <>
                            <button
                              onClick={() => handleUnpublish(assessment.id)}
                              className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                              title="Unpublish assessment"
                            >
                              Unpublish
                            </button>
                            <button
                              onClick={() => handleClose(assessment.id)}
                              className="px-3 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors text-sm font-medium"
                              title="Close assessment"
                            >
                              Close
                            </button>
                          </>
                        )}

                        {assessment.status === 'CLOSED' && (
                          <div className="px-3 py-2 text-gray-500 text-sm font-medium">
                            Assessment Closed
                          </div>
                        )}

                        {/* Delete button available for all statuses */}
                        <button
                          onClick={() =>
                            setDeleteConfirm({ show: true, assessmentId: assessment.id })
                          }
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete assessment"
                        >
                          <FiTrash2 size={18} />
                        </button>

                        {/* View Results Button */}
                        {assessment.status !== 'DRAFT' && (
                          <button
                            onClick={() => router.push(`/admin/assessments/${assessment.id}/results`)}
                            className="px-3 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors text-sm font-medium"
                            title="View results"
                          >
                            Results
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">
                {modalMode === 'create' ? 'Create Assessment' : 'Edit Assessment'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-600 hover:text-gray-800"
              >
                <FiX size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateOrUpdate} className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Assessment Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Mid-term Exam"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  maxLength={200}
                  disabled={modalMode === 'edit' && selectedAssessment?.status !== 'DRAFT'}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Assessment description..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  rows={3}
                  maxLength={500}
                  disabled={modalMode === 'edit' && selectedAssessment?.status !== 'DRAFT'}
                />
              </div>

              {/* Grid Layout for selects */}
              <div className="grid grid-cols-2 gap-4">
                {/* Session */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Academic Session *
                  </label>
                  <select
                    value={formData.academicSessionId}
                    onChange={(e) => setFormData({ ...formData, academicSessionId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    disabled={modalMode === 'edit' && selectedAssessment?.status !== 'DRAFT'}
                  >
                    <option value="">Select Session</option>
                    {sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Grading Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as 'AUTO_GRADE' | 'MANUAL',
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    disabled={modalMode === 'edit' && selectedAssessment?.status !== 'DRAFT'}
                  >
                    <option value="MANUAL">Manual Grading</option>
                    <option value="AUTO_GRADE">Auto Grade</option>
                  </select>
                </div>
              </div>

              {/* Grid Layout for more selects */}
              <div className="grid grid-cols-2 gap-4">
                {/* Assignment Scope */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Assign To
                  </label>
                  <select
                    value={formData.assignmentScope}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        assignmentScope: e.target.value as 'ALL_STUDENTS' | 'CATEGORY' | 'SPECIFIC_STUDENT',
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    disabled={modalMode === 'edit' && selectedAssessment?.status !== 'DRAFT'}
                  >
                    <option value="ALL_STUDENTS">All Students</option>
                    <option value="CATEGORY">Category</option>
                    <option value="SPECIFIC_STUDENT">Specific Student</option>
                  </select>
                </div>

                {/* Total Points */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Total Points
                  </label>
                  <input
                    type="number"
                    value={formData.totalPoints}
                    onChange={(e) =>
                      setFormData({ ...formData, totalPoints: parseInt(e.target.value) || 0 })
                    }
                    placeholder="100"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    disabled={modalMode === 'edit' && selectedAssessment?.status !== 'DRAFT'}
                  />
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Deadline (Optional)
                </label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  disabled={modalMode === 'edit' && selectedAssessment?.status !== 'DRAFT'}
                />
              </div>

              {/* Distribute to faculty (create only, org-wide roles only) */}
              {modalMode === 'create' && canDistribute && (
                <div className="border-t border-gray-200 pt-4">
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Distribute to faculty (optional)
                  </label>
                  <p className="text-xs text-gray-600 mb-3">
                    Selected faculty will each get their own copy of this assessment to assign
                    students. The assessment will show <strong>designed by you</strong> on their
                    portal. Leave empty to keep it yourself.
                  </p>
                  <div className="relative mb-2">
                    <FiSearch className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search faculty by name or email..."
                      value={facultySearch}
                      onChange={(e) => setFacultySearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                    />
                  </div>
                  {selectedFacultyIds.length > 0 && (
                    <div className="flex items-center justify-between mb-2 text-xs text-gray-700">
                      <span>{selectedFacultyIds.length} selected</span>
                      <button
                        type="button"
                        onClick={() => setSelectedFacultyIds([])}
                        className="text-blue-600 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                  <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {facultyLoading ? (
                      <p className="text-center text-sm text-gray-500 py-4">Loading faculty...</p>
                    ) : facultyList.length === 0 ? (
                      <p className="text-center text-sm text-gray-500 py-4">No faculty found</p>
                    ) : (
                      facultyList
                        .filter((f) => {
                          if (!facultySearch.trim()) return true;
                          const q = facultySearch.toLowerCase();
                          return (
                            `${f.firstName} ${f.lastName}`.toLowerCase().includes(q) ||
                            f.email.toLowerCase().includes(q)
                          );
                        })
                        .map((f) => {
                          const checked = selectedFacultyIds.includes(f.id);
                          return (
                            <label
                              key={f.id}
                              className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  setSelectedFacultyIds((prev) =>
                                    e.target.checked
                                      ? [...prev, f.id]
                                      : prev.filter((id) => id !== f.id)
                                  );
                                }}
                                className="w-4 h-4 accent-blue-600"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 truncate">
                                  {f.firstName} {f.lastName}
                                  <span className="ml-2 text-xs text-gray-500">
                                    {f.approvedRole}
                                  </span>
                                </p>
                                <p className="text-xs text-gray-500 truncate">{f.email}</p>
                              </div>
                            </label>
                          );
                        })
                    )}
                  </div>
                </div>
              )}

              {/* Info Text */}
              {modalMode === 'edit' && selectedAssessment?.status !== 'DRAFT' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-900">
                    Published and closed assessments cannot be edited. Create a new assessment or revert
                    to draft status.
                  </p>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {modalMode === 'create' ? 'Create Assessment' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <FiAlertCircle className="text-red-600" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Delete Assessment?
              </h3>
              <p className="text-gray-600 text-center mb-6">
                This action cannot be undone. The assessment will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm({ show: false })}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
