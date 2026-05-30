'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FiArrowLeft,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiCheck,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';
import { HiOutlineColorSwatch } from 'react-icons/hi';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import DashboardLayout from '@/app/components/DashboardLayout';

interface Session {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  description?: string;
  isActive: boolean;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  studentCount?: number;
}

interface StudentInCategory {
  id: string;
  studentSessionId: string;
  sessionCategoryId: string;
  assignedBy: string;
  createdAt: string;
  updatedAt: string;
  StudentSession?: {
    id: string;
    status: string;
    enrollmentDate: string;
    Student?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      registrationNumber?: string;
    };
  };
}

interface CategoryWithStudents extends Category {
  students?: StudentInCategory[];
  studentCount?: number;
}

const COLOR_PRESETS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const { user } = useAuthStore();

  // State
  const [session, setSession] = useState<Session | null>(null);
  const [categories, setCategories] = useState<CategoryWithStudents[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showStudentAssignModal, setShowStudentAssignModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Form states
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
  });

  const [sessionStudents, setSessionStudents] = useState<{
    id: string;
    Student?: {
      firstName: string;
      lastName: string;
      email: string;
      registrationNumber?: string;
    };
  }[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // Redirect if not admin
  useEffect(() => {
    if (!['ADMIN', 'HOD'].includes(user?.role || '')) {
      router.push('/dashboard');
    }
  }, [user?.role, router]);

  // Fetch session
  const fetchSession = useCallback(async () => {
    try {
      const response = await apiClient.get(`/sessions/${sessionId}`);
      setSession(response.data);
    } catch (error) {
      toast.error('Failed to fetch session');
      console.error(error);
    }
  }, [sessionId]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await apiClient.get(`/sessions/${sessionId}/categories`);
      setCategories(prev => {
        // Preserve students data for expanded categories
        const oldCategoriesMap = new Map(prev.map(cat => [cat.id, cat]));
        return response.data.categories.map((newCat: Category) => {
          const oldCat = oldCategoriesMap.get(newCat.id);
          return {
            ...newCat,
            students: oldCat?.students, // Keep existing students data if it exists
          };
        });
      });
    } catch (error) {
      toast.error('Failed to fetch categories');
      console.error(error);
    }
  }, [sessionId]);

  // Fetch session students
  const fetchSessionStudents = useCallback(async () => {
    try {
      const response = await apiClient.get(`/sessions/${sessionId}/students?limit=10000`);
      setSessionStudents(response.data.students || []);
    } catch (error) {
      console.error('Failed to fetch session students:', error);
    }
  }, [sessionId]);

  // Fetch category students
  const fetchCategoryStudents = useCallback(
    async (categoryId: string) => {
      try {
        const response = await apiClient.get(`/sessions/categories/${categoryId}/students`);
        setCategories(prev =>
          prev.map(cat =>
            cat.id === categoryId
              ? {
                  ...cat,
                  students: response.data.students,
                  studentCount: response.data.total,
                }
              : cat
          )
        );
      } catch (error) {
        console.error('Failed to fetch category students:', error);
      }
    },
    []
  );

  // Initial fetch
  useEffect(() => {
    if (sessionId) {
      const load = async () => {
        setLoading(true);
        await Promise.all([
          fetchSession(),
          fetchCategories(),
          fetchSessionStudents(),
        ]);
        setLoading(false);
      };
      load();
    }
  }, [sessionId, fetchSession, fetchCategories, fetchSessionStudents]);

  // Create category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!categoryForm.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      const payload = selectedCategory
        ? { ...categoryForm }
        : categoryForm;

      if (selectedCategory) {
        await apiClient.put(`/sessions/categories/${selectedCategory.id}`, payload);
        toast.success('Category updated successfully');
      } else {
        await apiClient.post(`/sessions/${sessionId}/categories`, payload);
        toast.success('Category created successfully');
      }

      setCategoryForm({ name: '', description: '', color: '#3B82F6' });
      setSelectedCategory(null);
      setShowCategoryModal(false);
      await fetchCategories();
    } catch (error) {
      toast.error(selectedCategory ? 'Failed to update category' : 'Failed to create category');
      console.error(error);
    }
  };

  // Delete category
  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      await apiClient.delete(`/sessions/categories/${categoryId}`);
      toast.success('Category deleted successfully');
      await fetchCategories();
    } catch (error) {
      toast.error('Failed to delete category');
      console.error(error);
    }
  };

  // Edit category
  const handleEditCategory = (category: Category) => {
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      color: category.color,
    });
    setSelectedCategory(category);
    setShowCategoryModal(true);
  };

  // Bulk assign students to category
  const handleBulkAssignStudents = async () => {
    if (selectedStudents.size === 0) {
      toast.error('Please select at least one student');
      return;
    }

    if (!selectedCategory) {
      toast.error('No category selected');
      return;
    }

    try {
      const studentSessionIds = Array.from(selectedStudents);
      const categoryId = selectedCategory.id; // Save the ID before clearing state
      await apiClient.post(
        `/sessions/categories/${categoryId}/assign-bulk`,
        { studentSessionIds }
      );
      toast.success(`${studentSessionIds.length} students assigned to category`);
      setSelectedStudents(new Set());
      setShowStudentAssignModal(false);
      setSelectedCategory(null);
      await fetchCategories();
      await fetchCategoryStudents(categoryId); // Use saved ID
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to assign students');
      console.error(error);
    }
  };

  // Remove student from category
  const handleRemoveStudentFromCategory = async (
    categoryId: string,
    studentSessionId: string
  ) => {
    try {
      await apiClient.post(`/sessions/categories/${categoryId}/remove`, {
        studentSessionId,
      });
      toast.success('Student removed from category');
      await fetchCategoryStudents(categoryId);
    } catch (error) {
      toast.error('Failed to remove student');
      console.error(error);
    }
  };

  // Toggle category expansion and fetch students
  const toggleCategoryExpansion = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
      // Fetch students when expanding
      fetchCategoryStudents(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Reset modal
  const resetModal = () => {
    setCategoryForm({ name: '', description: '', color: '#3B82F6' });
    setSelectedCategory(null);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!session) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto p-4">
          <div className="text-center text-gray-600">Session not found</div>
        </div>
      </DashboardLayout>
    );
  }

  const getUnassignedStudents = () => {
    const assignedIds = new Set(
      categories.flatMap(cat =>
        cat.students?.map(s => s.id) || []
      )
    );
    const unassigned = sessionStudents.filter(s => !assignedIds.has(s.id) && s.Student);
    
    // Filter by search query
    if (!studentSearchQuery.trim()) {
      return unassigned;
    }
    
    const query = studentSearchQuery.toLowerCase();
    return unassigned.filter(student => {
      if (!student.Student) return false;
      const firstName = student.Student.firstName || '';
      const lastName = student.Student.lastName || '';
      const email = student.Student.email || '';
      const regNum = student.Student.registrationNumber || '';
      
      return (
        firstName.toLowerCase().includes(query) ||
        lastName.toLowerCase().includes(query) ||
        email.toLowerCase().includes(query) ||
        regNum.toLowerCase().includes(query)
      );
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/sessions')}
            className="flex items-center gap-2 text-blue-700 hover:text-blue-900 font-medium mb-4 transition"
          >
            <FiArrowLeft size={20} />
            Back to Sessions
          </button>

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{session.name}</h1>
            <p className="text-gray-800 mb-4">{session.description}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-900">Start Date: </span>
                <span className="text-gray-800">
                  {new Date(session.startDate).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-900">End Date: </span>
                <span className="text-gray-800">
                  {new Date(session.endDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Categories Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Student Categories</h2>
            <button
              onClick={() => {
                resetModal();
                setShowCategoryModal(true);
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <FiPlus size={20} />
              New Category
            </button>
          </div>

          {categories.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-700 text-lg">
                No categories created yet. Create one to start organizing students.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {categories.map(category => (
                <div
                  key={category.id}
                  className="border rounded-lg overflow-hidden hover:shadow-md transition"
                >
                  {/* Category Header */}
                  <div className="bg-gray-50 px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{category.name}</h3>
                        {category.description && (
                          <p className="text-sm text-gray-700">{category.description}</p>
                        )}
                      </div>
                      <span className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-full">
                        {category.studentCount || 0} students
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="p-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit category"
                      >
                        <FiEdit2 size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCategory(category);
                          setShowStudentAssignModal(true);
                          setSelectedStudents(new Set());
                        }}
                        className="p-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Assign students"
                      >
                        <FiPlus size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="p-2 text-red-700 hover:text-red-900 hover:bg-red-50 rounded-lg transition"
                        title="Delete category"
                      >
                        <FiTrash2 size={18} />
                      </button>
                      <button
                        onClick={() => toggleCategoryExpansion(category.id)}
                        className="p-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        {expandedCategories.has(category.id) ? (
                          <FiChevronUp size={18} />
                        ) : (
                          <FiChevronDown size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Category Students */}
                  {expandedCategories.has(category.id) && (
                    <div className="border-t bg-white p-4">
                      {!category.students || category.students.length === 0 ? (
                        <p className="text-gray-700 text-center py-8">
                          No students in this category
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-gray-100">
                                <th className="px-4 py-2 text-left text-gray-900 font-semibold">
                                  Name
                                </th>
                                <th className="px-4 py-2 text-left text-gray-900 font-semibold">
                                  Email
                                </th>
                                <th className="px-4 py-2 text-left text-gray-900 font-semibold">
                                  Registration #
                                </th>
                                <th className="px-4 py-2 text-left text-gray-900 font-semibold">
                                  Assigned
                                </th>
                                <th className="px-4 py-2 text-right text-gray-900 font-semibold">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {category.students && category.students.length > 0 ? (
                                category.students.map(student => {
                                  const studentData = student.StudentSession?.Student;
                                  if (!studentData) return null;
                                  return (
                                    <tr key={student.id} className="border-b hover:bg-gray-50">
                                      <td className="px-4 py-3 text-gray-900">
                                        {studentData.firstName || 'N/A'} {studentData.lastName || 'N/A'}
                                      </td>
                                      <td className="px-4 py-3 text-gray-800">
                                        {studentData.email || 'N/A'}
                                      </td>
                                      <td className="px-4 py-3 text-gray-800">
                                        {studentData.registrationNumber || '-'}
                                      </td>
                                      <td className="px-4 py-3 text-gray-800">
                                        {student.createdAt ? new Date(student.createdAt).toLocaleDateString() : '-'}
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        <button
                                          onClick={() =>
                                            handleRemoveStudentFromCategory(
                                              category.id,
                                              student.studentSessionId
                                            )
                                          }
                                          className="px-3 py-1 text-red-700 hover:text-red-900 hover:bg-red-50 rounded transition text-sm font-medium"
                                        >
                                          Remove
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan={5} className="px-4 py-3 text-center text-gray-700">
                                    No students assigned to this category
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {selectedCategory ? 'Edit Category' : 'Create Category'}
              </h3>
              <button
                onClick={() => {
                  resetModal();
                  setShowCategoryModal(false);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={e =>
                    setCategoryForm({ ...categoryForm, name: e.target.value })
                  }
                  placeholder="e.g., Marking, Finance, SEC A"
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-700"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={categoryForm.description}
                  onChange={e =>
                    setCategoryForm({ ...categoryForm, description: e.target.value })
                  }
                  placeholder="Optional description for this category"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_PRESETS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() =>
                        setCategoryForm({ ...categoryForm, color })
                      }
                      className={`w-8 h-8 rounded-full border-2 transition ${
                        categoryForm.color === color
                          ? 'border-gray-800'
                          : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  {selectedCategory ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetModal();
                    setShowCategoryModal(false);
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Assignment Modal */}
      {showStudentAssignModal && selectedCategory && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                Assign Students to {selectedCategory.name}
              </h3>
              <button
                onClick={() => {
                  setShowStudentAssignModal(false);
                  setSelectedCategory(null);
                  setSelectedStudents(new Set());
                  setStudentSearchQuery('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX size={24} />
              </button>
            </div>

            {/* Search Input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search by name, email, or registration number..."
                value={studentSearchQuery}
                onChange={e => setStudentSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-700"
              />
            </div>

            {/* Student Count Info */}
            <div className="mb-2 text-sm text-gray-600">
              {getUnassignedStudents().length} of {sessionStudents.length} students available
            </div>

            {/* Students List - Scrollable */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
              {getUnassignedStudents().length === 0 ? (
                <p className="text-gray-600 text-center py-8">
                  {studentSearchQuery.trim() 
                    ? 'No students found matching your search'
                    : 'All students are already assigned to a category'}
                </p>
              ) : (
                getUnassignedStudents().map(student => {
                  if (!student.Student) return null;
                  return (
                    <label
                      key={student.id}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-white hover:shadow-sm cursor-pointer bg-white transition"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudents.has(student.id)}
                        onChange={e => {
                          const newSelected = new Set(selectedStudents);
                          if (e.target.checked) {
                            newSelected.add(student.id);
                          } else {
                            newSelected.delete(student.id);
                          }
                          setSelectedStudents(newSelected);
                        }}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">
                          {student.Student.firstName || 'N/A'} {student.Student.lastName || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-600 truncate">{student.Student.email || 'N/A'}</div>
                        {student.Student.registrationNumber && (
                          <div className="text-xs text-gray-600">Reg: {student.Student.registrationNumber}</div>
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleBulkAssignStudents}
                disabled={selectedStudents.size === 0}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign ({selectedStudents.size} selected)
              </button>
              <button
                onClick={() => {
                  setShowStudentAssignModal(false);
                  setSelectedCategory(null);
                  setSelectedStudents(new Set());
                  setStudentSearchQuery('');
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition font-medium"
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
