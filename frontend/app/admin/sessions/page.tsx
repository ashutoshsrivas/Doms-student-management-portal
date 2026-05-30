'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiUsers,
  FiCheck,
  FiCopy,
  FiDownload,
  FiUpload,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import useAuthStore from '@/app/store/authStore';
import usePermissions from '@/app/lib/usePermissions';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import DashboardLayout from '@/app/components/DashboardLayout';

interface Session {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  description?: string;
  _count?: {
    StudentSessions: number;
  };
}

interface StudentToAdd {
  email: string;
  firstName: string;
  lastName: string;
  registrationNumber?: string;
}

export default function SessionsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [studentModalMode, setStudentModalMode] = useState<'manual' | 'excel' | 'link'>('manual');

  // Form states
  const [sessionForm, setSessionForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    description: '',
  });

  const [studentForm, setStudentForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    registrationNumber: '',
  });

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [shareableLink, setShareableLink] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Allow ADMIN OR users explicitly granted sessions.view
  const { loaded: permsLoaded, hasPerm } = usePermissions();
  useEffect(() => {
    if (!user) return;
    if (user.role === 'ADMIN') return;
    if (!permsLoaded) return;
    if (!hasPerm('sessions.view')) router.push('/dashboard');
  }, [user, permsLoaded, hasPerm, router]);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/sessions', {
        params: { page, limit },
      });
      setSessions(response.data.sessions);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      toast.error('Failed to fetch sessions');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    const load = async () => {
      await fetchSessions();
    };
    load();
  }, [fetchSessions]);

  // Create session
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!sessionForm.name || !sessionForm.startDate || !sessionForm.endDate) {
        toast.error('Please fill all required fields');
        return;
      }

      await apiClient.post('/sessions', {
        name: sessionForm.name,
        startDate: sessionForm.startDate,
        endDate: sessionForm.endDate,
        description: sessionForm.description,
      });

      toast.success('Session created successfully');
      setShowCreateModal(false);
      setSessionForm({ name: '', startDate: '', endDate: '', description: '' });
      fetchSessions();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to create session');
    }
  };

  // Activate session
  const handleActivateSession = async (sessionId: string) => {
    try {
      await apiClient.post(`/sessions/${sessionId}/activate`);
      toast.success('Session activated');
      fetchSessions();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to activate session');
    }
  };

  // Add student manually
  const handleAddStudentManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;

    try {
      if (!studentForm.email || !studentForm.firstName || !studentForm.lastName) {
        toast.error('Please fill all required fields');
        return;
      }

      // Create user with default password
      const userRes = await apiClient.post('/users', {
        email: studentForm.email,
        password: '12345678',
        firstName: studentForm.firstName,
        lastName: studentForm.lastName,
        registrationNumber: studentForm.registrationNumber,
        requestedRole: 'STUDENT',
        approvedRole: 'STUDENT',
        status: 'ACTIVE',
      });

      // Add to session
      await apiClient.post(`/sessions/${selectedSession.id}/onboard-student`, {
        studentId: userRes.data.user.id,
      });

      toast.success('Student added successfully');
      setStudentForm({ email: '', firstName: '', lastName: '', registrationNumber: '' });
      setShowStudentModal(false);
      fetchSessions();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to add student');
    }
  };

  // Handle Excel upload
  const handleExcelUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Upload form submitted');
    console.log('Selected session:', selectedSession);
    console.log('Excel file:', excelFile);
    
    if (!selectedSession || !excelFile) {
      console.log('Validation failed - missing session or file');
      toast.error('Please select a file and session');
      return;
    }

    setUploading(true);
    try {
      console.log('Creating FormData and appending file');
      const formData = new FormData();
      formData.append('file', excelFile);

      console.log('Sending request to:', `/sessions/${selectedSession.id}/upload-students`);
      const response = await apiClient.post(`/sessions/${selectedSession.id}/upload-students`, formData);
      
      console.log('Upload response:', response.data);
      
      // Show detailed results
      const { results } = response.data;
      const message = `Students processed: Created ${results.created}, Onboarded ${results.onboarded}${results.failed.length > 0 ? `, Failed ${results.failed.length}` : ''}`;
      
      if (results.failed.length > 0) {
        console.warn('Failed rows:', results.failed);
        toast.error(message);
      } else {
        toast.success(message);
      }
      
      setExcelFile(null);
      setShowStudentModal(false);
      setUploading(false);
      fetchSessions();
    } catch (error: unknown) {
      setUploading(false);
      console.error('Upload error:', error);
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      console.error('Error response:', err.response?.data);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to upload students';
      toast.error(errorMsg);
    }
  };

  // Download Excel template
  const handleDownloadTemplate = async () => {
    try {
      const XLSX = await import('xlsx');
      
      // Create a new workbook
      const workbook = XLSX.utils.book_new();
      
      // Create sample data with headers
      const sampleData = [
        {
          'First Name': 'John',
          'Last Name': 'Doe',
          'Email': 'john.doe@example.com',
          'Registration Number': 'REG001'
        },
        {
          'First Name': 'Jane',
          'Last Name': 'Smith',
          'Email': 'jane.smith@example.com',
          'Registration Number': 'REG002'
        }
      ];
      
      // Add data to worksheet
      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      
      // Set column widths
      worksheet['!cols'] = [
        { wch: 15 }, // First Name
        { wch: 15 }, // Last Name
        { wch: 25 }, // Email
        { wch: 20 }  // Registration Number
      ];
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
      
      // Write the file
      XLSX.writeFile(workbook, 'student_template.xlsx');
      
      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error('Failed to download template');
    }
  };

  // Create shareable link
  const handleCreateLink = async () => {
    if (!selectedSession) return;

    try {
      const response = await apiClient.post(`/sessions/${selectedSession.id}/create-registration-link`);
      const baseUrl = window.location.origin;
      const fullLink = `${baseUrl}/session-registration/${response.data.token}`;
      setShareableLink(fullLink);
      toast.success('Registration link created');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to create link');
    }
  };

  // Copy to clipboard
  const handleCopyLink = async () => {
    if (!shareableLink) return;
    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopying(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopying(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  // View students
  const handleViewStudents = (session: Session) => {
    router.push(`/admin/sessions/${session.id}/students`);
  };

  if (loading && page === 1) {
    return (
      <DashboardLayout title="Academic Sessions">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading sessions...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Academic Sessions">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Academic Sessions</h1>
            <p className="text-gray-600 mt-1">Manage academic sessions and enroll students</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            <FiPlus className="w-5 h-5" />
            New Session
          </button>
        </div>

        {/* Sessions Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Start Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">End Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Students</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{session.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(session.startDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(session.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {session._count?.StudentSessions || 0}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {session.isActive ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-900 rounded-full text-xs font-bold border border-green-300">
                        <FiCheck className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-gray-200 text-gray-900 rounded-full text-xs font-bold border border-gray-300">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/admin/sessions/${session.id}`)}
                        className="p-2 hover:bg-purple-100 text-purple-600 rounded transition"
                        title="Manage Categories"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleViewStudents(session)}
                        className="p-2 hover:bg-blue-100 text-blue-600 rounded transition"
                        title="View Students"
                      >
                        <FiUsers className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedSession(session);
                          setStudentModalMode('manual');
                          setShowStudentModal(true);
                        }}
                        className="p-2 hover:bg-green-100 text-green-600 rounded transition"
                        title="Add Students"
                      >
                        <FiPlus className="w-4 h-4" />
                      </button>
                      {!session.isActive && (
                        <button
                          onClick={() => handleActivateSession(session.id)}
                          className="p-2 hover:bg-yellow-100 text-yellow-600 rounded transition"
                          title="Activate Session"
                        >
                          <FiCheck className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 hover:bg-gray-200 disabled:opacity-50 rounded transition"
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-2 hover:bg-gray-200 disabled:opacity-50 rounded transition"
            >
              <FiChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New Session</h2>
            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Session Name *</label>
                <input
                  type="text"
                  value={sessionForm.name}
                  onChange={(e) => setSessionForm({ ...sessionForm, name: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="e.g., Academic Year 2024-25"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Start Date *</label>
                <input
                  type="date"
                  value={sessionForm.startDate}
                  onChange={(e) => setSessionForm({ ...sessionForm, startDate: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">End Date *</label>
                <input
                  type="date"
                  value={sessionForm.endDate}
                  onChange={(e) => setSessionForm({ ...sessionForm, endDate: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Description</label>
                <textarea
                  value={sessionForm.description}
                  onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  rows={3}
                  placeholder="Session description..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
                >
                  Create Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Students Modal */}
      {showStudentModal && selectedSession && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Add Students to {selectedSession.name}</h2>

            {/* Mode Selector */}
            <div className="flex gap-2 mb-6 border-b">
              <button
                onClick={() => setStudentModalMode('manual')}
                className={`px-4 py-2 font-medium border-b-2 transition ${
                  studentModalMode === 'manual'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Manual Add
              </button>
              <button
                onClick={() => setStudentModalMode('excel')}
                className={`px-4 py-2 font-medium border-b-2 transition ${
                  studentModalMode === 'excel'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Upload Excel
              </button>
              <button
                onClick={() => setStudentModalMode('link')}
                className={`px-4 py-2 font-medium border-b-2 transition ${
                  studentModalMode === 'link'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Shareable Link
              </button>
            </div>

            {/* Manual Add */}
            {studentModalMode === 'manual' && (
              <form onSubmit={handleAddStudentManual} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">First Name *</label>
                    <input
                      type="text"
                      value={studentForm.firstName}
                      onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">Last Name *</label>
                    <input
                      type="text"
                      value={studentForm.lastName}
                      onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="Last name"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Email *</label>
                  <input
                    type="email"
                    value={studentForm.email}
                    onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="student@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Registration Number</label>
                  <input
                    type="text"
                    value={studentForm.registrationNumber}
                    onChange={(e) => setStudentForm({ ...studentForm, registrationNumber: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="Optional"
                  />
                </div>
                <p className="text-sm text-gray-900 bg-blue-50 p-3 rounded border border-blue-200">
                  ℹ️ Default password will be set to <strong>12345678</strong>
                </p>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowStudentModal(false)}
                    className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                  >
                    Add Student
                  </button>
                </div>
              </form>
            )}

            {/* Excel Upload */}
            {studentModalMode === 'excel' && (
              <form onSubmit={handleExcelUpload} className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <FiUpload className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <label className="block cursor-pointer">
                    <span className="font-bold text-gray-900">Click to upload</span>
                    <span className="text-gray-700"> or drag and drop</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                  {excelFile && (
                    <p className="text-sm text-green-700 mt-2 font-medium">✓ {excelFile.name}</p>
                  )}
                  <p className="text-xs text-gray-700 mt-2 font-medium">XLS or XLSX file required</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-bold text-gray-900">Excel Template Format:</h4>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition"
                    >
                      <FiDownload className="w-4 h-4" />
                      Download Template
                    </button>
                  </div>
                  <ul className="text-sm text-gray-900 space-y-1">
                    <li>• Column A: First Name</li>
                    <li>• Column B: Last Name</li>
                    <li>• Column C: Email</li>
                    <li>• Column D: Registration Number (optional)</li>
                  </ul>
                  <p className="text-sm text-gray-900 mt-3">
                    All students will be created with password <strong>12345678</strong>
                  </p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowStudentModal(false)}
                    className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!excelFile || uploading}
                    className="flex-1 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <FiUpload className="w-4 h-4" />
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </form>
            )}

            {/* Shareable Link */}
            {studentModalMode === 'link' && (
              <div className="space-y-4">
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <h4 className="font-bold text-gray-900 mb-2">How it works:</h4>
                  <ol className="text-sm text-gray-900 space-y-2 list-decimal list-inside">
                    <li>Create a unique registration link</li>
                    <li>Share the link with students</li>
                    <li>Students fill in their details</li>
                    <li>After admin approval, they&apos;re onboarded to the session</li>
                  </ol>
                </div>

                {shareableLink ? (
                  <div className="space-y-3">
                    <div className="bg-gray-100 p-4 rounded-lg flex items-center gap-2">
                      <input
                        type="text"
                        value={shareableLink}
                        readOnly
                        className="flex-1 bg-transparent text-sm text-gray-900 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className={`p-2 rounded transition ${
                          copying
                            ? 'bg-green-100 text-green-600'
                            : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                        }`}
                      >
                        <FiCopy className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-900 font-medium">
                      Share this link with students to allow them to self-register for this session
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleCreateLink}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Create Registration Link
                  </button>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowStudentModal(false);
                      setShareableLink(null);
                    }}
                    className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-50 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
