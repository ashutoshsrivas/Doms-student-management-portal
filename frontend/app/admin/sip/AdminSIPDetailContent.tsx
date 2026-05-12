'use client';

import { useState, useEffect } from 'react';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import DashboardLayout from '@/app/components/DashboardLayout';
import { useRouter } from 'next/navigation';
import { exportSIPToExcel } from '@/app/lib/exportUtils';

export default function AdminSIPDetailContent({ sipId }) {
  const { user } = useAuthStore();
  const router = useRouter();
  const [sip, setSip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [weeklyUpdates, setWeeklyUpdates] = useState([]);

  const [formData, setFormData] = useState({
    enrollmentNo: '',
    studentName: '',
    specialization: '',
    gender: '',
    email: '',
    phoneNo: '',
    homeTownLocation: '',
    companyName: '',
    jobRole: '',
    sipLocation: '',
    stipend: '',
    type: 'ON_CAMPUS',
    corporateType: '',
    joinDate: '',
    nocDate: '',
    completionDate: '',
    durationWeeks: '',
    supervisorName: '',
    supervisorPhone: '',
    supervisorEmail: '',
    hrHeadName: '',
    hrPhone: '',
    hrEmail: '',
    officeAddress: '',
    projectTitle: '',
    facultyMentorName: '',
    sipEndDate: '',
    facultyGrading: '',
    supervisorGrading: '',
    extensionWeeks: '',
    ppOffered: false,
    ppoCompensation: '',
    ppoPosition: '',
    ppoLocation: '',
    nocIssueDateExtension: '',
    status: 'PENDING',
  });

  useEffect(() => {
    const fetchSIPDetails = async () => {
      try {
        const response = await apiClient.get(`/sip/${sipId}`);
        setSip(response.data);

        // Convert null values to empty strings and parse dates
        const cleanedData = {
          enrollmentNo: response.data.enrollmentNo || '',
          studentName: response.data.studentName || '',
          specialization: response.data.specialization || '',
          gender: response.data.gender || '',
          email: response.data.email || '',
          phoneNo: response.data.phoneNo || '',
          homeTownLocation: response.data.homeTownLocation || '',
          companyName: response.data.companyName || '',
          jobRole: response.data.jobRole || '',
          sipLocation: response.data.sipLocation || '',
          stipend: response.data.stipend || '',
          type: response.data.type || 'ON_CAMPUS',
          corporateType: response.data.corporateType || '',
          joinDate: response.data.joinDate ? response.data.joinDate.split('T')[0] : '',
          nocDate: response.data.nocDate ? response.data.nocDate.split('T')[0] : '',
          completionDate: response.data.completionDate ? response.data.completionDate.split('T')[0] : '',
          durationWeeks: response.data.durationWeeks || '',
          supervisorName: response.data.supervisorName || '',
          supervisorPhone: response.data.supervisorPhone || '',
          supervisorEmail: response.data.supervisorEmail || '',
          hrHeadName: response.data.hrHeadName || '',
          hrPhone: response.data.hrPhone || '',
          hrEmail: response.data.hrEmail || '',
          officeAddress: response.data.officeAddress || '',
          projectTitle: response.data.projectTitle || '',
          facultyMentorName: response.data.facultyMentorName || '',
          sipEndDate: response.data.sipEndDate ? response.data.sipEndDate.split('T')[0] : '',
          facultyGrading: response.data.facultyGrading || '',
          supervisorGrading: response.data.supervisorGrading || '',
          extensionWeeks: response.data.extensionWeeks || '',
          ppOffered: response.data.ppOffered || false,
          ppoCompensation: response.data.ppoCompensation || '',
          ppoPosition: response.data.ppoPosition || '',
          ppoLocation: response.data.ppoLocation || '',
          nocIssueDateExtension: response.data.nocIssueDateExtension ? response.data.nocIssueDateExtension.split('T')[0] : '',
          status: response.data.status || 'PENDING',
        };

        setFormData(cleanedData);

        const updatesResponse = await apiClient.get(`/sip/${sipId}/weekly-updates`);
        setWeeklyUpdates(updatesResponse.data || []);
      } catch (error) {
        console.error('Error fetching SIP details:', error);
        toast.error('Failed to load SIP details');
      } finally {
        setLoading(false);
      }
    };

    fetchSIPDetails();
  }, [sipId]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiClient.put(`/sip/${sipId}`, formData);
      setSip(formData);
      setEditing(false);
      toast.success('SIP updated successfully');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save SIP');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await apiClient.delete(`/sip/${sipId}`);
      toast.success('SIP deleted successfully');
      setTimeout(() => router.push('/admin/sip'), 1500);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete SIP');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const calculateWeekDisplay = (date) => {
    const d = new Date(date);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return d.toLocaleDateString('en-US', options);
  };

  if (loading) return <div className="text-center py-8 text-gray-900 font-semibold">Loading...</div>;

  if (!sip) {
    return (
      <DashboardLayout title="SIP Details">
        <div className="bg-red-100 border-2 border-red-700 rounded-lg p-6 text-center">
          <p className="text-red-900 font-bold text-lg">SIP not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`SIP Details - ${formData.studentName}`}>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{formData.studentName}</h2>
            <div className="space-x-3">
              <button
                onClick={() => exportSIPToExcel(sip)}
                className="px-6 py-3 rounded font-bold text-white text-base bg-green-700 hover:bg-green-800"
              >
                Export to Excel
              </button>
              <button
                onClick={() => setEditing(!editing)}
                className={`px-6 py-3 rounded font-bold text-white text-base ${
                  editing
                    ? 'bg-red-700 hover:bg-red-800'
                    : 'bg-blue-700 hover:bg-blue-800'
                }`}
              >
                {editing ? 'Cancel' : 'Edit'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-6 py-3 rounded font-bold text-white text-base bg-red-700 hover:bg-red-800"
              >
                Delete
              </button>
            </div>
          </div>

          {showDeleteConfirm && (
            <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-lg p-4">
              <p className="text-red-900 font-bold text-base mb-4">Are you sure you want to delete this SIP? This action cannot be undone.</p>
              <div className="space-x-3">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-6 py-2 rounded font-bold text-white text-base bg-red-700 hover:bg-red-800 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-6 py-2 rounded font-bold text-white text-base bg-gray-700 hover:bg-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                {['enrollmentNo', 'studentName', 'specialization', 'gender', 'email', 'phoneNo', 'homeTownLocation'].map(field => (
                  <div key={field} className={field === 'homeTownLocation' ? 'col-span-2' : ''}>
                    <label className="block text-gray-700 font-bold text-sm mb-1">{field}</label>
                    {editing ? (
                      field === 'gender' ? (
                        <select
                          value={formData[field]}
                          onChange={e => handleInputChange(field, e.target.value)}
                          className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium"
                        >
                          <option value="">Select Gender</option>
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                          <option value="OTHER">Other</option>
                        </select>
                      ) : (
                        <input
                          type={field === 'email' ? 'email' : field === 'phoneNo' ? 'tel' : 'text'}
                          value={formData[field]}
                          onChange={e => handleInputChange(field, e.target.value)}
                          className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium"
                        />
                      )
                    ) : (
                      <p className="text-gray-900 font-semibold">{formData[field] || 'N/A'}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Company Information</h3>
              <div className="grid grid-cols-2 gap-4">
                {['companyName', 'jobRole', 'sipLocation', 'stipend', 'type', 'corporateType', 'joinDate', 'nocDate', 'completionDate', 'durationWeeks'].map(field => (
                  (field !== 'corporateType' || formData.type === 'OFF_CAMPUS') && (
                    <div key={field}>
                      <label className="block text-gray-700 font-bold text-sm mb-1">{field}</label>
                      {editing ? (
                        field === 'type' ? (
                          <select
                            value={formData[field]}
                            onChange={e => handleInputChange(field, e.target.value)}
                            className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium"
                          >
                            <option value="ON_CAMPUS">On Campus</option>
                            <option value="OFF_CAMPUS">Off Campus</option>
                          </select>
                        ) : field === 'corporateType' ? (
                          <select
                            value={formData[field]}
                            onChange={e => handleInputChange(field, e.target.value)}
                            className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium"
                          >
                            <option value="">Select Type</option>
                            <option value="CORPORATE">Corporate</option>
                            <option value="FAMILY_BUSINESS">Family Business</option>
                            <option value="ENTREPRENEURSHIP">Entrepreneurship</option>
                            <option value="SOCIAL_INTERNSHIP">Social Internship</option>
                            <option value="GOVT_PROJECTS">Govt. Projects</option>
                          </select>
                        ) : field === 'joinDate' || field === 'nocDate' || field === 'completionDate' ? (
                          <input
                            type="date"
                            value={formData[field]}
                            onChange={e => handleInputChange(field, e.target.value)}
                            className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium"
                          />
                        ) : (
                          <input
                            type={field === 'stipend' || field === 'durationWeeks' ? 'number' : 'text'}
                            value={formData[field]}
                            onChange={e => handleInputChange(field, e.target.value)}
                            className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium"
                          />
                        )
                      ) : (
                        <p className="text-gray-900 font-semibold">{formData[field] || 'N/A'}</p>
                      )}
                    </div>
                  )
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Supervisor & HR Information</h3>
              <div className="grid grid-cols-2 gap-4">
                {['supervisorName', 'supervisorPhone', 'supervisorEmail', 'hrHeadName', 'hrPhone', 'hrEmail', 'officeAddress'].map(field => (
                  <div key={field} className={field === 'officeAddress' ? 'col-span-2' : ''}>
                    <label className="block text-gray-700 font-bold text-sm mb-1">{field}</label>
                    {editing ? (
                      field === 'officeAddress' ? (
                        <textarea
                          value={formData[field]}
                          onChange={e => handleInputChange(field, e.target.value)}
                          className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium"
                          rows="3"
                        />
                      ) : (
                        <input
                          type={field.includes('Email') ? 'email' : field.includes('Phone') ? 'tel' : 'text'}
                          value={formData[field]}
                          onChange={e => handleInputChange(field, e.target.value)}
                          className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium"
                        />
                      )
                    ) : (
                      <p className="text-gray-900 font-semibold">{formData[field] || 'N/A'}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Project Information</h3>
              <div className="grid grid-cols-2 gap-4">
                {['projectTitle', 'facultyMentorName', 'sipEndDate'].map(field => (
                  <div key={field} className={field === 'projectTitle' ? 'col-span-2' : ''}>
                    <label className="block text-gray-700 font-bold text-sm mb-1">{field}</label>
                    {editing ? (
                      field === 'sipEndDate' ? (
                        <input
                          type="date"
                          value={formData[field]}
                          onChange={e => handleInputChange(field, e.target.value)}
                          className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium"
                        />
                      ) : (
                        <input
                          type="text"
                          value={formData[field]}
                          onChange={e => handleInputChange(field, e.target.value)}
                          className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium"
                        />
                      )
                    ) : (
                      <p className="text-gray-900 font-semibold">{formData[field] || 'N/A'}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Grading & PPO</h3>
              <div className="grid grid-cols-2 gap-4">
                {['facultyGrading', 'supervisorGrading', 'extensionWeeks', 'ppOffered', 'ppoCompensation', 'ppoPosition', 'ppoLocation', 'nocIssueDateExtension'].map(field => (
                  (field !== 'ppoCompensation' && field !== 'ppoPosition' && field !== 'ppoLocation' && field !== 'nocIssueDateExtension') || formData.ppOffered ? (
                    <div key={field} className={field === 'ppOffered' ? 'flex items-center' : ''}>
                      <label className="block text-gray-700 font-bold text-sm mb-1">{field}</label>
                      {editing ? (
                        field === 'ppOffered' ? (
                          <input
                            type="checkbox"
                            checked={formData[field]}
                            onChange={e => handleInputChange(field, e.target.checked)}
                            className="w-4 h-4 ml-2"
                          />
                        ) : field === 'nocIssueDateExtension' ? (
                          <input
                            type="date"
                            value={formData[field]}
                            onChange={e => handleInputChange(field, e.target.value)}
                            className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium"
                          />
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            value={formData[field]}
                            onChange={e => handleInputChange(field, e.target.value)}
                            className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium"
                          />
                        )
                      ) : (
                        <p className="text-gray-900 font-semibold">{field === 'ppOffered' ? (formData[field] ? 'Yes' : 'No') : (formData[field] || 'N/A')}</p>
                      )}
                    </div>
                  ) : null
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Status</h3>
              <div>
                <label className="block text-gray-700 font-bold text-sm mb-1">Status</label>
                {editing ? (
                  <select
                    value={formData.status}
                    onChange={e => handleInputChange('status', e.target.value)}
                    className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                ) : (
                  <span className={`px-4 py-2 rounded-full text-base font-bold ${
                    formData.status === 'COMPLETED'
                      ? 'bg-green-200 text-green-900'
                      : 'bg-yellow-200 text-yellow-900'
                  }`}>
                    {formData.status}
                  </span>
                )}
              </div>
            </div>

            {editing && (
              <div className="mt-8 flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-green-700 text-white px-6 py-3 rounded font-bold hover:bg-green-800 disabled:opacity-50 text-base"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setFormData(sip);
                  }}
                  className="bg-gray-700 text-white px-6 py-3 rounded font-bold hover:bg-gray-800 text-base"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {weeklyUpdates.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-700">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Weekly Updates ({weeklyUpdates.length})</h3>
            <div className="space-y-3">
              {weeklyUpdates.map((update, idx) => (
                <div key={update.id || idx} className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-gray-900 font-bold text-base">
                        Week of {calculateWeekDisplay(update.weekStartDate)} - {calculateWeekDisplay(update.weekEndDate)}
                      </p>
                    </div>
                    <span className="bg-green-200 text-green-900 px-3 py-1 rounded text-sm font-bold">Submitted</span>
                  </div>
                  <p className="text-gray-700 text-base whitespace-pre-wrap font-medium mt-2">{update.statusText}</p>
                  {update.submittedAt && (
                    <p className="text-gray-600 text-sm mt-2 font-semibold">
                      Submitted on {new Date(update.submittedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
