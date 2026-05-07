const multer = require('multer');
const path = require('path');

// Configure multer for memory storage (file will be uploaded to S3)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Accept only image files
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const excelFileFilter = (req, file, cb) => {
  // Accept only Excel files - more permissive to handle different MIME types
  const allowedMimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/ms-excel',
    'application/x-excel',
    'application/x-msexcel',
    'text/csv',
  ];
  
  const allowedExtensions = ['.xlsx', '.xls', '.csv'];
  const fileExtension = file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    console.log('File rejected - MIME type:', file.mimetype, 'Extension:', fileExtension);
    cb(new Error('Only Excel files (.xlsx, .xls, .csv) are allowed'), false);
  }
};

const resumeFileFilter = (req, file, cb) => {
  // Accept PDF and document files for resumes
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  
  const allowedExtensions = ['.pdf', '.doc', '.docx'];
  const fileExtension = file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and document files (.pdf, .doc, .docx) are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

const excelUpload = multer({
  storage,
  fileFilter: excelFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size for Excel
  },
});

const resumeUpload = multer({
  storage,
  fileFilter: resumeFileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max file size for resume documents
  },
});

const assessmentFileFilter = (req, file, cb) => {
  // Allow all file types for assessment submissions, only limit file size
  cb(null, true);
};

const assessmentUpload = multer({
  storage,
  fileFilter: assessmentFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size for assessment files
  },
});

module.exports = { upload, excelUpload, resumeUpload, assessmentUpload };
