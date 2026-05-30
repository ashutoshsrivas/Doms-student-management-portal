'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiFilter, FiKey } from 'react-icons/fi';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import DashboardLayout from '@/app/components/DashboardLayout';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  approvedRole: string;
  status: string;
  department?: string;
  phoneNumber?: string;
  employeeId?: string;
  registrationNumber?: string;
  profileImage?: string;
  createdAt: string;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  pendingUsers: number;
  roleStats: Record<string, number>;
}

const roles = ['ADMIN', 'HOD', 'FACULTY', 'COORDINATOR', 'PLACEMENT_COORDINATOR', 'TRAINER', 'STUDENT', 'MENTOR'];
const statuses = ['ACTIVE', 'INACTIVE', 'PENDING', 'APPROVED', 'REJECTED'];

export default function UsersPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10000);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    department: '',
    employeeId: '',
    registrationNumber: '',
    approvedRole: 'STUDENT',
    status: 'ACTIVE',
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; userId?: string }>({ show: false });
  const [resetPassConfirm, setResetPassConfirm] = useState<{ show: boolean; userId?: string; userName?: string }>({ show: false });

  // Redirect if not admin
  useEffect(() => {
    if (currentUser && !['ADMIN', 'HOD'].includes(currentUser.role)) {
      router.push('/dashboard');
    }
  }, [currentUser, router]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
      });

      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (departmentFilter) params.append('department', departmentFilter);

      const response = await apiClient.get(`/users/admin/filter?${params}`);
      setUsers(response.data.users);
      setTotalPages(response.data.totalPages);
    } catch (error: unknown) {
      toast.error('Failed to fetch users');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, roleFilter, statusFilter, departmentFilter, sortBy, sortOrder]);

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    try {
      const response = await apiClient.get('/users/admin/statistics');
      setStats(response.data);
    } catch (error: unknown) {
      console.error('Failed to fetch statistics:', error);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      await fetchUsers();
    };
    load();
  }, [fetchUsers]);

  useEffect(() => {
    const load = async () => {
      await fetchStats();
    };
    load();
  }, [fetchStats]);

  // Reset pagination on filter change
  useEffect(() => {
    const reset = async () => {
      setPage(1);
    };
    reset();
  }, [search, roleFilter, statusFilter, departmentFilter]);

  // Reset limit when statusFilter changes to show all or just active
  useEffect(() => {
    const reset = async () => {
      setLimit(10000);
      setPage(1);
    };
    reset();
  }, []);

  const handleCreateUser = () => {
    setModalMode('create');
    setSelectedUser(null);
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      department: '',
      employeeId: '',
      registrationNumber: '',
      approvedRole: 'STUDENT',
      status: 'ACTIVE',
    });
    setShowModal(true);
  };

  const handleEditUser = (user: User) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName || '',
      phoneNumber: user.phoneNumber || '',
      department: user.department || '',
      employeeId: user.employeeId || '',
      registrationNumber: user.registrationNumber || '',
      approvedRole: user.approvedRole,
      status: user.status,
    });
    setShowModal(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (modalMode === 'create') {
        if (!formData.email || !formData.password || !formData.firstName) {
          toast.error('Please fill all required fields');
          return;
        }

        console.log('Creating user with data:', formData);
        await apiClient.post('/users', formData);
        toast.success('User created successfully');
      } else if (selectedUser) {
        const updateData = {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.phoneNumber,
          department: formData.department,
          employeeId: formData.employeeId,
          registrationNumber: formData.registrationNumber,
          approvedRole: formData.approvedRole,
          status: formData.status,
        };

        console.log('Updating user with data:', updateData);
        await apiClient.put(`/users/${selectedUser.id}`, updateData);
        toast.success('User updated successfully');
      }

      setShowModal(false);
      fetchUsers();
    } catch (error: unknown) {
      console.error('Form submission error:', error);
      const err = error as { response?: { data?: { error?: string; message?: string; details?: unknown } } };
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Operation failed';
      console.error('Error details:', err.response?.data?.details);
      toast.error(errorMsg);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await apiClient.delete(`/users/${userId}`);
      toast.success('User deleted successfully');
      setDeleteConfirm({ show: false });
      fetchUsers();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      const response = await apiClient.post(`/users/${userId}/reset-password`);
      toast.success(`Password reset to: ${response.data.newPassword}`);
      setResetPassConfirm({ show: false });
      fetchUsers();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to reset password');
    }
  };

  const getInitials = (firstName: string, lastName: string | null) => {
    const firstChar = firstName?.charAt(0) || '';
    const lastChar = lastName?.charAt(0) || '';
    return (firstChar + lastChar).toUpperCase() || 'U';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <button
            onClick={handleCreateUser}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            <FiPlus size={20} />
            Create User
          </button>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-gray-700 text-sm">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-gray-700 text-sm">Active Users</p>
              <p className="text-2xl font-bold text-green-600">{stats.activeUsers}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-gray-700 text-sm">Inactive Users</p>
              <p className="text-2xl font-bold text-red-600">{stats.inactiveUsers}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-gray-700 text-sm">Pending Users</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pendingUsers}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
          <div className="flex items-center gap-2">
            <FiFilter size={20} className="text-gray-700" />
            <h3 className="font-semibold text-gray-900">Filters & Search</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-3 text-gray-700" size={18} />
              <input
                type="text"
                placeholder="Search by name, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white text-gray-900"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white text-gray-900"
            >
              <option value="">All Roles</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white text-gray-900"
            >
              <option value="">All Status</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white text-gray-900"
            >
              <option value="createdAt">Date Created</option>
              <option value="firstName">First Name</option>
              <option value="email">Email</option>
              <option value="approvedRole">Role</option>
            </select>

            {/* Sort Order */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'ASC' | 'DESC')}
              className="px-4 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white text-gray-900"
            >
              <option value="DESC">Newest First</option>
              <option value="ASC">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">User</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Role</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Department</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Joined</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-600">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
                            {user.profileImage ? (
                              <img
                                src={user.profileImage}
                                alt="Profile"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              getInitials(user.firstName, user.lastName)
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {user.firstName} {user.lastName || ''}
                            </p>
                            {user.employeeId && (
                              <p className="text-xs text-gray-600">{user.employeeId}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{user.email}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          {user.approvedRole}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : user.status === 'INACTIVE'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{user.department || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition"
                            title="Edit"
                          >
                            <FiEdit2 size={18} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ show: true, userId: user.id })}
                            className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition"
                            title="Delete"
                            disabled={user.id === currentUser?.id}
                          >
                            <FiTrash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* User Count Info */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <div className="text-sm text-gray-700 font-medium">
              Total Users: <span className="text-gray-900 font-bold">{users.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-screen overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {modalMode === 'create' ? 'Create User' : 'Edit User'}
            </h2>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white text-gray-900"
                  required
                />
              </div>

              {modalMode === 'create' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white text-gray-900"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                <input
                  type="text"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
                <input
                  type="text"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={formData.approvedRole}
                    onChange={(e) => setFormData({ ...formData, approvedRole: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white text-gray-900"
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white text-gray-900"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border-2 border-gray-500 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                {modalMode === 'edit' && selectedUser && (
                  <button
                    type="button"
                    onClick={() => {
                      setResetPassConfirm({
                        show: true,
                        userId: selectedUser.id,
                        userName: `${selectedUser.firstName} ${selectedUser.lastName || ''}`,
                      });
                    }}
                    className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition font-medium flex items-center justify-center gap-2"
                  >
                    <FiKey /> Reset Password
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  {modalMode === 'create' ? 'Create' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Delete User?</h2>
            <p className="text-gray-700 mb-6">
              This action cannot be undone. The user will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm({ show: false })}
                className="flex-1 px-4 py-2 border-2 border-gray-500 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  deleteConfirm.userId && handleDeleteUser(deleteConfirm.userId)
                }
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Confirmation Modal */}
      {resetPassConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Reset User Password?</h2>
            <p className="text-gray-700 mb-2">
              Reset password for <span className="font-bold">{resetPassConfirm.userName}</span>?
            </p>
            <p className="text-sm text-orange-600 font-medium mb-6">
              ⚠️ The password will be set to: <span className="font-bold">12345678</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setResetPassConfirm({ show: false })}
                className="flex-1 px-4 py-2 border-2 border-gray-500 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  resetPassConfirm.userId && handleResetPassword(resetPassConfirm.userId)
                }
                className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition font-medium"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
