import * as XLSX from 'xlsx';

export const exportSIPToExcel = (sipData: any) => {
  // Prepare data for export
  const exportData = [
    ['SIP Details Export'],
    [],
    ['Personal Information'],
    ['Enrollment Number', sipData.enrollmentNo || 'N/A'],
    ['Student Name', sipData.studentName || 'N/A'],
    ['Specialization', sipData.specialization || 'N/A'],
    ['Gender', sipData.gender || 'N/A'],
    ['Email', sipData.email || 'N/A'],
    ['Phone Number', sipData.phoneNo || 'N/A'],
    ['Home Town Location', sipData.homeTownLocation || 'N/A'],
    [],
    ['Company Information'],
    ['Company Name', sipData.companyName || 'N/A'],
    ['Job Role', sipData.jobRole || 'N/A'],
    ['SIP Location', sipData.sipLocation || 'N/A'],
    ['Stipend', sipData.stipend || 'N/A'],
    ['Type', sipData.type || 'N/A'],
    ['Corporate Type', sipData.corporateType || 'N/A'],
    [],
    ['Dates'],
    ['Join Date', sipData.joinDate ? new Date(sipData.joinDate).toLocaleDateString() : 'N/A'],
    ['NOC Date', sipData.nocDate ? new Date(sipData.nocDate).toLocaleDateString() : 'N/A'],
    ['Completion Date', sipData.completionDate ? new Date(sipData.completionDate).toLocaleDateString() : 'N/A'],
    ['SIP End Date', sipData.sipEndDate ? new Date(sipData.sipEndDate).toLocaleDateString() : 'N/A'],
    ['NOC Issue Date Extension', sipData.nocIssueDateExtension ? new Date(sipData.nocIssueDateExtension).toLocaleDateString() : 'N/A'],
    [],
    ['Duration'],
    ['Duration (Weeks)', sipData.durationWeeks || 'N/A'],
    ['Extension Weeks', sipData.extensionWeeks || 'N/A'],
    [],
    ['Supervisor Information'],
    ['Supervisor Name', sipData.supervisorName || 'N/A'],
    ['Supervisor Phone', sipData.supervisorPhone || 'N/A'],
    ['Supervisor Email', sipData.supervisorEmail || 'N/A'],
    [],
    ['HR Head Information'],
    ['HR Head Name', sipData.hrHeadName || 'N/A'],
    ['HR Phone', sipData.hrPhone || 'N/A'],
    ['HR Email', sipData.hrEmail || 'N/A'],
    ['Office Address', sipData.officeAddress || 'N/A'],
    [],
    ['Project Details'],
    ['Project Title', sipData.projectTitle || 'N/A'],
    ['Faculty Mentor Name', sipData.facultyMentorName || 'N/A'],
    [],
    ['Grading'],
    ['Faculty Grading', sipData.facultyGrading || 'N/A'],
    ['Supervisor Grading', sipData.supervisorGrading || 'N/A'],
    [],
    ['PPO Details'],
    ['PPO Offered', sipData.ppOffered ? 'Yes' : 'No'],
    ['PPO Compensation', sipData.ppoCompensation || 'N/A'],
    ['PPO Position', sipData.ppoPosition || 'N/A'],
    ['PPO Location', sipData.ppoLocation || 'N/A'],
    [],
    ['Status'],
    ['Status', sipData.status || 'N/A'],
  ];

  // Create workbook and worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(exportData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 30 },
    { wch: 40 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'SIP Details');

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const fileName = `SIP_${sipData.studentName?.replace(/\s+/g, '_') || 'Export'}_${timestamp}.xlsx`;

  // Download the file
  XLSX.writeFile(workbook, fileName);
};

export const exportAllSIPsToExcel = (sipsData: any[], sessionName: string = 'Session') => {
  // Prepare headers
  const headers = [
    'Enrollment No',
    'Student Name',
    'Specialization',
    'Company Name',
    'Job Role',
    'Location',
    'Stipend',
    'Type',
    'Join Date',
    'Completion Date',
    'Supervisor Name',
    'Faculty Mentor',
    'Faculty Grading',
    'Supervisor Grading',
    'PPO Offered',
    'Status',
  ];

  // Prepare rows
  const rows = sipsData.map(sip => [
    sip.enrollmentNo || '',
    sip.studentName || '',
    sip.specialization || '',
    sip.companyName || '',
    sip.jobRole || '',
    sip.sipLocation || '',
    sip.stipend || '',
    sip.type || '',
    sip.joinDate ? new Date(sip.joinDate).toLocaleDateString() : '',
    sip.completionDate ? new Date(sip.completionDate).toLocaleDateString() : '',
    sip.supervisorName || '',
    sip.facultyMentorName || '',
    sip.facultyGrading || '',
    sip.supervisorGrading || '',
    sip.ppOffered ? 'Yes' : 'No',
    sip.status || '',
  ]);

  // Combine headers and rows
  const exportData = [headers, ...rows];

  // Create workbook and worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(exportData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 18 },
    { wch: 15 },
    { wch: 18 },
    { wch: 15 },
    { wch: 15 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
  ];

  // Freeze the header row
  worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'SIP Submissions');

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const fileName = `SIP_Submissions_${sessionName.replace(/\s+/g, '_')}_${timestamp}.xlsx`;

  // Download the file
  XLSX.writeFile(workbook, fileName);
};

