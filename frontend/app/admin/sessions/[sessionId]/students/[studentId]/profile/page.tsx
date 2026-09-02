'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FiArrowLeft, FiMail, FiCalendar, FiUser, FiCheckCircle, FiList, FiBarChart2, FiDownload, FiX, FiShare2, FiCopy, FiExternalLink } from 'react-icons/fi';
import QRCode from 'qrcode';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import DashboardLayout from '@/app/components/DashboardLayout';
import AssessmentGraphs from '@/app/admin/components/AssessmentGraphs';
import StudentCertificates from '@/app/components/Certificates/StudentCertificates';

interface StudentInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
}

interface Assessment {
  id: string;
  title: string;
  totalPoints: number;
  createdAt: string;
}

interface Submission {
  id: string;
  assessmentId: string;
  totalScore?: number; // Changed from score to totalScore to match backend
  status: string;
  createdAt: string;
  Assessment?: Assessment;
}

interface StudentSession {
  id: string;
  Student: StudentInfo;
  enrollmentDate: string;
  status: string;
}

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

export default function StudentProfilePage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const sessionId = params.sessionId as string;
  const studentSessionId = params.studentId as string;

  const [studentSession, setStudentSession] = useState<StudentSession | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<StudentProfileData | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareQrDataUrl, setShareQrDataUrl] = useState<string>('');

  // Shareable links state
  type ShareLink = {
    id: string;
    token: string;
    url: string;
    label: string | null;
    sections: string[] | null; // null == all
    status: 'ACTIVE' | 'REVOKED';
    expiresAt: string | null;
    createdAt: string;
    createdBy: { id: string; name: string; email: string } | string;
  };
  const SHARE_SECTIONS: { key: string; label: string; help?: string }[] = [
    { key: 'contact', label: 'Contact (email & phone)' },
    { key: 'aboutCareer', label: 'About & Career Objective' },
    { key: 'skillsInterests', label: 'Skills & Interests' },
    { key: 'workExperience', label: 'Work Experience' },
    { key: 'projects', label: 'Projects' },
    { key: 'achievements', label: 'Achievements' },
    { key: 'certifications', label: 'Certifications' },
    { key: 'responsibilities', label: 'Positions of Responsibility' },
    { key: 'onlinePresence', label: 'Online Presence (LinkedIn, GitHub, etc.)' },
    { key: 'additionalInfo', label: 'Languages, Hobbies, Strengths' },
    { key: 'documents', label: 'Documents (Resume & Certificates)' },
    { key: 'assessmentReport', label: 'Assessment Report (scores & grades)' },
  ];
  const [shareSections, setShareSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SHARE_SECTIONS.map((s) => [s.key, true])),
  );
  const [shareLabel, setShareLabel] = useState('');
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [creatingShare, setCreatingShare] = useState(false);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [selectedSections, setSelectedSections] = useState({
    personalInfo: true,
    aboutCareer: true,
    skills: true,
    workExperience: true,
    achievements: true,
    onlineProfiles: true,
    additionalInfo: true,
    documents: true,
    assessments: true,
  });

  // Redirect if not admin or placement coordinator
  useEffect(() => {
    // Mentors, HOD, and admin can all view a mentee's profile.
    const allowed = ['ADMIN', 'HOD', 'PLACEMENT_COORDINATOR', 'FACULTY', 'CHAIR_HEAD', 'MENTOR', 'COORDINATOR'];
    if (user && !allowed.includes(user.role)) {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch student session details - need to get from query with pagination
        let foundStudent = null;
        const page = 1;
        const limit = 10000;

        // Try to fetch all students (with pagination if needed)
        try {
          const studentResponse = await apiClient.get(
            `/sessions/${sessionId}/students?limit=${limit}`
          );
          foundStudent = studentResponse.data.students.find(
            (s: { studentSessionId: string }) => s.studentSessionId === studentSessionId
          );

          if (foundStudent) {
            setStudentSession(foundStudent);
          } else {
            console.warn(`Student session ${studentSessionId} not found in session ${sessionId}`);
          }
        } catch (err) {
          console.error('[Admin Profile] Error fetching student session:', err);
          toast.error('Failed to load student session');
        }

        // Fetch all assessments for this session - check if sessionId query param is needed
        try {
          const assessmentsResponse = await apiClient.get(`/assessments`, {
            params: { academicSessionId: sessionId },
          });
          setAssessments(assessmentsResponse.data.assessments || []);
        } catch (err) {
          console.error('Error fetching assessments:', err);
          // If that fails, try with sessionId parameter
          try {
            const assessmentsResponse = await apiClient.get(`/assessments`, {
              params: { sessionId },
            });
            setAssessments(assessmentsResponse.data.assessments || []);
          } catch (err2) {
            console.error('Error fetching assessments (fallback):', err2);
            setAssessments([]);
          }
        }

        // Fetch submissions for this student
        try {
          const submissionsResponse = await apiClient.get(`/assessments/submissions`, {
            params: {
              studentSessionId,
            },
          });
          console.log('[Admin Profile] Submissions response:', submissionsResponse.data);
          console.log('[Admin Profile] Raw submissions:', submissionsResponse.data.submissions);
          if (submissionsResponse.data.submissions && submissionsResponse.data.submissions.length > 0) {
            submissionsResponse.data.submissions.forEach((sub: { id: string; assessmentId: string; totalScore?: number; status: string; gradedAt?: string }, idx: number) => {
              console.log(`[Admin Profile] Submission ${idx}:`, {
                id: sub.id,
                assessmentId: sub.assessmentId,
                totalScore: sub.totalScore,
                status: sub.status,
                gradedAt: sub.gradedAt,
              });
            });
          }
          setSubmissions(submissionsResponse.data.submissions || []);
        } catch (err) {
          console.error('[Admin Profile] Error fetching submissions:', err);
          setSubmissions([]);
        }

        // Fetch student profile data
        if (foundStudent?.Student?.id) {
          try {
            console.log('[Admin Profile] Fetching profile for student:', foundStudent.Student.id);
            const profileResponse = await apiClient.get(`/users/student-profile`, {
              params: { userId: foundStudent.Student.id },
            });
            console.log('[Admin Profile] Profile response:', profileResponse.data);
            console.log('[Admin Profile] Profile data:', profileResponse.data.profile);
            setProfileData(profileResponse.data.profile || null);
          } catch (err) {
            console.error('[Admin Profile] Error fetching student profile:', err);
            setProfileData(null);
          }
        } else {
          console.log('[Admin Profile] No student ID found to fetch profile');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load student profile');
      } finally {
        setLoading(false);
      }
    };

    if (sessionId && studentSessionId) {
      fetchData();
    }
  }, [sessionId, studentSessionId]);

  if (loading) {
    return (
      <DashboardLayout title="Student Profile">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading student profile...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!studentSession) {
    return (
      <DashboardLayout title="Student Profile">
        <div className="text-center py-12">
          <p className="text-gray-600">Student not found</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go Back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const student = studentSession.Student;

  // Fetch existing share links for this student and open the modal
  const openShareModal = async () => {
    setShowShareModal(true);
    setShareQrDataUrl('');
    if (!student?.id) return;
    setLoadingLinks(true);
    try {
      const res = await apiClient.get('/share-links', { params: { userId: student.id } });
      setShareLinks(res.data.links || []);
    } catch (e) {
      console.error('Failed to load share links', e);
      toast.error('Failed to load existing share links');
    } finally {
      setLoadingLinks(false);
    }
  };

  const handleCreateShareLink = async () => {
    if (!student?.id) return;
    const sections = Object.entries(shareSections).filter(([, v]) => v).map(([k]) => k);
    if (sections.length === 0) {
      const ok = confirm('No sections selected — the link will show only identity (name, photo, registration number). Continue?');
      if (!ok) return;
    }
    setCreatingShare(true);
    try {
      const res = await apiClient.post('/share-links', {
        userId: student.id,
        sections,
        label: shareLabel.trim() || null,
      });
      const link = res.data.link as ShareLink;
      setShareLinks((prev) => [link, ...prev]);
      try {
        const qr = await QRCode.toDataURL(link.url, { width: 220, margin: 1, color: { dark: '#8B1538', light: '#ffffff' } });
        setShareQrDataUrl(qr);
      } catch (qerr) { console.error('QR gen failed', qerr); }
      setShareLabel('');
      toast.success('Shareable link created');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to create link');
    } finally {
      setCreatingShare(false);
    }
  };

  const handleDeleteShareLink = async (id: string) => {
    if (!confirm('Delete this shareable link? Anyone holding it will get a "not found" page.')) return;
    try {
      await apiClient.delete(`/share-links/${id}`);
      setShareLinks((prev) => prev.filter((l) => l.id !== id));
      toast.success('Link deleted');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const copyShareUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy — select and copy manually');
    }
  };

  const fmtSections = (sections: string[] | null) => {
    if (sections == null) return 'All sections';
    if (sections.length === 0) return 'Identity only';
    const map = Object.fromEntries(SHARE_SECTIONS.map((s) => [s.key, s.label]));
    return sections.map((k) => map[k] || k).join(', ');
  };

  console.log('[Admin Profile] Data loaded:');
  console.log('  - Assessments:', assessments.length, assessments);
  console.log('  - Submissions:', submissions.length, submissions);
  
  // Track which assessments are assigned (have submissions)
  const assignedAssessmentIds = new Set(
    submissions.map((s) => s.assessmentId)
  );
  
  console.log('  - Assigned Assessment IDs:', Array.from(assignedAssessmentIds));
  
  const submittedAssessments = submissions.filter(
    (s) => s.status === 'SUBMITTED' || s.status === 'GRADED'
  );
  const avgScore =
    submittedAssessments.length > 0
      ? (submittedAssessments.reduce((sum, s) => sum + (parseFloat(String(s.totalScore ?? 0)) || 0), 0) /
        submittedAssessments.length)
      : 0;

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const QRCode = (await import('qrcode')).default;
      const doc = new jsPDF();
      
      let yPosition = 20;
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;
      const bottomMargin = 25; // Space for footer

      // Build student name (exclude lastName if null/blank)
      const studentFullName = student?.lastName && student.lastName.trim() 
        ? `${student.firstName} ${student.lastName}` 
        : student?.firstName || 'Student';
      
      const studentFileName = student?.lastName && student.lastName.trim()
        ? `${student.firstName}_${student.lastName}`
        : student?.firstName || 'Student';

      // Helper function to convert image URL to base64
      const getImageDataUrl = async (url: string): Promise<string | null> => {
        try {
          const response = await fetch(url, { mode: 'cors' });
          if (!response.ok) {
            console.warn(`Failed to fetch image: ${response.status}`);
            return null;
          }
          const blob = await response.blob();
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.warn('Image loading skipped (CORS or network issue):', error);
          return null;
        }
      };

      // Helper to check if we need a new page
      const checkPageBreak = (spaceNeeded: number = 15) => {
        if (yPosition + spaceNeeded > pageHeight - bottomMargin) {
          doc.addPage();
          yPosition = 20;
          return true;
        }
        return false;
      };

      // Enhanced Header with gradient-like effect
      doc.setFillColor(59, 130, 246); // Blue to match web
      doc.rect(0, 0, pageWidth, 45, 'F');
      
      // Add profile image if available
      if (student?.profileImage) {
        try {
          const imageData = await getImageDataUrl(student.profileImage);
          if (imageData) {
            // Add circular image (or rounded square)
            doc.addImage(imageData, 'JPEG', pageWidth - margin - 22, 10, 20, 20);
          }
        } catch (error) {
          console.error('Error adding profile image to PDF:', error);
        }
      }
      
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(studentFullName, margin, 22);
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Student Profile Report`, margin, 32);
      
      doc.setFontSize(9);
      doc.text(`Email: ${student?.email}`, margin, 40);
      
      yPosition = 55;
      doc.setTextColor(0, 0, 0);

      // Helper function to add section with styled header (supports async content)
      const addSection = async (title: string, color: number[], content: () => void | Promise<void>) => {
        checkPageBreak(20);
        
        // Section header with subtle colored background
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(margin, yPosition, contentWidth, 8, 1, 1, 'F');
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(title, margin + 3, yPosition + 5.5);
        yPosition += 13;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        await content();
        yPosition += 8;
      };

      // Helper to add text with wrapping
      const addText = (label: string, value: string) => {
        if (!value || value === '—' || value === 'Not provided') return;
        checkPageBreak(12);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(75, 85, 99); // Gray-600
        doc.text(`${label}:`, margin + 3, yPosition);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(17, 24, 39); // Gray-900
        const lines = doc.splitTextToSize(value, contentWidth - 55);
        doc.text(lines, margin + 52, yPosition);
        yPosition += 6 + (lines.length > 1 ? (lines.length - 1) * 5 : 0);
      };

      // Helper to add array items with bullets
      const addArray = (label: string, items: string[]) => {
        if (!items || items.length === 0) return;
        checkPageBreak(12);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(75, 85, 99);
        doc.text(`${label}:`, margin + 3, yPosition);
        yPosition += 6;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(17, 24, 39);
        items.forEach(item => {
          checkPageBreak(8);
          doc.setFillColor(59, 130, 246);
          doc.circle(margin + 7, yPosition - 1.5, 1, 'F');
          const itemLines = doc.splitTextToSize(item, contentWidth - 20);
          doc.text(itemLines, margin + 12, yPosition);
          yPosition += 5 + (itemLines.length > 1 ? (itemLines.length - 1) * 5 : 0);
        });
        yPosition += 3;
      };

      if (profileData) {
        // Personal Information - Blue (matches web)
        if (selectedSections.personalInfo) {
          await addSection('Personal Information', [59, 130, 246], () => {
            addText('Father\'s Name', profileData.fatherName);
            addText('Father\'s Occupation', profileData.fatherOccupation);
            addText('Mother\'s Name', profileData.motherName);
            addText('Mother\'s Occupation', profileData.motherOccupation);
            addText('Guardian Phone', profileData.guardianPhone);
            addText('Residential Status', profileData.residentialStatus?.replace('_', ' '));
          });
        }

        // About & Career - Purple (matches web)
        if (selectedSections.aboutCareer) {
          await addSection('About & Career Objective', [139, 92, 246], () => {
            addText('About Me', profileData.aboutMe);
            addText('Career Objective', profileData.careerObjective);
          });
        }

        // Skills & Expertise - Green (matches web)
        if (selectedSections.skills) {
          await addSection('Skills & Expertise', [16, 185, 129], () => {
            addArray('Technical Skills', profileData.skills || []);
            addArray('Interests', profileData.interests || []);
            addText('Co-Scholastic Expertise', profileData.coScholasticExpertise);
          });
        }

        // Work Experience - Orange (matches web)
        if (selectedSections.workExperience && profileData.hasWorkExperience && profileData.workExperiences?.length > 0) {
          await addSection('Work Experience', [249, 115, 22], () => {
            profileData.workExperiences.forEach((exp: { organization: string; role: string; duration: string; description?: string }, index: number) => {
              checkPageBreak(25);
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(9);
              doc.setTextColor(75, 85, 99);
              doc.text(`${index + 1}. ${exp.organization} - ${exp.role}`, margin + 3, yPosition);
              yPosition += 6;
              
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(17, 24, 39);
              doc.text(`Duration: ${exp.duration}`, margin + 8, yPosition);
              yPosition += 5;
              
              if (exp.description) {
                const lines = doc.splitTextToSize(exp.description, contentWidth - 15);
                doc.text(lines, margin + 8, yPosition);
                yPosition += 5 * lines.length + 3;
              }
              yPosition += 3;
            });
          });
        }

        // Achievements & Activities - Yellow/Amber (matches web)
        if (selectedSections.achievements) {
          await addSection('Achievements & Activities', [245, 158, 11], () => {
            addArray('Achievements', profileData.achievements || []);
            addArray('Certifications', profileData.certifications || []);
            addArray('Projects', profileData.projects || []);
            addArray('Positions of Responsibility', profileData.positionsOfResponsibility || []);
          });
        }

        // Online Profiles - Cyan (matches web)
        if (selectedSections.onlineProfiles) {
          await addSection('Online Profiles', [6, 182, 212], () => {
            addText('LinkedIn', profileData.linkedin);
            addText('GitHub', profileData.github);
            addText('Portfolio', profileData.portfolio);
            addText('Coursera', profileData.coursera);
          });
        }

        // Additional Information - Teal (matches web)
        if (selectedSections.additionalInfo) {
          await addSection('Additional Information', [20, 184, 166], () => {
            addArray('Languages Known', profileData.languagesKnown || []);
            addArray('Hobbies', profileData.hobbies || []);
            addArray('Strengths', profileData.strengths || []);
            addArray('Areas of Improvement', profileData.areasOfImprovement || []);
          });
        }

        // Documents Section with Table and QR Codes - Indigo (matches web)
        if (selectedSections.documents) {
          const hasResume = profileData.resume;
          const hasCertificates = profileData.certificateDocuments && profileData.certificateDocuments.length > 0;
          
          if (hasResume || hasCertificates) {
            await addSection('Documents', [99, 102, 241], async () => {
              const rowHeight = 30;
              const colWidths = [70, 35, 28, 22];
              const tableWidth = colWidths.reduce((a, b) => a + b, 0);
              
              checkPageBreak(rowHeight + 15);
              
              // Table Header
              doc.setFillColor(243, 244, 246); // Light gray
              doc.roundedRect(margin + 3, yPosition, tableWidth, 7, 1, 1, 'F');
              doc.setFontSize(8);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(55, 65, 81); // Gray-700
              doc.text('Document Name', margin + 5, yPosition + 5);
              doc.text('Date', margin + 5 + colWidths[0], yPosition + 5);
              doc.text('Type', margin + 5 + colWidths[0] + colWidths[1], yPosition + 5);
              doc.text('QR', margin + 5 + colWidths[0] + colWidths[1] + colWidths[2], yPosition + 5);
              yPosition += 9;
              
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(8);
              
              // Add Resume
              if (hasResume) {
                checkPageBreak(rowHeight + 5);
                
                // Draw row background and border
                doc.setFillColor(249, 250, 251); // Very light gray
                doc.roundedRect(margin + 3, yPosition, tableWidth, rowHeight, 1, 1, 'F');
                doc.setDrawColor(229, 231, 235); // Gray-200
                doc.roundedRect(margin + 3, yPosition, tableWidth, rowHeight, 1, 1, 'S');
                
                // Document Name
                doc.setTextColor(17, 24, 39); // Gray-900
                doc.text('Resume', margin + 5, yPosition + 7);
                
                // Upload Date
                doc.setTextColor(107, 114, 128); // Gray-500
                doc.text('—', margin + 5 + colWidths[0], yPosition + 7);
                
                // Type
                doc.text('Resume', margin + 5 + colWidths[0] + colWidths[1], yPosition + 7);
                
                // Generate QR Code
                try {
                  const qrDataUrl = await QRCode.toDataURL(profileData.resume, {
                    width: 70,
                    margin: 0,
                  });
                  doc.addImage(qrDataUrl, 'PNG', margin + 8 + colWidths[0] + colWidths[1] + colWidths[2], yPosition + 3, 18, 18);
                } catch (err) {
                  console.error('Error generating QR code:', err);
                  doc.setTextColor(107, 114, 128);
                  doc.text('N/A', margin + 8 + colWidths[0] + colWidths[1] + colWidths[2], yPosition + 7);
                }
                
                // Add link text (smaller, below)
                doc.setFontSize(6);
                doc.setTextColor(59, 130, 246); // Blue
                const linkText = profileData.resume.length > 50 ? profileData.resume.substring(0, 50) + '...' : profileData.resume;
                doc.text(linkText, margin + 5, yPosition + 25);
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(8);
                
                yPosition += rowHeight + 3;
              }
              
              // Add Certificates
              if (hasCertificates) {
                for (const certDoc of profileData.certificateDocuments) {
                  checkPageBreak(rowHeight + 5);
                  
                  // Draw row background and border
                  doc.setFillColor(249, 250, 251);
                  doc.roundedRect(margin + 3, yPosition, tableWidth, rowHeight, 1, 1, 'F');
                  doc.setDrawColor(229, 231, 235);
                  doc.roundedRect(margin + 3, yPosition, tableWidth, rowHeight, 1, 1, 'S');
                  
                  // Document Name
                  doc.setTextColor(17, 24, 39);
                  const docName = certDoc.name.length > 30 ? certDoc.name.substring(0, 30) + '...' : certDoc.name;
                  doc.text(docName, margin + 5, yPosition + 7);
                  
                  // Upload Date
                  doc.setTextColor(107, 114, 128);
                  const uploadDate = new Date(certDoc.uploadedAt).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: '2-digit' 
                  });
                  doc.text(uploadDate, margin + 5 + colWidths[0], yPosition + 7);
                  
                  // Type
                  doc.text('Cert', margin + 5 + colWidths[0] + colWidths[1], yPosition + 7);
                  
                  // Generate QR Code
                  try {
                    const qrDataUrl = await QRCode.toDataURL(certDoc.url, {
                      width: 70,
                      margin: 0,
                    });
                    doc.addImage(qrDataUrl, 'PNG', margin + 8 + colWidths[0] + colWidths[1] + colWidths[2], yPosition + 3, 18, 18);
                  } catch (err) {
                    console.error('Error generating QR code:', err);
                    doc.setTextColor(107, 114, 128);
                    doc.text('N/A', margin + 8 + colWidths[0] + colWidths[1] + colWidths[2], yPosition + 7);
                  }
                  
                  // Add link text
                  doc.setFontSize(6);
                  doc.setTextColor(59, 130, 246);
                  const linkText = certDoc.url.length > 50 ? certDoc.url.substring(0, 50) + '...' : certDoc.url;
                  doc.text(linkText, margin + 5, yPosition + 25);
                  doc.setTextColor(0, 0, 0);
                  doc.setFontSize(8);
                  
                  yPosition += rowHeight + 3;
                }
              }
            });
          }
        }
      }

      // Assessments - Pink/Rose (matches web)
      if (selectedSections.assessments && assessments.length > 0) {
        await addSection('Assessment Summary', [236, 72, 153], () => {
          addText('Total Assessments', assessments.length.toString());
          addText('Completed', submittedAssessments.length.toString());
          addText('Average Score', `${avgScore.toFixed(1)}%`);
        });

        checkPageBreak(30);

        // Assessment Details with improved cards
        assessments.forEach((assessment, index) => {
          const submission = submissions.find((s) => s.assessmentId === assessment.id);
          const submissionScore = submission ? parseFloat(String(submission.totalScore ?? 0)) : 0;
          const percentage = assessment.totalPoints > 0 && submissionScore > 0
            ? Math.round((submissionScore / assessment.totalPoints) * 100)
            : 0;

          checkPageBreak(32);

          // Draw assessment card with subtle background
          doc.setFillColor(248, 250, 252); // Gray-50
          doc.roundedRect(margin + 3, yPosition, contentWidth - 6, 26, 2, 2, 'F');
          doc.setDrawColor(226, 232, 240); // Gray-300
          doc.roundedRect(margin + 3, yPosition, contentWidth - 6, 26, 2, 2, 'S');

          yPosition += 5;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(30, 41, 59); // Gray-800
          
          const titleText = `${index + 1}. ${assessment.title}`;
          const titleLines = doc.splitTextToSize(titleText, contentWidth - 18);
          doc.text(titleLines, margin + 6, yPosition);
          yPosition += 5 + (titleLines.length > 1 ? (titleLines.length - 1) * 5 : 0);
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105); // Gray-600
          doc.text(`Total Points: ${assessment.totalPoints}`, margin + 8, yPosition);
          doc.text(`Score: ${submission?.totalScore !== undefined ? submission.totalScore : '—'}`, margin + 65, yPosition);
          yPosition += 5;
          
          // Color-coded percentage
          if (submission?.totalScore !== undefined && assessment.totalPoints > 0) {
            if (percentage >= 70) {
              doc.setTextColor(22, 163, 74); // Green-600
            } else if (percentage >= 50) {
              doc.setTextColor(234, 179, 8); // Yellow-600
            } else {
              doc.setTextColor(220, 38, 38); // Red-600
            }
            doc.text(`Percentage: ${percentage}%`, margin + 8, yPosition);
          } else {
            doc.setTextColor(71, 85, 105);
            doc.text('Percentage: —', margin + 8, yPosition);
          }
          
          doc.setTextColor(71, 85, 105);
          const statusText = submission ? submission.status : 'Not submitted';
          doc.text(`Status: ${statusText}`, margin + 65, yPosition);
          yPosition += 8;
        });
      }

      // Footer with page numbers
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175); // Gray-400
        doc.text(
          `Generated on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
          margin,
          pageHeight - 10
        );
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth - margin,
          pageHeight - 10,
          { align: 'right' }
        );
      }

      // Save the PDF
      doc.save(`${studentFileName}_Profile.pdf`);
      toast.success('Profile exported successfully!');
      setShowExportModal(false);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    }
  };

  const toggleSection = (section: keyof typeof selectedSections) => {
    setSelectedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const selectAll = () => {
    setSelectedSections({
      personalInfo: true,
      aboutCareer: true,
      skills: true,
      workExperience: true,
      achievements: true,
      onlineProfiles: true,
      additionalInfo: true,
      documents: true,
      assessments: true,
    });
  };

  const deselectAll = () => {
    setSelectedSections({
      personalInfo: false,
      aboutCareer: false,
      skills: false,
      workExperience: false,
      achievements: false,
      onlineProfiles: false,
      additionalInfo: false,
      documents: false,
      assessments: false,
    });
  };

  return (
    <DashboardLayout title={`${student?.firstName} ${student?.lastName} - Profile`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-200 rounded transition"
            >
              <FiArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {student?.firstName} {student?.lastName}
              </h1>
              <p className="text-gray-600 mt-1">Student Profile</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openShareModal}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#8B1538] to-[#6B0E26] text-white rounded-xl hover:from-[#6B0E26] hover:to-[#4d0a1c] transition-all shadow-lg hover:shadow-xl font-semibold"
              title="Generate a public link to this profile"
            >
              <FiShare2 className="w-5 h-5" />
              Create Shareable Link
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-semibold"
            >
              <FiDownload className="w-5 h-5" />
              Export as PDF
            </button>
          </div>
        </div>

        {/* Student Info Card */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Side - Profile Image & Basic Info */}
            <div className="flex flex-col items-center md:items-start">
              <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-3xl flex-shrink-0 overflow-hidden mb-4 shadow-lg">
                {student?.profileImage ? (
                  <img
                    src={student.profileImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : null}
                {!student?.profileImage && (
                  <span>{`${student?.firstName?.charAt(0)}${student?.lastName?.charAt(0)}`.toUpperCase()}</span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mt-4 text-center md:text-left">
                {student?.firstName} {student?.lastName}
              </h2>
              <p className="text-gray-600 mt-1 text-center md:text-left">
                {studentSession.status}
              </p>
            </div>

            {/* Right Side - Contact & Enrollment Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <FiMail className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-gray-900 font-medium">{student?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FiCalendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">Enrollment Date</p>
                  <p className="text-gray-900 font-medium">
                    {new Date(studentSession.enrollmentDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Assessment Overview */}
        {assessments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200 hover:shadow-xl transition-shadow">
              <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Assigned Assessments</p>
              <p className="text-5xl font-bold text-blue-600 mt-3">{assignedAssessmentIds.size}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200 hover:shadow-xl transition-shadow">
              <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Completed</p>
              <p className="text-5xl font-bold text-green-600 mt-3">
                {submittedAssessments.length}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200 hover:shadow-xl transition-shadow">
              <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Average Score</p>
              <p className="text-5xl font-bold text-purple-600 mt-3">
                {avgScore.toFixed(1)}%
              </p>
            </div>
          </div>
        )}

        {/* Assessment Graphs */}
        {submittedAssessments.length > 0 ? (
          <AssessmentGraphs submissions={submittedAssessments} />
        ) : assignedAssessmentIds.size > 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 border border-gray-200 text-center">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <FiBarChart2 className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 text-lg font-medium">
                No completed assessments yet
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Assessment graphs will appear once the student completes their assignments
              </p>
            </div>
          </div>
        ) : null}

        {/* Assessment Details Table */}
        {assessments.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FiList className="w-6 h-6" />
                Assessment Details
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Assessment
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Total Points
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Percentage
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {assessments.map((assessment) => {
                    const submission = submissions.find(
                      (s) => s.assessmentId === assessment.id
                    );
                    const submissionScore = submission ? parseFloat(String(submission.totalScore ?? 0)) : 0;
                    const percentage = assessment.totalPoints > 0 && submissionScore > 0
                      ? Math.round((submissionScore / assessment.totalPoints) * 100)
                      : 0;
                    const isAssigned = assignedAssessmentIds.has(assessment.id);

                    return (
                      <tr key={assessment.id} className={`hover:bg-blue-50 transition-colors ${!isAssigned ? 'bg-gray-50' : ''}`}>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          <div className="flex items-center gap-2">
                            {isAssigned && <span className="inline-block w-2 h-2 bg-green-500 rounded-full" title="Assigned" />}
                            {assessment.title}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                          {assessment.totalPoints}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                          {submission?.totalScore !== undefined ? submission.totalScore : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold">
                          {submission?.totalScore !== undefined && assessment.totalPoints > 0 ? (
                            <span className={`${percentage >= 70 ? 'text-green-600' : percentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {percentage}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {submission ? (
                            <span
                              className={`inline-flex px-4 py-1.5 rounded-full text-xs font-bold border-2 shadow-sm ${
                                submission.status === 'GRADED'
                                  ? 'bg-green-50 text-green-700 border-green-300'
                                  : 'bg-yellow-50 text-yellow-700 border-yellow-300'
                              }`}
                            >
                              {submission.status}
                            </span>
                          ) : (
                            <span className="text-gray-500 italic text-sm font-medium">Not assigned</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Student Profile Details */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <FiUser className="w-6 h-6" />
              Complete Student Profile
            </h3>
            <p className="text-blue-100 mt-1">Comprehensive information about the student</p>
          </div>
          
          {profileData ? (
            <div className="p-8 space-y-10">
              {/* Personal Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <FiUser className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">Personal Information</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Father&apos;s Name</p>
                    <p className="text-gray-900 font-medium text-lg">{profileData.fatherName || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Father&apos;s Occupation</p>
                    <p className="text-gray-900 font-medium text-lg">{profileData.fatherOccupation || '—'}</p>
                    {profileData.fatherOccupationDescription && (
                      <p className="text-sm text-gray-600 mt-1 italic">{profileData.fatherOccupationDescription}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mother&apos;s Name</p>
                    <p className="text-gray-900 font-medium text-lg">{profileData.motherName || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mother&apos;s Occupation</p>
                    <p className="text-gray-900 font-medium text-lg">{profileData.motherOccupation || '—'}</p>
                    {profileData.motherOccupationDescription && (
                      <p className="text-sm text-gray-600 mt-1 italic">{profileData.motherOccupationDescription}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Guardian Phone</p>
                    <p className="text-gray-900 font-medium text-lg">{profileData.guardianPhone || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Residential Status</p>
                    <p className="text-gray-900 font-medium text-lg">
                      {profileData.residentialStatus ? profileData.residentialStatus.replace('_', ' ') : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* About & Career */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                    <FiUser className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">About & Career Objective</h4>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">About Me</p>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                        {profileData.aboutMe || 'Not provided'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Career Objective</p>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                        {profileData.careerObjective || 'Not provided'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills & Expertise */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                    <FiCheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">Skills & Expertise</h4>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Technical Skills</p>
                    {profileData.skills && profileData.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {profileData.skills.map((skill: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-4 py-2 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-2 border-blue-200 rounded-full text-sm font-semibold shadow-sm hover:shadow-md transition-shadow"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic text-sm">No skills added yet</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Interests</p>
                    {profileData.interests && profileData.interests.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {profileData.interests.map((interest: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-4 py-2 bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border-2 border-purple-200 rounded-full text-sm font-semibold shadow-sm hover:shadow-md transition-shadow"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic text-sm">No interests added yet</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Co-Scholastic Expertise</p>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-gray-900 font-medium">{profileData.coScholasticExpertise || 'Not provided'}</p>
                      {profileData.coScholasticDescription && (
                        <p className="text-sm text-gray-600 mt-2 italic">{profileData.coScholasticDescription}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Work Experience */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                    <FiCalendar className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">Work Experience</h4>
                </div>
                {profileData.hasWorkExperience && profileData.workExperiences && profileData.workExperiences.length > 0 ? (
                  <div className="space-y-4">
                    {profileData.workExperiences.map((exp: { organization: string; role: string; duration: string; description?: string }, idx: number) => (
                      <div key={idx} className="bg-gradient-to-r from-orange-50 to-yellow-50 p-5 rounded-xl border-2 border-orange-200 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <h5 className="font-bold text-gray-900 text-lg">{exp.organization}</h5>
                          <span className="px-3 py-1 bg-orange-600 text-white text-xs font-semibold rounded-full">
                            {exp.duration}
                          </span>
                        </div>
                        <p className="text-sm text-orange-900 font-semibold mb-2">{exp.role}</p>
                        {exp.description && (
                          <p className="text-sm text-gray-700 leading-relaxed">{exp.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic text-sm">No work experience added yet</p>
                )}
              </div>

              {/* Achievements, Certifications, Projects */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center">
                    <FiCheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">Achievements & Activities</h4>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Achievements</p>
                    {profileData.achievements && profileData.achievements.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {profileData.achievements.map((achievement: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-100 text-green-700 border-2 border-green-200 rounded-full text-sm font-semibold shadow-sm hover:shadow-md transition-shadow"
                          >
                            {achievement}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic text-sm">No achievements added yet</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Certifications</p>
                    {profileData.certifications && profileData.certifications.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {profileData.certifications.map((cert: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-4 py-2 bg-gradient-to-r from-yellow-50 to-amber-100 text-yellow-700 border-2 border-yellow-200 rounded-full text-sm font-semibold shadow-sm hover:shadow-md transition-shadow"
                          >
                            {cert}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic text-sm">No certifications added yet</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Projects</p>
                    {profileData.projects && profileData.projects.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {profileData.projects.map((project: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-4 py-2 bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-700 border-2 border-indigo-200 rounded-full text-sm font-semibold shadow-sm hover:shadow-md transition-shadow"
                          >
                            {project}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic text-sm">No projects added yet</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Positions of Responsibility</p>
                    {profileData.positionsOfResponsibility && profileData.positionsOfResponsibility.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {profileData.positionsOfResponsibility.map((position: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-4 py-2 bg-gradient-to-r from-pink-50 to-pink-100 text-pink-700 border-2 border-pink-200 rounded-full text-sm font-semibold shadow-sm hover:shadow-md transition-shadow"
                          >
                            {position}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic text-sm">No positions added yet</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Online Profiles */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
                    <FiList className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">Online Profiles</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">LinkedIn</p>
                    {profileData.linkedin ? (
                      <a
                        href={profileData.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm break-all hover:underline inline-flex items-center gap-2"
                      >
                        <span>{profileData.linkedin}</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ) : (
                      <p className="text-gray-500 italic text-sm">Not provided</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">GitHub</p>
                    {profileData.github ? (
                      <a
                        href={profileData.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm break-all hover:underline inline-flex items-center gap-2"
                      >
                        <span>{profileData.github}</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ) : (
                      <p className="text-gray-500 italic text-sm">Not provided</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Portfolio</p>
                    {profileData.portfolio ? (
                      <a
                        href={profileData.portfolio}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm break-all hover:underline inline-flex items-center gap-2"
                      >
                        <span>{profileData.portfolio}</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ) : (
                      <p className="text-gray-500 italic text-sm">Not provided</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Coursera</p>
                    {profileData.coursera ? (
                      <a
                        href={profileData.coursera}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm break-all hover:underline inline-flex items-center gap-2"
                      >
                        <span>{profileData.coursera}</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ) : (
                      <p className="text-gray-500 italic text-sm">Not provided</p>
                    )}
                  </div>
                  {profileData.otherLinks && profileData.otherLinks.length > 0 && (
                    <div className="md:col-span-2 space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Other Links</p>
                      <div className="space-y-2">
                        {profileData.otherLinks.map((link: string, idx: number) => (
                          <a
                            key={idx}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm break-all hover:underline inline-flex items-center gap-2 block"
                          >
                            <span>{link}</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                    <FiList className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">Additional Information</h4>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Languages Known</p>
                    {profileData.languagesKnown && profileData.languagesKnown.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {profileData.languagesKnown.map((lang: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-4 py-2 bg-gradient-to-r from-teal-50 to-teal-100 text-teal-700 border-2 border-teal-200 rounded-full text-sm font-semibold shadow-sm hover:shadow-md transition-shadow"
                          >
                            {lang}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic text-sm">No languages added yet</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hobbies</p>
                    {profileData.hobbies && profileData.hobbies.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {profileData.hobbies.map((hobby: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-4 py-2 bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 border-2 border-orange-200 rounded-full text-sm font-semibold shadow-sm hover:shadow-md transition-shadow"
                          >
                            {hobby}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic text-sm">No hobbies added yet</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Strengths</p>
                    {profileData.strengths && profileData.strengths.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {profileData.strengths.map((strength: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-4 py-2 bg-gradient-to-r from-green-50 to-green-100 text-green-700 border-2 border-green-200 rounded-full text-sm font-semibold shadow-sm hover:shadow-md transition-shadow"
                          >
                            {strength}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic text-sm">No strengths added yet</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Areas of Improvement</p>
                    {profileData.areasOfImprovement && profileData.areasOfImprovement.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {profileData.areasOfImprovement.map((area: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-4 py-2 bg-gradient-to-r from-red-50 to-red-100 text-red-700 border-2 border-red-200 rounded-full text-sm font-semibold shadow-sm hover:shadow-md transition-shadow"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic text-sm">No areas added yet</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">Documents</h4>
                </div>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Resume</p>
                    {profileData.resume ? (
                      <a
                        href={profileData.resume}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg font-semibold"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download Resume
                      </a>
                    ) : (
                      <p className="text-gray-500 italic text-sm">No resume uploaded yet</p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Certificates & Documents</p>
                    {profileData.certificateDocuments && profileData.certificateDocuments.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {profileData.certificateDocuments.map((doc: { id: string; name: string; url: string; uploadedAt: string }) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200 hover:shadow-lg transition-shadow"
                          >
                            <div className="flex-1 min-w-0 mr-3">
                              <p className="text-sm font-bold text-gray-900 truncate">{doc.name}</p>
                              <p className="text-xs text-gray-600 mt-1">
                                Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                              View
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic text-sm">No certificates uploaded yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-gray-600 text-lg">No profile data available for this student.</p>
            </div>
          )}

          {/* Earned Certificates — issued via the Certifications feature */}
          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h4 className="text-xl font-bold text-gray-900 mb-4">Earned Certificates</h4>
            <StudentCertificates studentId={student.id} />
          </div>
        </div>

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-2xl flex items-center justify-between sticky top-0">
                <div>
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <FiDownload className="w-6 h-6" />
                    Export Profile as PDF
                  </h3>
                  <p className="text-blue-100 mt-1">Select the sections you want to include</p>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition"
                >
                  <FiX className="w-6 h-6 text-white" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                {/* Quick Actions */}
                <div className="flex gap-3 pb-4 border-b border-gray-200">
                  <button
                    onClick={selectAll}
                    className="flex-1 px-4 py-2 bg-blue-50 text-blue-700 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition font-semibold"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAll}
                    className="flex-1 px-4 py-2 bg-gray-50 text-gray-700 border-2 border-gray-200 rounded-lg hover:bg-gray-100 transition font-semibold"
                  >
                    Deselect All
                  </button>
                </div>

                {/* Section Checkboxes */}
                <div className="space-y-3">
                  {[
                    { key: 'personalInfo', label: 'Personal Information', icon: '👤' },
                    { key: 'aboutCareer', label: 'About & Career Objective', icon: '📝' },
                    { key: 'skills', label: 'Skills & Expertise', icon: '⚡' },
                    { key: 'workExperience', label: 'Work Experience', icon: '💼' },
                    { key: 'achievements', label: 'Achievements & Activities', icon: '🏆' },
                    { key: 'onlineProfiles', label: 'Online Profiles', icon: '🔗' },
                    { key: 'additionalInfo', label: 'Additional Information', icon: 'ℹ️' },
                    { key: 'documents', label: 'Documents', icon: '📄' },
                    { key: 'assessments', label: 'Assessment Summary', icon: '📊' },
                  ].map((section) => (
                    <label
                      key={section.key}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedSections[section.key as keyof typeof selectedSections]
                          ? 'bg-blue-50 border-blue-300 shadow-md'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSections[section.key as keyof typeof selectedSections]}
                        onChange={() => toggleSection(section.key as keyof typeof selectedSections)}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-2xl">{section.icon}</span>
                      <span className="font-semibold text-gray-900">{section.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 p-6 rounded-b-2xl flex gap-3 border-t border-gray-200">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 px-6 py-3 bg-white text-gray-700 border-2 border-gray-300 rounded-xl hover:bg-gray-100 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExportPDF}
                  disabled={!Object.values(selectedSections).some(v => v)}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FiDownload className="w-5 h-5" />
                  Export Selected Sections
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Shareable Link Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-[#8B1538] to-[#6B0E26] text-white px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Shareable Public Profile Links</h2>
                  <p className="text-sm opacity-90 mt-0.5">Anyone with a link can view {student?.firstName}&apos;s profile — but only the sections you opt into per link.</p>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="p-2 rounded hover:bg-white/20 transition"
                  aria-label="Close"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto">
                {/* === Create new link === */}
                <section className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-bold text-gray-900 mb-3">Create a new link</h3>

                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                    Label (optional)
                  </label>
                  <input
                    type="text"
                    value={shareLabel}
                    onChange={(e) => setShareLabel(e.target.value)}
                    placeholder='e.g. "For Acme Corp recruiter"'
                    maxLength={120}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8B1538] mb-4"
                  />

                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                    What to share
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                    {SHARE_SECTIONS.map((s) => (
                      <label key={s.key} className="flex items-start gap-2 p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!shareSections[s.key]}
                          onChange={(e) => setShareSections((prev) => ({ ...prev, [s.key]: e.target.checked }))}
                          className="mt-0.5 w-4 h-4 accent-[#8B1538]"
                        />
                        <span className="text-sm text-gray-800">{s.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setShareSections(Object.fromEntries(SHARE_SECTIONS.map((s) => [s.key, true])))}
                      className="text-xs text-[#8B1538] hover:underline"
                    >
                      Select all
                    </button>
                    <span className="text-gray-400">·</span>
                    <button
                      type="button"
                      onClick={() => setShareSections(Object.fromEntries(SHARE_SECTIONS.map((s) => [s.key, false])))}
                      className="text-xs text-[#8B1538] hover:underline"
                    >
                      Clear all
                    </button>
                    <span className="text-xs text-gray-500 ml-auto">Identity (name, photo, reg no, department) is always shown.</span>
                  </div>

                  <button
                    onClick={handleCreateShareLink}
                    disabled={creatingShare}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#8B1538] hover:bg-[#6B0E26] disabled:bg-gray-400 text-white font-semibold rounded-lg transition"
                  >
                    <FiShare2 className="w-4 h-4" />
                    {creatingShare ? 'Creating…' : 'Create Link'}
                  </button>

                  {shareQrDataUrl && (
                    <div className="mt-5 pt-5 border-t border-gray-200 flex flex-col items-center">
                      <p className="text-xs text-gray-600 mb-2 uppercase tracking-wide font-semibold">Latest link QR</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={shareQrDataUrl} alt="QR" className="border border-gray-200 rounded-lg" />
                    </div>
                  )}
                </section>

                {/* === Existing links list === */}
                <section>
                  <h3 className="font-bold text-gray-900 mb-3">
                    Existing links{' '}
                    <span className="text-sm font-normal text-gray-500">({shareLinks.length})</span>
                  </h3>

                  {loadingLinks ? (
                    <p className="text-sm text-gray-500">Loading…</p>
                  ) : shareLinks.length === 0 ? (
                    <p className="text-sm text-gray-500 italic border border-dashed border-gray-300 rounded p-4 text-center">
                      No share links yet. Create one above.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {shareLinks.map((l) => (
                        <li key={l.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex-1 min-w-0">
                              {l.label && (
                                <p className="text-sm font-semibold text-gray-900">{l.label}</p>
                              )}
                              <a
                                href={l.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-[#8B1538] hover:underline font-mono break-all inline-flex items-center gap-1"
                              >
                                {l.url}
                                <FiExternalLink className="w-3 h-3 flex-shrink-0" />
                              </a>
                              <p className="text-xs text-gray-600 mt-1">
                                <span className="font-semibold">Shares:</span> {fmtSections(l.sections)}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Created {new Date(l.createdAt).toLocaleString()}
                                {typeof l.createdBy === 'object' && l.createdBy.name && (
                                  <> by {l.createdBy.name}</>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => copyShareUrl(l.url)}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium flex items-center gap-1.5"
                                title="Copy URL"
                              >
                                <FiCopy className="w-3.5 h-3.5" /> Copy
                              </button>
                              <button
                                onClick={() => handleDeleteShareLink(l.id)}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded text-sm font-medium flex items-center gap-1.5"
                                title="Delete link"
                              >
                                <FiX className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <div className="bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-lg p-3 space-y-1">
                  <p>• Each link has its own section filter — you can make one for &quot;HR contact + skills&quot; and another with &quot;full profile&quot;.</p>
                  <p>• Pages update live — when the student edits their profile the public page reflects it.</p>
                  <p>• Deleting a link makes it return &quot;not found&quot; immediately, so it is fully revocable.</p>
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="px-5 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
