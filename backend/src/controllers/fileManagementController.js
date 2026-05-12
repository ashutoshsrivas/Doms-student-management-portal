const path = require('path');
const https = require('https');
const http = require('http');
const { ZipArchive } = require('archiver');
const {
  deleteFromS3ByKey,
  copyS3Object,
  getS3ObjectUrl,
  listS3Objects,
  uploadToS3,
} = require('../utils/s3Upload');
const {
  User,
  StudentProfile,
  AssessmentResponse,
  MentorResponse,
  Announcement,
  SIP,
  SIPQuestionAnswer,
} = require('../models');

// ── DB file collection ────────────────────────────────────────

const getAllDbFiles = async () => {
  const files = [];
  const bucket = process.env.S3_BUCKET || '';

  const push = (url, source) => {
    if (!url) return;
    try {
      const parsed = new URL(url);
      let key = parsed.pathname.substring(1); // strip leading /
      // Path-style S3 URLs include the bucket name as the first path segment
      if (key.startsWith(bucket + '/')) key = key.substring(bucket.length + 1);
      const parts = key.split('/');
      const name = parts[parts.length - 1];
      const folder = parts.length > 1 ? parts[parts.length - 2] : 'root';
      files.push({ url, key, name, folder, source });
    } catch { /* bad URL — skip */ }
  };

  const [users, profiles, assessmentResponses, mentorResponses, announcements, sips, sipAnswers] =
    await Promise.all([
      User.findAll({ attributes: ['id', 'profileImage', 'firstName', 'lastName'] }),
      StudentProfile.findAll({ attributes: ['userId', 'resume', 'certificateDocuments'] }),
      AssessmentResponse.findAll({ attributes: ['id', 'fileUrl'] }),
      MentorResponse.findAll({ attributes: ['id', 'fileUrl'] }),
      Announcement.findAll({ attributes: ['id', 'title', 'fileUrl', 'fileName'] }),
      SIP.findAll({ attributes: ['id', 'certificateIssued', 'facultyFeedback', 'supervisorFeedback'] }),
      SIPQuestionAnswer.findAll({ attributes: ['id', 'answerDocument'] }),
    ]);

  users.forEach((u) => push(u.profileImage, `Profile: ${u.firstName} ${u.lastName}`));
  profiles.forEach((p) => {
    push(p.resume, `Resume (user ${p.userId})`);
    const certs = p.certificateDocuments || [];
    certs.forEach((c) => push(c.url, `Certificate (user ${p.userId})`));
  });
  assessmentResponses.forEach((r) => push(r.fileUrl, `Assessment response ${r.id}`));
  mentorResponses.forEach((r) => push(r.fileUrl, `Mentor response ${r.id}`));
  announcements.forEach((a) => push(a.fileUrl, `Announcement: ${a.title}`));
  sips.forEach((s) => {
    push(s.certificateIssued, `SIP certificate ${s.id}`);
    push(s.facultyFeedback, `SIP faculty feedback ${s.id}`);
    push(s.supervisorFeedback, `SIP supervisor feedback ${s.id}`);
  });
  sipAnswers.forEach((a) => push(a.answerDocument, `SIP answer ${a.id}`));

  return files;
};

function getContentTypeFromKey(key) {
  const ext = path.extname(key).toLowerCase();
  const map = {
    '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.gif': 'image', '.webp': 'image',
    '.pdf': 'pdf',
    '.doc': 'document', '.docx': 'document',
    '.xls': 'spreadsheet', '.xlsx': 'spreadsheet', '.csv': 'spreadsheet',
    '.mp4': 'video', '.mov': 'video', '.avi': 'video',
    '.mp3': 'audio', '.wav': 'audio',
    '.zip': 'archive', '.rar': 'archive',
  };
  return map[ext] || 'file';
}

const toFileItem = (f) => ({
  key: f.key,
  name: f.name,
  folder: f.folder,
  url: f.url,
  source: f.source,
  isReferenced: true,
  contentType: getContentTypeFromKey(f.key),
  size: f.size ?? null,
  lastModified: null,
});

// HEAD request to get file size from Content-Length header
const getFileSize = (url) =>
  new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.request(url, { method: 'HEAD' }, (res) => {
      const len = parseInt(res.headers['content-length'] || '0', 10);
      resolve(isNaN(len) ? 0 : len);
    });
    req.on('error', () => resolve(0));
    req.end();
  });

// GET /api/file-management/folders
const listFolders = async (req, res) => {
  try {
    const files = await getAllDbFiles();
    const byFolder = {};
    files.forEach((f) => {
      if (!byFolder[f.folder]) byFolder[f.folder] = { name: f.folder, count: 0, totalSize: 0 };
      byFolder[f.folder].count++;
    });
    res.json({ folders: Object.values(byFolder) });
  } catch (error) {
    console.error('listFolders error:', error);
    res.status(500).json({ message: 'Failed to list folders' });
  }
};

// GET /api/file-management/files?folder=profiles
const listFiles = async (req, res) => {
  try {
    const { folder } = req.query;
    const all = await getAllDbFiles();
    const filtered = folder ? all.filter((f) => f.folder === folder) : all;
    const sizes = await Promise.all(filtered.map((f) => getFileSize(f.url)));
    const filesWithSize = filtered.map((f, i) => ({ ...f, size: sizes[i] }));
    res.json({ files: filesWithSize.map(toFileItem), total: filtered.length });
  } catch (error) {
    console.error('listFiles error:', error);
    res.status(500).json({ message: 'Failed to list files' });
  }
};

