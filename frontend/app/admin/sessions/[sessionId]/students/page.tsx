'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FiArrowLeft, FiTrash2, FiEdit2, FiX, FiEye } from 'react-icons/fi';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import DashboardLayout from '@/app/components/DashboardLayout';

interface Student {
  id: string;
  studentSessionId: string;
  Student: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  status: string;
  enrollmentDate: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
  description?: string;
}

interface Session {
  id: string;
  name: string;
}

export default function SessionStudentsPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<Session | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentCategories, setStudentCategories] = useState<Map<string, Category[]>>(new Map());
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const limit = 10000;

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'enrolled'>('name');

  // Modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  // Bulk assignment state
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkAssignCategory, setBulkAssignCategory] = useState<string>('');

  // Redirect if not admin or placement coordinator
  useEffect(() => {
    if (user && !['ADMIN', 'PLACEMENT_COORDINATOR'].includes(user.role)) {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Fetch session details
  const fetchSession = useCallback(async () => {
    try {
      const response = await apiClient.get(`/sessions/${sessionId}`);
      setSession(response.data);
    } catch (error) {
      toast.error('Failed to fetch session');
      console.error(error);
    }
  }, [sessionId]);

  // Fetch all categories
  const fetchAllCategories = useCallback(async () => {
    try {
      const response = await apiClient.get(`/sessions/${sessionId}/categories`);
      setAllCategories(response.data.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, [sessionId]);

  // Fetch students
  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/sessions/${sessionId}/students?limit=${limit}`);
      setStudents(response.data.students);

      // Fetch categories for each student
      const categoriesMap = new Map<string, Category[]>();
      for (const student of response.data.students) {
        try {
          const catResponse = await apiClient.get(
            `/sessions/student-sessions/${student.studentSessionId}/categories`
          );
          categoriesMap.set(student.id, catResponse.data.categories || []);
        } catch (error) {
          categoriesMap.set(student.id, []);
        }
      }
      setStudentCategories(categoriesMap);
    } catch (error) {
      toast.error('Failed to fetch students');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [sessionId, limit]);

  useEffect(() => {
    const load = async () => {
      await fetchSession();
      await fetchAllCategories();
    };
    load();
  }, [fetchSession, fetchAllCategories]);

  useEffect(() => {
    const load = async () => {
      await fetchStudents();
    };
    load();
  }, [fetchStudents]);

  // Drop student
  const handleDropStudent = async (studentSessionId: string) => {
    if (!confirm('Are you sure you want to drop this student?')) return;

    try {
      await apiClient.delete(`/sessions/${studentSessionId}/drop-student`);
      toast.success('Student dropped successfully');
      fetchStudents();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to drop student');
    }
  };

  // Open category management modal
  const handleEditCategories = (student: Student) => {
    setSelectedStudent(student);
    const currentCategories = studentCategories.get(student.id) || [];
    setSelectedCategories(new Set(currentCategories.map(c => c.id)));
    setShowCategoryModal(true);
  };

  // Save category changes
  const handleSaveCategoryChanges = async () => {
    if (!selectedStudent) return;

    try {
      const currentCategoryIds = new Set(
        (studentCategories.get(selectedStudent.id) || []).map(c => c.id)
      );

      // Find categories to add
      const toAdd = Array.from(selectedCategories).filter(
        id => !currentCategoryIds.has(id)
      );

      // Find categories to remove
      const toRemove = Array.from(currentCategoryIds).filter(
        id => !selectedCategories.has(id)
      );

      // Add to new categories
      for (const categoryId of toAdd) {
        await apiClient.post(`/sessions/categories/${categoryId}/assign-bulk`, {
          studentSessionIds: [selectedStudent.studentSessionId],
        });
      }

      // Remove from categories
      for (const categoryId of toRemove) {
        await apiClient.post(`/sessions/categories/${categoryId}/remove`, {
          studentSessionId: selectedStudent.studentSessionId,
        });
      }

      toast.success('Category assignments updated');
      setShowCategoryModal(false);
      setSelectedStudent(null);
      setSelectedCategories(new Set());
      await fetchStudents();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to update categories');
      console.error(error);
    }
  };

  // Remove student from specific category
  const handleRemoveFromCategory = async (categoryId: string, studentSessionId: string) => {
    if (!confirm('Remove student from this category?')) return;

    try {
      await apiClient.post(`/sessions/categories/${categoryId}/remove`, {
        studentSessionId,
      });
      toast.success('Student removed from category');
      await fetchStudents();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to remove from category');
    }
  };

  // Handle bulk assign
  const handleBulkAssign = async () => {
    if (selectedStudents.size === 0) {
      toast.error('Please select at least one student');
      return;
    }

    if (!bulkAssignCategory) {
      toast.error('Please select a category');
      return;
    }

    try {
      const studentSessionIds = Array.from(selectedStudents);
      await apiClient.post(`/sessions/categories/${bulkAssignCategory}/assign-bulk`, {
        studentSessionIds,
      });
      toast.success(`${studentSessionIds.length} students added to category`);
      setSelectedStudents(new Set());
      setBulkAssignCategory('');
      setShowBulkAssignModal(false);
      await fetchStudents();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to assign students');
      console.error(error);
    }
  };

  // Filter and sort students
  const getFilteredAndSortedStudents = () => {
    const filtered = students.filter((student) => {
      // Exclude dropped students
      if (student.status === 'DROPPED') {
        return false;
      }

      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const firstName = student.Student?.firstName || '';
      const lastName = student.Student?.lastName || '';
      const email = student.Student?.email || '';
      const matchesSearch = 
        firstName.toLowerCase().includes(searchLower) ||
        lastName.toLowerCase().includes(searchLower) ||
        email.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // Category filter
      if (selectedCategoryFilter) {
        const studentCats = studentCategories.get(student.id) || [];
        const hasCat = studentCats.some(cat => cat.id === selectedCategoryFilter);
        if (!hasCat) return false;
      }

      // Status filter
      if (selectedStatusFilter && student.status !== selectedStatusFilter) {
        return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = `${a.Student?.firstName || ''} ${a.Student?.lastName || ''}`.toLowerCase();
        const nameB = `${b.Student?.firstName || ''} ${b.Student?.lastName || ''}`.toLowerCase();
        return nameA.localeCompare(nameB);
      } else if (sortBy === 'enrolled') {
        return new Date(b.enrollmentDate).getTime() - new Date(a.enrollmentDate).getTime();
      }
      return 0;
    });

    return filtered;
  };

  const filteredStudents = getFilteredAndSortedStudents();

  if (loading) {
    return (
      <DashboardLayout title="Session Students">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading students...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`${session?.name} - Students`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-200 rounded transition"
          >
            <FiArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{session?.name}</h1>
            <p className="text-gray-600 mt-1">Active Students: {filteredStudents.length} of {students.filter(s => s.status !== 'DROPPED').length}</p>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search by name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-700"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              >
                <option value="">All Categories</option>
                {allCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              >
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'enrolled')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              >
                <option value="name">Name (A-Z)</option>
                <option value="enrolled">Enrollment Date (Latest)</option>
              </select>
            </div>

            {/* Clear Filters */}
            {(searchQuery || selectedCategoryFilter || selectedStatusFilter) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategoryFilter('');
                  setSelectedStatusFilter('');
                }}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedStudents.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <div className="text-sm text-blue-900">
              <span className="font-semibold">{selectedStudents.size}</span> student{selectedStudents.size !== 1 ? 's' : ''} selected
            </div>
            <div className="flex items-center gap-3">
              <select
                value={bulkAssignCategory}
                onChange={(e) => setBulkAssignCategory(e.target.value)}
                className="px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white text-sm"
              >
                <option value="">Select category to add...</option>
                {allCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <button
                onClick={handleBulkAssign}
                disabled={!bulkAssignCategory}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Add to Category
              </button>
              <button
                onClick={() => {
                  setSelectedStudents(new Set());
                  setBulkAssignCategory('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-lg hover:bg-gray-300 transition"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Students Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedStudents.size > 0 && selectedStudents.size === filteredStudents.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStudents(new Set(filteredStudents.map(s => s.studentSessionId)));
                      } else {
                        setSelectedStudents(new Set());
                      }
                    }}
                    className="w-5 h-5 text-blue-600 rounded cursor-pointer accent-blue-600"
                    title="Select all visible students"
                  />
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Student</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Categories</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Enrolled On</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-600">
                    No students enrolled yet
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-600">
                    No students match your filters
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const categories = studentCategories.get(student.id) || [];
                  return (
                    <tr key={student.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedStudents.has(student.studentSessionId)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedStudents);
                            if (e.target.checked) {
                              newSelected.add(student.studentSessionId);
                            } else {
                              newSelected.delete(student.studentSessionId);
                            }
                            setSelectedStudents(newSelected);
                          }}
                          className="w-5 h-5 text-blue-600 rounded cursor-pointer accent-blue-600"
                        />
                      </td>
                      <td className="px-6 py-4">
                        {student.Student ? (
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                              {student.Student.profileImage ? (
                                <img
                                  src={student.Student.profileImage}
                                  alt="Profile"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                `${student.Student.firstName?.charAt(0)}${student.Student.lastName?.charAt(0)}`.toUpperCase()
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {student.Student.firstName} {student.Student.lastName}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-300 flex items-center justify-center text-gray-600 font-bold flex-shrink-0">
                              ?
                            </div>
                            <div>
                              <p className="font-medium text-gray-600 italic">Deleted User</p>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{student.Student?.email || '-'}</td>
                      <td className="px-6 py-4">
                        {categories.length === 0 ? (
                          <span className="text-gray-600 text-sm italic">No categories</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {categories.map((cat) => (
                              <div
                                key={cat.id}
                                className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-semibold shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 cursor-default"
                                style={{ backgroundColor: cat.color }}
                              >
                                <span className="truncate">{cat.name}</span>
                                <button
                                  onClick={() => handleRemoveFromCategory(cat.id, student.studentSessionId)}
                                  className="flex items-center justify-center w-4 h-4 rounded-full opacity-70 hover:opacity-100 hover:bg-white/30 transition-all duration-150 flex-shrink-0"
                                  title="Remove from category"
                                >
                                  <FiX size={14} strokeWidth={3} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex px-3 py-1 bg-green-100 text-green-900 rounded-full text-xs font-bold border border-green-300">
                          {student.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(student.enrollmentDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm space-x-2">
                        <button
                          onClick={() =>
                            router.push(
                              `/admin/sessions/${sessionId}/students/${student.studentSessionId}/profile`
                            )
                          }
                          className="p-2 hover:bg-purple-100 text-purple-600 rounded transition inline-block"
                          title="View Profile"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditCategories(student)}
                          className="p-2 hover:bg-blue-100 text-blue-600 rounded transition inline-block"
                          title="Edit categories"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDropStudent(student.id)}
                          className="p-2 hover:bg-red-100 text-red-600 rounded transition inline-block"
                          title="Drop Student"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Management Modal */}
      {showCategoryModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">
                Manage Categories
              </h3>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setSelectedStudent(null);
                  setSelectedCategories(new Set());
                }}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1 transition-colors duration-150"
              >
                <FiX size={24} />
              </button>
            </div>

            {selectedStudent.Student && (
              <div className="mb-4 pb-4 border-b border-gray-200">
                <p className="text-sm text-gray-600">For: <span className="font-semibold text-gray-900">{selectedStudent.Student.firstName} {selectedStudent.Student.lastName}</span></p>
              </div>
            )}

            {/* Category List */}
            <div className="space-y-2 max-h-96 overflow-y-auto mb-6">
              {allCategories.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-4">No categories available</p>
              ) : (
                allCategories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors duration-150">
                    <input
                      type="checkbox"
                      checked={selectedCategories.has(cat.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedCategories);
                        if (e.target.checked) {
                          newSelected.add(cat.id);
                        } else {
                          newSelected.delete(cat.id);
                        }
                        setSelectedCategories(newSelected);
                      }}
                      className="w-5 h-5 text-blue-600 rounded cursor-pointer accent-blue-600"
                    />
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: cat.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{cat.name}</p>
                      {cat.description && (
                        <p className="text-xs text-gray-600 truncate">{cat.description}</p>
                      )}
                    </div>
                    {selectedCategories.has(cat.id) && (
                      <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: cat.color }}>
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </label>
                ))
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleSaveCategoryChanges}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors duration-150 font-semibold shadow-sm hover:shadow-md"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setSelectedStudent(null);
                  setSelectedCategories(new Set());
                }}
                className="flex-1 bg-gray-100 text-gray-800 py-2.5 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors duration-150 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
