'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiSave, FiTrash2, FiPlus } from 'react-icons/fi';

interface StudentProfileData {
  fatherName: string;
  fatherOccupation: string;
  fatherOccupationDescription: string;
  motherName: string;
  motherOccupation: string;
  motherOccupationDescription: string;
  guardianPhone: string;
  residentialStatus: 'HOSTELLER' | 'DAY_SCHOLAR' | 'OTHER';
  aboutMe: string;
  careerObjective: string;
  interests: string[];
  skills: string[];
  coScholasticExpertise: string;
  coScholasticDescription: string;
  hasWorkExperience: boolean;
  workExperiences: Array<{ organization: string; role: string; duration: string; description: string }>;
  achievements: string[];
  certifications: string[];
  projects: string[];
  positionsOfResponsibility: string[];
  linkedin: string;
  github: string;
  portfolio: string;
  coursera: string;
  otherLinks: string[];
  languagesKnown: string[];
  hobbies: string[];
  strengths: string[];
  areasOfImprovement: string[];
  resume: string;
  certificateDocuments: Array<{ id: string; name: string; url: string; uploadedAt: string }>;
}

type TabType = 'personal' | 'professional' | 'skills' | 'work' | 'achievements' | 'documents' | 'online' | 'additional';

function StudentProfileContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('personal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newItems, setNewItems] = useState<Record<string, string>>({});
  const [workExperienceDraft, setWorkExperienceDraft] = useState({
    organization: '',
    role: '',
    duration: '',
    description: '',
  });

  const [profileData, setProfileData] = useState<StudentProfileData>({
    fatherName: '',
    fatherOccupation: '',
    fatherOccupationDescription: '',
    motherName: '',
    motherOccupation: '',
    motherOccupationDescription: '',
    guardianPhone: '',
    residentialStatus: 'DAY_SCHOLAR',
    aboutMe: '',
    careerObjective: '',
    interests: [],
    skills: [],
    coScholasticExpertise: '',
    coScholasticDescription: '',
    hasWorkExperience: false,
    workExperiences: [],
    achievements: [],
    certifications: [],
    projects: [],
    positionsOfResponsibility: [],
    linkedin: '',
    github: '',
    portfolio: '',
    coursera: '',
    otherLinks: [],
    languagesKnown: [],
    hobbies: [],
    strengths: [],
    areasOfImprovement: [],
    resume: '',
    certificateDocuments: [],
  });

  const parseArrayField = <T = unknown>(value: unknown): T[] => {
    if (Array.isArray(value)) {
      return value as T[];
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed as T[];
        }
        return value ? [value as unknown as T] : [];
      } catch {
        return value ? [value as unknown as T] : [];
      }
    }
    return [];
  };

  const normalizeProfileData = (data: Partial<StudentProfileData>): StudentProfileData => ({
    fatherName: data.fatherName ?? '',
    fatherOccupation: data.fatherOccupation ?? '',
    fatherOccupationDescription: data.fatherOccupationDescription ?? '',
    motherName: data.motherName ?? '',
    motherOccupation: data.motherOccupation ?? '',
    motherOccupationDescription: data.motherOccupationDescription ?? '',
    guardianPhone: data.guardianPhone ?? '',
    residentialStatus: data.residentialStatus ?? 'DAY_SCHOLAR',
    aboutMe: data.aboutMe ?? '',
    careerObjective: data.careerObjective ?? '',
    interests: parseArrayField(data.interests),
    skills: parseArrayField(data.skills),
    coScholasticExpertise: data.coScholasticExpertise ?? '',
    coScholasticDescription: data.coScholasticDescription ?? '',
    hasWorkExperience: data.hasWorkExperience ?? false,
    workExperiences: parseArrayField(data.workExperiences),
    achievements: parseArrayField(data.achievements),
    certifications: parseArrayField(data.certifications),
    projects: parseArrayField(data.projects),
    positionsOfResponsibility: parseArrayField(data.positionsOfResponsibility),
    linkedin: data.linkedin ?? '',
    github: data.github ?? '',
    portfolio: data.portfolio ?? '',
    coursera: data.coursera ?? '',
    otherLinks: parseArrayField(data.otherLinks),
    languagesKnown: parseArrayField(data.languagesKnown),
    hobbies: parseArrayField(data.hobbies),
    strengths: parseArrayField(data.strengths),
    areasOfImprovement: parseArrayField(data.areasOfImprovement),
    resume: data.resume ?? '',
    certificateDocuments: parseArrayField(data.certificateDocuments),
  });

  const safeStringArray = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }
    return [];
  };

  const tabs = [
    { id: 'personal', label: 'Personal Background' },
    { id: 'professional', label: 'Professional Profile' },
    { id: 'skills', label: 'Skills & Expertise' },
    { id: 'work', label: 'Work Experience' },
    { id: 'achievements', label: 'Achievements' },
    { id: 'documents', label: 'Documents' },
    { id: 'online', label: 'Online Presence' },
    { id: 'additional', label: 'Additional Info' },
  ];

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get('/student-profile');
      if (response.data) {
        const profileData = response.data.profile || response.data;
        setProfileData((prev) => ({ ...prev, ...normalizeProfileData(profileData) }));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => { await fetchProfile(); };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (field: keyof StudentProfileData, value: StudentProfileData[keyof StudentProfileData]) => {
    setProfileData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const getNewItem = (field: keyof StudentProfileData) => newItems[field] ?? '';

  const setNewItemForField = (field: keyof StudentProfileData, value: string) => {
    setNewItems((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadingCertificate, setUploadingCertificate] = useState(false);

  const setWorkExperienceDraftField = (field: keyof typeof workExperienceDraft, value: string) => {
    setWorkExperienceDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const uploadResume = async (file: File | null) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('resume', file);
    setUploadingResume(true);

    try {
      const response = await apiClient.post('/student-profile/upload-resume', formData);
      setProfileData((prev) => ({ ...prev, resume: response.data.resume }));
      toast.success('Resume uploaded successfully');
    } catch (error: unknown) {
      console.error('Error uploading resume:', error);
      toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Resume upload failed');
    } finally {
      setUploadingResume(false);
    }
  };

  const uploadCertificateDocument = async (file: File | null) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('certificate', file);
    setUploadingCertificate(true);

    try {
      const response = await apiClient.post('/student-profile/upload-certificate', formData);
      setProfileData((prev) => ({
        ...prev,
        certificateDocuments: [...prev.certificateDocuments, response.data.document],
      }));
      toast.success('Document uploaded successfully');
    } catch (error: unknown) {
      console.error('Error uploading document:', error);
      toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Upload failed');
    } finally {
      setUploadingCertificate(false);
    }
  };

  const deleteCertificateDocument = async (documentId: string) => {
    try {
      console.log('[DELETE Certificate] Attempting to delete document ID:', documentId);
      console.log('[DELETE Certificate] Full URL will be: student-profile/certificate/' + documentId);
      
      await apiClient.delete(`student-profile/certificate/${documentId}`);
      
      setProfileData((prev) => ({
        ...prev,
        certificateDocuments: prev.certificateDocuments.filter((doc) => doc.id !== documentId),
      }));
      toast.success('Document removed successfully');
    } catch (error: unknown) {
      console.error('[DELETE Certificate] Error:', error);
      toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to remove document');
    }
  };

  const addWorkExperience = () => {
    const { organization, role, duration, description } = workExperienceDraft;
    if (!organization.trim() && !role.trim() && !duration.trim() && !description.trim()) {
      toast.error('Please enter at least one detail for work experience');
      return;
    }

    const currentArray = Array.isArray(profileData.workExperiences)
      ? profileData.workExperiences
      : [];

    handleInputChange('workExperiences', [
      ...currentArray,
      {
        organization: organization.trim(),
        role: role.trim(),
        duration: duration.trim(),
        description: description.trim(),
      },
    ]);

    setWorkExperienceDraft({
      organization: '',
      role: '',
      duration: '',
      description: '',
    });
  };

  const removeWorkExperience = (index: number) => {
    const currentArray = Array.isArray(profileData.workExperiences)
      ? profileData.workExperiences
      : [];
    handleInputChange(
      'workExperiences',
      currentArray.filter((_, i) => i !== index)
    );
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await apiClient.put('/student-profile', profileData);
      toast.success('Profile saved successfully');
    } catch (error: unknown) {
      console.error('Error saving profile:', error);
      toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const addArrayItem = (field: keyof StudentProfileData) => {
    const item = getNewItem(field).trim();
    if (!item) {
      toast.error('Please enter a value');
      return;
    }

    const currentArray = Array.isArray(profileData[field]) ? (profileData[field] as string[]) : [];
    handleInputChange(field, [...currentArray, item]);
    setNewItemForField(field, '');
  };

  const removeArrayItem = (field: keyof StudentProfileData, index: number) => {
    const currentArray = Array.isArray(profileData[field]) ? (profileData[field] as string[]) : [];
    handleInputChange(field, currentArray.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <DashboardLayout title="Student Profile">
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-12 h-12 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Student Profile">
      <div className="max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Student Profile</h1>
          <div className="flex gap-2">
            <button
              onClick={saveProfile}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg transition"
            >
              <FiSave className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition font-medium"
            >
              <FiArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-4 py-4 font-semibold text-center transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'personal' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Father&apos;s Name</label>
                    <input
                      type="text"
                      value={profileData.fatherName}
                      onChange={(e) => handleInputChange('fatherName', e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Father&apos;s Occupation</label>
                    <input
                      type="text"
                      value={profileData.fatherOccupation}
                      onChange={(e) => handleInputChange('fatherOccupation', e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Father&apos;s Occupation Description</label>
                    <textarea
                      value={profileData.fatherOccupationDescription}
                      onChange={(e) => handleInputChange('fatherOccupationDescription', e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Mother&apos;s Name</label>
                    <input
                      type="text"
                      value={profileData.motherName}
                      onChange={(e) => handleInputChange('motherName', e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Mother&apos;s Occupation</label>
                    <input
                      type="text"
                      value={profileData.motherOccupation}
                      onChange={(e) => handleInputChange('motherOccupation', e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Mother&apos;s Occupation Description</label>
                    <textarea
                      value={profileData.motherOccupationDescription}
                      onChange={(e) => handleInputChange('motherOccupationDescription', e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Guardian Phone</label>
                    <input
                      type="tel"
                      value={profileData.guardianPhone}
                      onChange={(e) => handleInputChange('guardianPhone', e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Residential Status</label>
                    <select
                      value={profileData.residentialStatus}
                      onChange={(e) => handleInputChange('residentialStatus', e.target.value as StudentProfileData['residentialStatus'])}
                      className="w-full px-4 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
                    >
                      <option value="HOSTELLER">Hosteller</option>
                      <option value="DAY_SCHOLAR">Day Scholar</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'professional' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">About Me</label>
                  <textarea
                    value={profileData.aboutMe}
                    onChange={(e) => handleInputChange('aboutMe', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Career Objective</label>
                  <textarea
                    value={profileData.careerObjective}
                    onChange={(e) => handleInputChange('careerObjective', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
                    rows={3}
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Interests</h3>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={getNewItem('interests')}
                      onChange={(e) => setNewItemForField('interests', e.target.value)}
                      placeholder="Add interest"
                      className="flex-1 px-4 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
                      onKeyPress={(e) => e.key === 'Enter' && addArrayItem('interests')}
                    />
                    <button
                      onClick={() => addArrayItem('interests')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                    >
                      <FiPlus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {safeStringArray(profileData.interests).map((interest, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-slate-100 text-slate-900 shadow-sm">
                        <span>{interest}</span>
                        <button onClick={() => removeArrayItem('interests', idx)} className="text-slate-500 hover:text-slate-900">
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'skills' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Skills</h3>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={getNewItem('skills')}
                      onChange={(e) => setNewItemForField('skills', e.target.value)}
                      placeholder="Add skill"
                      className="flex-1 px-4 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
                      onKeyPress={(e) => e.key === 'Enter' && addArrayItem('skills')}
                    />
                    <button
                      onClick={() => addArrayItem('skills')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                    >
                      <FiPlus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {safeStringArray(profileData.skills).map((skill, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-slate-100 text-slate-900 shadow-sm">
                        <span>{skill}</span>
                        <button onClick={() => removeArrayItem('skills', idx)} className="text-slate-500 hover:text-slate-900">
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Co-scholastic Expertise</label>
                    <input
                      type="text"
                      value={profileData.coScholasticExpertise}
                      onChange={(e) => handleInputChange('coScholasticExpertise', e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <textarea
                      value={profileData.coScholasticDescription}
                      onChange={(e) => handleInputChange('coScholasticDescription', e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
                      rows={1}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'work' && (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={profileData.hasWorkExperience}
                    onChange={(e) => handleInputChange('hasWorkExperience', e.target.checked)}
                    className="w-5 h-5"
                  />
                  <label className="font-semibold text-gray-900">I have work experience</label>
                </div>

                {profileData.hasWorkExperience && (
                  <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900">Work Experience Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Organization</label>
                        <input
                          type="text"
                          value={workExperienceDraft.organization}
                          onChange={(e) => setWorkExperienceDraftField('organization', e.target.value)}
                          className="w-full px-4 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
                          placeholder="Company or organization"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Role / Position</label>
                        <input
                          type="text"
                          value={workExperienceDraft.role}
                          onChange={(e) => setWorkExperienceDraftField('role', e.target.value)}
                          className="w-full px-4 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
                          placeholder="Your job title"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Duration</label>
                        <input
                          type="text"
                          value={workExperienceDraft.duration}
                          onChange={(e) => setWorkExperienceDraftField('duration', e.target.value)}
                          className="w-full px-4 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
                          placeholder="e.g. Jan 2023 - Dec 2023"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                        <textarea
                          value={workExperienceDraft.description}
                          onChange={(e) => setWorkExperienceDraftField('description', e.target.value)}
                          className="w-full px-4 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
                          rows={3}
                          placeholder="Describe your responsibilities or achievements"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={addWorkExperience}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                      >
                        <FiPlus className="w-4 h-4" />
                        Add work experience
                      </button>
                    </div>

                    {Array.isArray(profileData.workExperiences) && profileData.workExperiences.length > 0 && (
                      <div className="space-y-3 pt-4">
                        <h4 className="text-base font-semibold text-gray-900">Saved work experiences</h4>
                        <div className="space-y-3">
                          {profileData.workExperiences.map((experience, idx) => (
                            <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                <div>
                                  <p className="font-semibold text-gray-900">{experience.organization || 'Untitled organization'}</p>
                                  <p className="text-sm text-gray-600">{experience.role || 'No role provided'}</p>
                                </div>
                                <p className="text-sm text-gray-500">{experience.duration}</p>
                              </div>
                              {experience.description ? (
                                <p className="mt-3 text-sm text-gray-700">{experience.description}</p>
                              ) : null}
                              <button
                                onClick={() => removeWorkExperience(idx)}
                                className="mt-3 inline-flex items-center gap-2 text-red-600 hover:text-red-800"
                              >
                                <FiTrash2 className="w-4 h-4" />
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'achievements' && (
              <div className="space-y-6">
                {['achievements', 'certifications', 'projects', 'positionsOfResponsibility'].map((field) => (
                  <div key={field}>
                    <h3 className="font-semibold text-gray-900 mb-3">
                      {field === 'achievements' && 'Achievements'}
                      {field === 'certifications' && 'Certifications'}
                      {field === 'projects' && 'Projects'}
                      {field === 'positionsOfResponsibility' && 'Positions of Responsibility'}
                    </h3>
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={getNewItem(field as keyof StudentProfileData)}
                        onChange={(e) => setNewItemForField(field as keyof StudentProfileData, e.target.value)}
                        placeholder={`Add item`}
                        className="flex-1 px-4 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
                        onKeyPress={(e) => e.key === 'Enter' && addArrayItem(field as keyof StudentProfileData)}
                      />
                      <button
                        onClick={() => addArrayItem(field as keyof StudentProfileData)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                      >
                        <FiPlus className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {safeStringArray(profileData[field as keyof StudentProfileData]).map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-slate-100 text-slate-900 shadow-sm">
                          <span>{item}</span>
                          <button onClick={() => removeArrayItem(field as keyof StudentProfileData, idx)} className="text-slate-500 hover:text-slate-900">
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Resume</h3>
                  <div className="flex flex-col gap-3">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => uploadResume(e.target.files?.[0] ?? null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700"
                    />
                    {uploadingResume && (
                      <span className="text-sm text-blue-600">Uploading resume...</span>
                    )}
                  </div>
                  {profileData.resume ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">Uploaded Resume</p>
                      <a href={profileData.resume} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm">
                        View resume
                      </a>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-gray-600">No resume uploaded yet.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Certificates / Documents</h3>
                  <div className="flex flex-col gap-3">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => uploadCertificateDocument(e.target.files?.[0] ?? null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700"
                    />
                    {uploadingCertificate && (
                      <span className="text-sm text-blue-600">Uploading document...</span>
                    )}
                  </div>

                  <div className="mt-4 space-y-3">
                    {profileData.certificateDocuments.length > 0 ? (
                      profileData.certificateDocuments.map((doc) => (
                        <div key={doc.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">{doc.name}</p>
                            <a href={doc.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm">
                              View document
                            </a>
                            <p className="text-xs text-slate-500">Uploaded on {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteCertificateDocument(doc.id)}
                            className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-600 transition hover:border-red-300 hover:bg-red-100"
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-600">No certificate documents uploaded yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'online' && (
              <div className="space-y-4">
                {['linkedin', 'github', 'portfolio', 'coursera'].map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 capitalize">{field}</label>
                    <input
                      type="url"
                      value={profileData[field as keyof StudentProfileData] as string}
                      onChange={(e) => handleInputChange(field as keyof StudentProfileData, e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
                    />
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'additional' && (
              <div className="space-y-6">
                {['languagesKnown', 'hobbies', 'strengths', 'areasOfImprovement'].map((field) => (
                  <div key={field}>
                    <h3 className="font-semibold text-gray-900 mb-3">
                      {field === 'languagesKnown' && 'Languages Known'}
                      {field === 'hobbies' && 'Hobbies'}
                      {field === 'strengths' && 'Strengths'}
                      {field === 'areasOfImprovement' && 'Areas of Improvement'}
                    </h3>
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={getNewItem(field as keyof StudentProfileData)}
                        onChange={(e) => setNewItemForField(field as keyof StudentProfileData, e.target.value)}
                        placeholder={`Add item`}
                        className="flex-1 px-4 py-2 border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
                        onKeyPress={(e) => e.key === 'Enter' && addArrayItem(field as keyof StudentProfileData)}
                      />
                      <button
                        onClick={() => addArrayItem(field as keyof StudentProfileData)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                      >
                        <FiPlus className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {safeStringArray(profileData[field as keyof StudentProfileData]).map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-slate-100 text-slate-900 shadow-sm">
                          <span>{item}</span>
                          <button onClick={() => removeArrayItem(field as keyof StudentProfileData, idx)} className="text-slate-500 hover:text-slate-900">
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function StudentProfilePage() {
  return (
    <ProtectedRoute requiredRoles={['STUDENT']}>
      <StudentProfileContent />
    </ProtectedRoute>
  );
}