// GET /api/file-management/unreferenced
const listUnreferencedFiles = async (req, res) => {
  res.status(403).json({
    message: 'Orphaned file detection requires s3:ListBucket permission which is explicitly denied for the current IAM user (rpms-s3).',
    code: 'LIST_BUCKET_DENIED',
  });
};

// GET /api/file-management/stats
const getStats = async (req, res) => {
  try {
    const files = await getAllDbFiles();
    const sizes = await Promise.all(files.map((f) => getFileSize(f.url)));
    const totalSize = sizes.reduce((sum, s) => sum + s, 0);
    const byFolder = {};
    files.forEach((f, i) => {
      if (!byFolder[f.folder]) byFolder[f.folder] = { count: 0, size: 0 };
      byFolder[f.folder].count++;
      byFolder[f.folder].size += sizes[i];
    });
    res.json({
      totalFiles: files.length,
      totalSize,
      referencedCount: files.length,
      unreferencedCount: null,
      byFolder,
    });
  } catch (error) {
    console.error('getStats error:', error);
    res.status(500).json({ message: 'Failed to get storage stats' });
  }
};

// DELETE /api/file-management/files  body: { key }
const deleteFile = async (req, res) => {
  try {
    const { key } = req.body;
    if (!key) return res.status(400).json({ message: 'File key required' });
    await deleteFromS3ByKey(key);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('deleteFile error:', error);
    res.status(500).json({ message: 'Failed to delete file' });
  }
};

// DELETE /api/file-management/files/bulk  body: { keys: [] }
const bulkDeleteFiles = async (req, res) => {
  try {
    const { keys } = req.body;
    if (!Array.isArray(keys) || keys.length === 0)
      return res.status(400).json({ message: 'Keys array required' });
    const results = await Promise.allSettled(keys.map((key) => deleteFromS3ByKey(key)));
    const failed = results.filter((r) => r.status === 'rejected').length;
    res.json({ deleted: keys.length - failed, failed });
  } catch (error) {
    console.error('bulkDeleteFiles error:', error);
    res.status(500).json({ message: 'Failed to bulk delete files' });
  }
};

// PATCH /api/file-management/files/rename  body: { key, newName }
const renameFile = async (req, res) => {
  try {
    const { key, newName } = req.body;
    if (!key || !newName) return res.status(400).json({ message: 'Key and newName required' });
    const dir = key.substring(0, key.lastIndexOf('/') + 1);
    const sanitized = newName.replace(/[^a-zA-Z0-9._\- ]/g, '_');
    const newKey = `${dir}${sanitized}`;
    await copyS3Object(key, newKey);
    await deleteFromS3ByKey(key);
    res.json({ message: 'File renamed successfully', newKey, url: getS3ObjectUrl(newKey) });
  } catch (error) {
    console.error('renameFile error:', error);
    res.status(500).json({ message: 'Failed to rename file' });
  }
};

// POST /api/file-management/upload  multipart: file, folder
const uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file provided' });
    const folder = req.body.folder || 'uploads';
    const url = await uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype, folder);
    res.json({ message: 'File uploaded successfully', url, folder });
  } catch (error) {
    console.error('uploadFile error:', error);
    res.status(500).json({ message: 'Failed to upload file' });
  }
};

// POST /api/file-management/folders  body: { name }
const createFolder = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Folder name required' });
    const sanitized = name.replace(/[^a-zA-Z0-9_\-]/g, '-').toLowerCase();
    res.json({ message: 'Folder registered', name: sanitized });
  } catch (error) {
    console.error('createFolder error:', error);
    res.status(500).json({ message: 'Failed to create folder' });
  }
};

// Fetch a URL and return a readable stream (follows redirects, works with public-read S3 objects)
const fetchStream = (url) =>
  new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchStream(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      resolve(res);
    }).on('error', reject);
  });

// POST /api/file-management/download-zip  body: { files: [{key, url, name}] }
const downloadZip = async (req, res) => {
  const { files } = req.body;
  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ message: 'Files array required' });
  }

  const archive = new ZipArchive({ zlib: { level: 6 } });

  const chunks = [];
  archive.on('data', (chunk) => chunks.push(chunk));
  archive.on('error', (err) => { throw err; });

  const seen = new Map();
  for (const file of files) {
    let name = file.name || path.basename(file.key || '');
    const count = seen.get(name) ?? 0;
    if (count > 0) {
      const ext = path.extname(name);
      const base = path.basename(name, ext);
      name = `${base} (${count})${ext}`;
    }
    seen.set(file.name || path.basename(file.key || ''), count + 1);

    try {
      const stream = await fetchStream(file.url);
      archive.append(stream, { name });
    } catch (err) {
      console.error(`Failed to fetch file ${file.url}:`, err.message);
    }
  }

  await archive.finalize();

  const buffer = Buffer.concat(chunks);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="files-${Date.now()}.zip"`);
  res.setHeader('Content-Length', buffer.length);
  res.end(buffer);
};

module.exports = {
  listFolders,
  listFiles,
  listUnreferencedFiles,
  getStats,
  deleteFile,
  bulkDeleteFiles,
  renameFile,
  uploadFile,
  createFolder,
  downloadZip,
};
