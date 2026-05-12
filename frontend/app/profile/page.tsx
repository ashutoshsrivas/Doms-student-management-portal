'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import { FiCamera, FiSave, FiArrowLeft, FiLogOut, FiLock } from 'react-icons/fi';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  phoneNumber?: string;
  department?: string;
  profileImage?: string;
  approvedRole?: string;
  requestedRole?: string;
  registrationNumber?: string;
  employeeId?: string;
  status?: string;
}

interface UpdateFormData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  department: string;
}

interface PasswordResetForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function ProfilePageContent() {
  const router = useRouter();
  const { user, logout, setUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState<UpdateFormData>({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    department: '',
  });
  const [profileImagePreview, setProfileImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [passwordForm, setPasswordForm] = useState<PasswordResetForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<{ [key: string]: string }>({});
  const [resetingPassword, setResetingPassword] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get('/auth/profile');
      setProfile(response.data);
      setFormData({
        firstName: response.data.firstName || '',
        lastName: response.data.lastName || '',
        phoneNumber: response.data.phoneNumber || '',
        department: response.data.department || '',
      });
      if (response.data.profileImage) {
        setProfileImagePreview(response.data.profileImage);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => { await fetchProfile(); };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      // Create preview URL for display (won't be sent to server)
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setProfileImagePreview(result);
      };
      reader.readAsDataURL(file);
      
      // File is kept in the input element and will be sent via FormData
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    // lastName is optional now
    if (formData.phoneNumber && !/^\d{10}$/.test(formData.phoneNumber.replace(/\D/g, ''))) {
      newErrors.phoneNumber = 'Phone number must be 10 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setUpdating(true);
    try {
      // Create FormData for multipart upload
      const formDataToSend = new FormData();
      formDataToSend.append('firstName', formData.firstName);
      formDataToSend.append('lastName', formData.lastName);
      formDataToSend.append('phoneNumber', formData.phoneNumber);
      formDataToSend.append('department', formData.department);

      // If a new image was selected, add it to FormData
      if (fileInputRef.current?.files?.[0]) {
        formDataToSend.append('profileImage', fileInputRef.current.files[0]);
      }

      // Send with FormData content type
      const response = await apiClient.put('/auth/profile', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setProfile(response.data.user);
      
      // Update auth store with new profile data including image
      if (user) {
        setUser({
          ...user,
          firstName: response.data.user.firstName,
          lastName: response.data.user.lastName,
          phoneNumber: response.data.user.phoneNumber,
          profileImage: response.data.user.profileImage,
          department: response.data.user.department,
        });
      }
      
      // Reset file input after successful upload
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast.success('Profile updated successfully');
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    router.push('/auth/login');
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (passwordErrors[name]) {
      setPasswordErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validatePasswordForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!passwordForm.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    if (!passwordForm.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordForm.newPassword.length < 8) {
      newErrors.newPassword = 'New password must be at least 8 characters';
    }
    if (!passwordForm.confirmPassword) {
      newErrors.confirmPassword = 'Confirm password is required';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePasswordForm()) {
      return;
    }

    setResetingPassword(true);
    try {
      await apiClient.post('/auth/reset-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      toast.success('Password reset successfully');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswordReset(false);
    } catch (error: unknown) {
      console.error('Error resetting password:', error);
      const axiosError = error as { response?: { data?: { message?: string; field?: string } } };
      const errorMessage = axiosError.response?.data?.message || 'Failed to reset password';
      toast.error(errorMessage);
      if (axiosError.response?.data?.field) {
        setPasswordErrors({
          [axiosError.response.data.field]: errorMessage,
        });
      }
    } finally {
      setResetingPassword(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="My Profile">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-700">Loading profile...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout title="My Profile">
        <div className="text-center py-12">
          <p className="text-gray-700 text-lg">Failed to load profile</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Go Back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const initials = `${profile.firstName.charAt(0)}${profile.lastName?.charAt(0) || ''}`.toUpperCase();

  return (
    <DashboardLayout title="My Profile">
      <div className="max-w-4xl">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-6">
              {/* Profile Image */}
              <div className="relative">
                <div className="w-32 h-32 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-4xl font-bold overflow-hidden">
                  {profileImagePreview ? (
                    <img
                      src={profileImagePreview}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition"
                  title="Upload profile picture"
                >
                  <FiCamera className="w-5 h-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {/* Basic Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {profile.firstName} {profile.lastName || ''}
                </h1>
                <p className="text-gray-700 mb-2">{profile.email}</p>
                <div className="flex gap-4 flex-wrap">
                  <div>
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Role</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {profile.approvedRole || profile.requestedRole || 'Not Assigned'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Status</p>
                    <p className="text-sm font-semibold text-gray-800">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${
                          profile.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {profile.status}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition font-medium"
              >
                <FiArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition font-medium"
              >
                <FiLogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Registration Number</p>
            <p className="text-sm font-semibold text-gray-800">
              {profile.registrationNumber || 'Not Set'}
            </p>
          </div>
          {(profile.approvedRole !== 'STUDENT' && profile.requestedRole !== 'STUDENT') && (
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Employee ID</p>
              <p className="text-sm font-semibold text-gray-800">
                {profile.employeeId || 'Not Set'}
              </p>
            </div>
          )}
        </div>

        {/* Edit Form */}
        <form onSubmit={handleUpdateProfile} className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Personal Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* First Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white text-gray-900 placeholder-gray-500 text-base font-medium ${
                  errors.firstName ? 'border-red-600' : 'border-gray-500'
                }`}
                placeholder="Enter first name"
              />
              {errors.firstName && (
                <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white text-gray-900 placeholder-gray-500 text-base font-medium ${
                  errors.lastName ? 'border-red-600' : 'border-gray-500'
                }`}
                placeholder="Enter last name"
              />
              {errors.lastName && (
                <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white text-gray-900 placeholder-gray-500 text-base font-medium ${
                  errors.phoneNumber ? 'border-red-600' : 'border-gray-500'
                }`}
                placeholder="Enter 10-digit phone number"
              />
              {errors.phoneNumber && (
                <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>
              )}
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Department
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white text-gray-900 placeholder-gray-700 text-base font-medium"
                placeholder="Enter department"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={updating}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition"
            >
              <FiSave className="w-5 h-5" />
              {updating ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => {
                setFormData({
                  firstName: profile.firstName,
                  lastName: profile.lastName || '',
                  phoneNumber: profile.phoneNumber || '',
                  department: profile.department || '',
                });
                setErrors({});
              }}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition"
            >
              Reset
            </button>
          </div>
        </form>

        {/* Password Reset Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mt-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiLock className="w-6 h-6" />
              Password & Security
            </h2>
            {!showPasswordReset && (
              <button
                onClick={() => setShowPasswordReset(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
              >
                Change Password
              </button>
            )}
          </div>

          {!showPasswordReset ? (
            <div className="text-gray-600">
              <p className="mb-2">Secure your account by regularly updating your password.</p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                <li>Use a strong password with at least 8 characters</li>
                <li>Include uppercase, lowercase, numbers, and symbols</li>
                <li>Avoid using personal information</li>
              </ul>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Current Password *
                </label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordInputChange}
                  className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white text-gray-900 placeholder-gray-500 text-base font-medium ${
                    passwordErrors.currentPassword ? 'border-red-600' : 'border-gray-500'
                  }`}
                  placeholder="Enter your current password"
                />
                {passwordErrors.currentPassword && (
                  <p className="text-red-500 text-sm mt-1">{passwordErrors.currentPassword}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  New Password *
                </label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordInputChange}
                  className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white text-gray-900 placeholder-gray-500 text-base font-medium ${
                    passwordErrors.newPassword ? 'border-red-600' : 'border-gray-500'
                  }`}
                  placeholder="Enter your new password"
                />
                {passwordErrors.newPassword && (
                  <p className="text-red-500 text-sm mt-1">{passwordErrors.newPassword}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordInputChange}
                  className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white text-gray-900 placeholder-gray-500 text-base font-medium ${
                    passwordErrors.confirmPassword ? 'border-red-600' : 'border-gray-500'
                  }`}
                  placeholder="Confirm your new password"
                />
                {passwordErrors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">{passwordErrors.confirmPassword}</p>
                )}
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="submit"
                  disabled={resetingPassword}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition"
                >
                  <FiLock className="w-5 h-5" />
                  {resetingPassword ? 'Updating...' : 'Update Password'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordReset(false);
                    setPasswordForm({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: '',
                    });
                    setPasswordErrors({});
                  }}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function ProtectedProfilePage() {
  return (
    <ProtectedRoute>
      <ProfilePageContent />
    </ProtectedRoute>
  );
}
