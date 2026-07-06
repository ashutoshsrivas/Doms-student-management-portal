'use client';

import { useState, useEffect } from 'react';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import DashboardLayout from '@/app/components/DashboardLayout';

type WeeklyUpdate = {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  statusText: string;
  submittedAt?: string;
};

type StudentSessionInfo = {
  academicSessionId: string;
  AcademicSession: any;
  id: string;
};

export default function SIPContent() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('personal');
  const [sip, setSip] = useState<any>(null);
  const [studentSession, setStudentSession] = useState<StudentSessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCertificate, setUploadingCertificate] = useState(false);
  const [uploadingFaculty, setUploadingFaculty] = useState(false);
  const [uploadingSupervisor, setUploadingSupervisor] = useState(false);
  const [weeklyUpdates, setWeeklyUpdates] = useState<WeeklyUpdate[]>([]);
  const [currentWeekStatus, setCurrentWeekStatus] = useState('');
  const [submittingWeekly, setSubmittingWeekly] = useState(false);
  const [formMinimized, setFormMinimized] = useState(true);

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
    const fetchSIPData = async () => {
      try {
        const sessionResponse = await apiClient.get('/sessions/me/session');
        if (!sessionResponse.data?.session) {
          toast.error('You are not enrolled in any session');
          setLoading(false);
          return;
        }

        const academicSession = sessionResponse.data.session;
        const studentSessionId = sessionResponse.data.studentSessionId;
        const currentStudentSession = {
          academicSessionId: academicSession.id,
          AcademicSession: academicSession,
          id: studentSessionId,
        };

        setStudentSession(currentStudentSession);

        if (!academicSession.sipEnabled) {
          setLoading(false);
          return;
        }

        try {
          const sipsResponse = await apiClient.get(`/sip/session/${academicSession.id}`);
          console.log('SIP Response:', sipsResponse.data);

          if (sipsResponse.data && sipsResponse.data.length > 0) {
            const existingSIP = sipsResponse.data[0];
            console.log('Existing SIP:', existingSIP);

            setSip(existingSIP);
            setFormMinimized(true);

            // Create a new formData object with values from the SIP
            const loadedFormData = {
              enrollmentNo: existingSIP.enrollmentNo || '',
              studentName: existingSIP.studentName || '',
              specialization: existingSIP.specialization || '',
              gender: existingSIP.gender || '',
              email: existingSIP.email || '',
              phoneNo: existingSIP.phoneNo || '',
              homeTownLocation: existingSIP.homeTownLocation || '',
              companyName: existingSIP.companyName || '',
              jobRole: existingSIP.jobRole || '',
              sipLocation: existingSIP.sipLocation || '',
              stipend: existingSIP.stipend || '',
              type: existingSIP.type || 'ON_CAMPUS',
              corporateType: existingSIP.corporateType || '',
              joinDate: existingSIP.joinDate ? existingSIP.joinDate.split('T')[0] : '',
              nocDate: existingSIP.nocDate ? existingSIP.nocDate.split('T')[0] : '',
              completionDate: existingSIP.completionDate ? existingSIP.completionDate.split('T')[0] : '',
              durationWeeks: existingSIP.durationWeeks || '',
              supervisorName: existingSIP.supervisorName || '',
              supervisorPhone: existingSIP.supervisorPhone || '',
              supervisorEmail: existingSIP.supervisorEmail || '',
              hrHeadName: existingSIP.hrHeadName || '',
              hrPhone: existingSIP.hrPhone || '',
              hrEmail: existingSIP.hrEmail || '',
              officeAddress: existingSIP.officeAddress || '',
              projectTitle: existingSIP.projectTitle || '',
              facultyMentorName: existingSIP.facultyMentorName || '',
              sipEndDate: existingSIP.sipEndDate ? existingSIP.sipEndDate.split('T')[0] : '',
              facultyGrading: existingSIP.facultyGrading || '',
              supervisorGrading: existingSIP.supervisorGrading || '',
              extensionWeeks: existingSIP.extensionWeeks || '',
              ppOffered: existingSIP.ppOffered === true || existingSIP.ppOffered === 'true',
              ppoCompensation: existingSIP.ppoCompensation || '',
              ppoPosition: existingSIP.ppoPosition || '',
              ppoLocation: existingSIP.ppoLocation || '',
              nocIssueDateExtension: existingSIP.nocIssueDateExtension ? existingSIP.nocIssueDateExtension.split('T')[0] : '',
              status: existingSIP.status || 'PENDING',
            };

            console.log('Loaded Form Data:', loadedFormData);
            setFormData(loadedFormData);

            // Fetch weekly updates for this SIP
            try {
              const updatesResponse = await apiClient.get(`/sip/${existingSIP.id}/weekly-updates`);
              setWeeklyUpdates(updatesResponse.data || []);
            } catch (err) {
              console.log('No weekly updates found');
            }
          } else {
            console.log('No existing SIP found');
            setFormMinimized(false);

            // Fetch user profile and pre-fill basic details
            try {
              const profileResponse = await apiClient.get('/auth/profile');
              const profile = profileResponse.data;

              setFormData(prev => ({
                ...prev,
                studentName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
                email: profile.email || '',
                phoneNo: profile.studentProfile?.phoneNo || '',
                specialization: profile.studentProfile?.specialization || '',
              }));
            } catch (err) {
              console.log('Could not fetch profile details');
            }
          }
        } catch (error) {
          console.error('Error fetching SIP from session:', error);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching SIP data:', error);
        toast.error('Failed to load SIP data');
        setLoading(false);
      }
    };

    fetchSIPData();
  }, []);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value as any }));
  };

  const handleSave = async () => {
    if (!formData.studentName || !formData.companyName) {
      toast.error('Please fill in at least Student Name and Company Name');
      return;
    }

    try {
      setSaving(true);
      if (sip) {
        // Update existing SIP
        const response = await apiClient.put(`/sip/${sip.id}`, formData);
        setSip(response.data.sip);
        toast.success('SIP updated successfully');
      } else {
        // Create new SIP with form data
        if (!studentSession?.academicSessionId) {
          toast.error('Session not found');
          return;
        }

        const response = await apiClient.post('/sip', {
          sessionId: studentSession.academicSessionId,
          ...formData,
        });

        // Set the created SIP and update formData with the response
        const createdSIP = response.data.sip;
        setSip(createdSIP);

        // Update formData with the server response to ensure consistency
        setFormData(prev => ({
          ...prev,
          ...createdSIP,
          joinDate: createdSIP.joinDate ? createdSIP.joinDate.split('T')[0] : '',
          nocDate: createdSIP.nocDate ? createdSIP.nocDate.split('T')[0] : '',
          completionDate: createdSIP.completionDate ? createdSIP.completionDate.split('T')[0] : '',
          sipEndDate: createdSIP.sipEndDate ? createdSIP.sipEndDate.split('T')[0] : '',
          nocIssueDateExtension: createdSIP.nocIssueDateExtension ? createdSIP.nocIssueDateExtension.split('T')[0] : '',
        }));

        toast.success('SIP saved successfully');
      }
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Failed to save SIP');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitWeeklyUpdate = async () => {
    if (!currentWeekStatus.trim()) {
      toast.error('Please enter your weekly status');
      return;
    }

    if (!sip) return;

    try {
      setSubmittingWeekly(true);
      const response = await apiClient.post(`/sip/${sip.id}/weekly-updates`, {
        statusText: currentWeekStatus,
      });

      // Add the new update to the list
      setWeeklyUpdates(prev => [...prev, response.data.weekUpdate]);
      setCurrentWeekStatus('');
      toast.success('Weekly update submitted successfully');
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Failed to submit weekly update');
    } finally {
      setSubmittingWeekly(false);
    }
  };

  const calculateWeekDisplay = (date: string) => {
    const d = new Date(date);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return d.toLocaleDateString('en-US', options);
  };

  const handleCertificateUpload = async (file: File | null | undefined) => {
    if (!file || !sip) return;
    try {
      setUploadingCertificate(true);
      const formDataObj = new FormData();
      formDataObj.append('certificate', file);
      const response = await apiClient.post(`/sip/${sip.id}/upload-certificate`, formDataObj);
      setSip((prev: any) => ({ ...prev, certificateIssued: response.data.certificateIssued }));
      toast.success('Certificate uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload certificate');
    } finally {
      setUploadingCertificate(false);
    }
  };

  const handleFeedbackUpload = async (file: File | null | undefined, type: 'faculty' | 'supervisor') => {
    if (!file || !sip) return;
    try {
      if (type === 'faculty') setUploadingFaculty(true);
      else setUploadingSupervisor(true);
      const formDataObj = new FormData();
      formDataObj.append('feedback', file);
      const response = await apiClient.post(`/sip/${sip.id}/upload-feedback?feedbackType=${type}`, formDataObj);
      setSip((prev: any) => ({
        ...prev,
        [type === 'faculty' ? 'facultyFeedback' : 'supervisorFeedback']:
          response.data[type === 'faculty' ? 'facultyFeedback' : 'supervisorFeedback'],
      }));
      toast.success(`${type} feedback uploaded successfully`);
    } catch (error) {
      toast.error('Failed to upload feedback');
    } finally {
      if (type === 'faculty') setUploadingFaculty(false);
      else setUploadingSupervisor(false);
    }
  };

  if (loading) return <div className="text-center py-8 text-gray-900 font-semibold">Loading...</div>;

  if (!studentSession) {
    return (
      <DashboardLayout title="Internship (SIP)">
        <div className="bg-red-100 border-2 border-red-700 rounded-lg p-6 text-center">
          <p className="text-red-900 font-bold text-lg">You are not enrolled in any session</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!studentSession.AcademicSession?.sipEnabled) {
    return (
      <DashboardLayout title="Internship (SIP)">
        <div className="bg-orange-100 border-2 border-orange-800 rounded-lg p-6 text-center shadow-md">
          <p className="text-orange-900 font-bold text-lg">
            SIP (Internship Program) is not yet enabled for <span className="text-orange-950 font-extrabold">{studentSession.AcademicSession?.name}</span>
          </p>
          <p className="text-orange-800 text-base mt-3 font-semibold">
            Please wait for your administrator to enable it for this session
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Internship (SIP) Program">
      <div className="space-y-6">
        {/* SIP Form Section */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Form Header - Always Visible */}
          <div
            onClick={() => setFormMinimized(!formMinimized)}
            className="p-6 border-l-4 border-blue-700 bg-blue-50 cursor-pointer hover:bg-blue-100 transition flex justify-between items-center"
          >
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {sip ? `SIP Form - ${formData.studentName || 'Unnamed'}` : 'SIP Form'}
              </h2>
              {sip && (
                <p className="text-gray-600 text-sm mt-1 font-semibold">
                  Company: {formData.companyName || 'Not specified'} | Location: {formData.sipLocation || 'Not specified'}
                </p>
              )}
            </div>
            <button className="text-blue-700 font-bold text-xl hover:text-blue-900">
              {formMinimized ? '▼' : '▲'}
            </button>
          </div>

          {/* Form Content - Collapsible */}
          {!formMinimized && (
            <>
              <div className="flex border-b-2 border-gray-300">
                {['personal', 'company', 'supervisor', 'project', 'grading', 'documents', 'weekly'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-3 font-bold text-base transition-colors ${
                      activeTab === tab
                        ? 'border-b-4 border-blue-700 text-blue-700 bg-blue-50'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              <div className="p-6">
          {activeTab === 'personal' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Enrollment No</label>
                <input type="text" placeholder="e.g. 21GS1234" value={formData.enrollmentNo} onChange={e => handleInputChange('enrollmentNo', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-500" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Student Name</label>
                <input type="text" placeholder="Full name" value={formData.studentName} onChange={e => handleInputChange('studentName', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-500" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Specialization</label>
                <input type="text" placeholder="e.g. Marketing" value={formData.specialization} onChange={e => handleInputChange('specialization', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-500" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Gender</label>
                <select value={formData.gender} onChange={e => handleInputChange('gender', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium">
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                <input type="email" placeholder="you@example.com" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-500" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone No</label>
                <input type="tel" placeholder="10-digit number" value={formData.phoneNo} onChange={e => handleInputChange('phoneNo', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Home Town Location</label>
                <input type="text" placeholder="City, State" value={formData.homeTownLocation} onChange={e => handleInputChange('homeTownLocation', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-500" />
              </div>
            </div>
          )}

          {activeTab === 'company' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Company Name</label>
                <input type="text" placeholder="e.g. Infosys" value={formData.companyName} onChange={e => handleInputChange('companyName', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-500" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Job Role</label>
                <input type="text" placeholder="e.g. Business Analyst Intern" value={formData.jobRole} onChange={e => handleInputChange('jobRole', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-500" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">SIP Location</label>
                <input type="text" placeholder="City where you'll intern" value={formData.sipLocation} onChange={e => handleInputChange('sipLocation', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-500" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Stipend (INR)</label>
                <input type="number" placeholder="Monthly amount" value={formData.stipend} onChange={e => handleInputChange('stipend', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-500" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Placement Type</label>
                <select value={formData.type} onChange={e => handleInputChange('type', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium">
                  <option value="ON_CAMPUS">On Campus</option>
                  <option value="OFF_CAMPUS">Off Campus</option>
                </select>
              </div>
              {formData.type === 'OFF_CAMPUS' && (
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Off-Campus Type</label>
                  <select value={formData.corporateType} onChange={e => handleInputChange('corporateType', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium">
                    <option value="">Select Type</option>
                    <option value="CORPORATE">Corporate</option>
                    <option value="FAMILY_BUSINESS">Family Business</option>
                    <option value="ENTREPRENEURSHIP">Entrepreneurship</option>
                    <option value="SOCIAL_INTERNSHIP">Social Internship</option>
                    <option value="GOVT_PROJECTS">Govt. Projects</option>
                  </select>
                </div>
              )}
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Joining Date</label>
                <input type="date" value={formData.joinDate} onChange={e => handleInputChange('joinDate', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">NOC Date</label>
                <input type="date" value={formData.nocDate} onChange={e => handleInputChange('nocDate', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Completion Date</label>
                <input type="date" value={formData.completionDate} onChange={e => handleInputChange('completionDate', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Duration (weeks)</label>
                <input type="number" placeholder="e.g. 8" value={formData.durationWeeks} onChange={e => handleInputChange('durationWeeks', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-500" />
              </div>
            </div>
          )}

          {activeTab === 'supervisor' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Supervisor Name</label>
                <input type="text" placeholder="Your industry supervisor" value={formData.supervisorName} onChange={e => handleInputChange('supervisorName', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-500" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Supervisor Phone</label>
                <input type="tel" placeholder="10-digit number" value={formData.supervisorPhone} onChange={e => handleInputChange('supervisorPhone', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-500" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Supervisor Email</label>
                <input type="email" placeholder="supervisor@company.com" value={formData.supervisorEmail} onChange={e => handleInputChange('supervisorEmail', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-500" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">HR Head Name</label>
                <input type="text" placeholder="HR contact person" value={formData.hrHeadName} onChange={e => handleInputChange('hrHeadName', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-500" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">HR Phone</label>
                <input type="tel" placeholder="10-digit number" value={formData.hrPhone} onChange={e => handleInputChange('hrPhone', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-500" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">HR Email</label>
                <input type="email" placeholder="hr@company.com" value={formData.hrEmail} onChange={e => handleInputChange('hrEmail', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Office Address</label>
                <textarea placeholder="Full office address" value={formData.officeAddress} onChange={e => handleInputChange('officeAddress', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-500" rows={3} />
              </div>
            </div>
          )}

          {activeTab === 'project' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Project Title</label>
                <input type="text" placeholder="Title of your internship project" value={formData.projectTitle} onChange={e => handleInputChange('projectTitle', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-500" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Faculty Mentor Name</label>
                <input type="text" placeholder="Assigned faculty mentor" value={formData.facultyMentorName} onChange={e => handleInputChange('facultyMentorName', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-500" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">SIP End Date</label>
                <input type="date" value={formData.sipEndDate} onChange={e => handleInputChange('sipEndDate', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium" />
              </div>
            </div>
          )}

          {activeTab === 'grading' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Faculty Grading</label>
                <input type="number" placeholder="Out of 10" step="0.01" value={formData.facultyGrading} onChange={e => handleInputChange('facultyGrading', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-500" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Supervisor Grading</label>
                <input type="number" placeholder="Out of 10" step="0.01" value={formData.supervisorGrading} onChange={e => handleInputChange('supervisorGrading', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-500" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Extension (weeks)</label>
                <input type="number" placeholder="0 if no extension" value={formData.extensionWeeks} onChange={e => handleInputChange('extensionWeeks', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-500" />
              </div>
              <div className="col-span-1 flex items-end pb-2">
                <label className="flex items-center font-semibold text-gray-900">
                  <input type="checkbox" checked={formData.ppOffered} onChange={e => handleInputChange('ppOffered', e.target.checked)} className="mr-3 w-4 h-4" />
                  PPO Offered
                </label>
              </div>
              {formData.ppOffered && (
                <>
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">PPO Compensation (LPA)</label>
                    <input type="number" placeholder="Annual CTC in Lakhs" step="0.01" value={formData.ppoCompensation} onChange={e => handleInputChange('ppoCompensation', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-500" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">PPO Position</label>
                    <input type="text" placeholder="Offered role" value={formData.ppoPosition} onChange={e => handleInputChange('ppoPosition', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-500" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">PPO Location</label>
                    <input type="text" placeholder="Where you'll be posted" value={formData.ppoLocation} onChange={e => handleInputChange('ppoLocation', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium placeholder-gray-500" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">NOC Issue Date (Extension/PPO)</label>
                    <input type="date" value={formData.nocIssueDateExtension} onChange={e => handleInputChange('nocIssueDateExtension', e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900 font-medium" />
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            sip ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-900 font-bold mb-3 text-base">Certificate (PDF)</label>
                  <input type="file" accept=".pdf" onChange={e => handleCertificateUpload(e.target.files?.[0])} disabled={uploadingCertificate} className="border-2 border-gray-300 rounded px-4 py-2 text-gray-900" />
                  {sip?.certificateIssued && <a href={sip.certificateIssued} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline font-bold mt-3 block hover:text-blue-900">View Certificate</a>}
                </div>
                <div>
                  <label className="block text-gray-900 font-bold mb-3 text-base">Faculty Feedback Form (PDF)</label>
                  <input type="file" accept=".pdf" onChange={e => handleFeedbackUpload(e.target.files?.[0], 'faculty')} disabled={uploadingFaculty} className="border-2 border-gray-300 rounded px-4 py-2 text-gray-900" />
                  {sip?.facultyFeedback && <a href={sip.facultyFeedback} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline font-bold mt-3 block hover:text-blue-900">View Faculty Feedback</a>}
                </div>
                <div>
                  <label className="block text-gray-900 font-bold mb-3 text-base">Supervisor Feedback Form (PDF)</label>
                  <input type="file" accept=".pdf" onChange={e => handleFeedbackUpload(e.target.files?.[0], 'supervisor')} disabled={uploadingSupervisor} className="border-2 border-gray-300 rounded px-4 py-2 text-gray-900" />
                  {sip?.supervisorFeedback && <a href={sip.supervisorFeedback} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline font-bold mt-3 block hover:text-blue-900">View Supervisor Feedback</a>}
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 text-center">
                <p className="text-yellow-900 font-bold text-lg mb-2">Save your SIP first</p>
                <p className="text-yellow-800">
                  Fill in at least Student Name and Company Name on the Personal/Company tabs,
                  then click <span className="font-semibold">Save</span>. Document uploads will
                  unlock once your SIP record is created.
                </p>
              </div>
            )
          )}

          {activeTab === 'weekly' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                <p className="text-blue-900 font-bold text-base mb-4">Submit Your Weekly Status Update</p>
                <textarea
                  placeholder="Describe your work this week..."
                  value={currentWeekStatus}
                  onChange={e => setCurrentWeekStatus(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded px-4 py-3 text-gray-900 font-medium placeholder-gray-600"
                  rows={5}
                />
                <button
                  onClick={handleSubmitWeeklyUpdate}
                  disabled={submittingWeekly}
                  className="mt-4 bg-blue-700 text-white px-6 py-3 rounded font-bold hover:bg-blue-800 disabled:opacity-50 text-base"
                >
                  {submittingWeekly ? 'Submitting...' : 'Submit Weekly Update'}
                </button>
              </div>

              {weeklyUpdates.length > 0 && (
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Previous Updates</h4>
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

              {weeklyUpdates.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded border-2 border-gray-300">
                  <p className="text-gray-700 font-semibold">No weekly updates submitted yet</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 flex gap-3">
            <button onClick={handleSave} disabled={saving} className="bg-blue-700 text-white px-6 py-3 rounded font-bold hover:bg-blue-800 disabled:opacity-50 text-base">
              {saving ? 'Saving...' : sip ? 'Update' : 'Save'}
            </button>
            <p className="text-gray-600 font-semibold text-base self-center">You can save your progress at any time and come back to edit later</p>
          </div>
              </div>
            </>
          )}
        </div>

        {/* Weekly Updates Summary Section */}
        {sip && weeklyUpdates.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-700">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Weekly Updates Summary ({weeklyUpdates.length})</h2>
            <div className="space-y-3">
              {weeklyUpdates.map((update, idx) => (
                <div key={update.id || idx} className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-gray-900 font-bold text-base">
                        Week of {calculateWeekDisplay(update.weekStartDate)} - {calculateWeekDisplay(update.weekEndDate)}
                      </p>
                    </div>
                    <span className="bg-purple-200 text-purple-900 px-3 py-1 rounded text-sm font-bold">Submitted</span>
                  </div>
                  <p className="text-gray-700 text-sm font-medium">{update.statusText.substring(0, 150)}{update.statusText.length > 150 ? '...' : ''}</p>
                  {update.submittedAt && (
                    <p className="text-gray-600 text-xs mt-2 font-semibold">
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
