'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import {
  FiFolder, FiFile, FiImage, FiFileText, FiTrash2, FiUpload,
  FiRefreshCw, FiGrid, FiList, FiAlertTriangle, FiDownload,
  FiEdit2, FiCheck, FiX, FiSearch, FiChevronRight, FiHome,
  FiFilePlus, FiFolderPlus, FiEye, FiHardDrive,
} from 'react-icons/fi';

/* ── Types ──────────────────────────────────────────────────── */

interface FileItem {
  key: string;
  name: string;
  folder: string;
  size: number | null;
  lastModified: string | null;
  url: string;
  isReferenced: boolean;
  source?: string;
  contentType: 'image' | 'pdf' | 'document' | 'spreadsheet' | 'video' | 'audio' | 'archive' | 'file';
}

interface FolderStat {
  name: string;
  count: number;
  totalSize: number;
}

interface Stats {
  totalFiles: number;
  totalSize: number | null;
  referencedCount: number;
  unreferencedCount: number | null;
  byFolder: Record<string, { count: number; size: number }>;
}

/* ── Helpers ────────────────────────────────────────────────── */

const formatBytes = (bytes: number | null) => {
  if (bytes === null || bytes === undefined) return '—';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const FileIcon = ({ type, className = 'w-5 h-5' }: { type: FileItem['contentType']; className?: string }) => {
  const props = { className };
  if (type === 'image') return <FiImage {...props} />;
  if (type === 'pdf') return <FiFileText {...props} />;
  if (type === 'document') return <FiFileText {...props} />;
  return <FiFile {...props} />;
};

const typeColor: Record<FileItem['contentType'], string> = {
  image: 'text-blue-500 bg-blue-50',
  pdf: 'text-red-500 bg-red-50',
  document: 'text-orange-500 bg-orange-50',
  spreadsheet: 'text-green-500 bg-green-50',
  video: 'text-purple-500 bg-purple-50',
  audio: 'text-pink-500 bg-pink-50',
  archive: 'text-yellow-600 bg-yellow-50',
  file: 'text-gray-500 bg-gray-50',
};

/* ── Preview Modal ──────────────────────────────────────────── */
function PreviewModal({ file, onClose }: { file: FileItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(60,60,67,0.08)]">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-gray-900 truncate">{file.name}</p>
            <p className="text-[12px] text-[rgba(60,60,67,0.5)]">{formatBytes(file.size)} · {file.folder}</p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <a href={file.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition">
              <FiDownload className="w-4 h-4" />
            </a>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition">
              <FiX className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-6 overflow-auto max-h-[70vh] flex items-center justify-center bg-[#f2f2f7]">
          {file.contentType === 'image' ? (
            <img src={file.url} alt={file.name} className="max-w-full max-h-[60vh] rounded-2xl object-contain shadow-md" />
          ) : file.contentType === 'pdf' ? (
            <iframe src={file.url} className="w-full h-[60vh] rounded-2xl border-0" />
          ) : (
            <div className="text-center py-12">
              <div className={`w-16 h-16 rounded-2xl ${typeColor[file.contentType]} flex items-center justify-center mx-auto mb-4`}>
                <FileIcon type={file.contentType} className="w-8 h-8" />
              </div>
              <p className="text-[14px] font-medium text-gray-700 mb-4">{file.name}</p>
              <a href={file.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#007AFF] text-white rounded-xl text-sm font-semibold hover:bg-[#0071E3] transition">
                <FiDownload className="w-4 h-4" /> Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Rename Inline ──────────────────────────────────────────── */
function RenameInput({ name, onSave, onCancel }: { name: string; onSave: (n: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(name);
  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onSave(value); if (e.key === 'Escape') onCancel(); }}
        className="text-[13px] font-medium text-gray-900 bg-white border border-[#007AFF] rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 min-w-0 flex-1"
      />
      <button onClick={() => onSave(value)} className="p-1 text-[#34C759] hover:bg-green-50 rounded-lg transition"><FiCheck className="w-3.5 h-3.5" /></button>
      <button onClick={onCancel} className="p-1 text-[rgba(60,60,67,0.4)] hover:bg-gray-100 rounded-lg transition"><FiX className="w-3.5 h-3.5" /></button>
    </div>
  );
}

/* ── File Card (grid) ───────────────────────────────────────── */
function FileCard({
  file, selected, onSelect, onDelete, onRename, onPreview,
}: {
  file: FileItem; selected: boolean;
  onSelect: () => void; onDelete: () => void;
  onRename: (n: string) => void; onPreview: () => void;
}) {
  const [renaming, setRenaming] = useState(false);

  return (
    <div
      onClick={onSelect}
      className={`group relative bg-white rounded-2xl border transition-all duration-150 cursor-pointer ${
        selected
          ? 'border-[#007AFF] ring-2 ring-[#007AFF]/20 shadow-md'
          : 'border-[rgba(60,60,67,0.07)] hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      {/* Selection checkbox */}
      <div
        className={`absolute top-3 left-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all z-10 ${
          selected ? 'border-[#007AFF] bg-[#007AFF]' : 'border-[rgba(60,60,67,0.2)] bg-white opacity-0 group-hover:opacity-100'
        }`}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
      >
        {selected && <FiCheck className="w-2.5 h-2.5 text-white" />}
      </div>

      {/* Unreferenced badge */}
      {!file.isReferenced && (
        <div className="absolute top-3 right-3 z-10">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-full text-[10px] font-semibold">
            <FiAlertTriangle className="w-2.5 h-2.5" /> Orphan
          </span>
        </div>
      )}

      {/* Thumbnail / icon */}
      <div className="h-32 flex items-center justify-center bg-[#f2f2f7] rounded-t-2xl overflow-hidden">
        {file.contentType === 'image' ? (
          <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${typeColor[file.contentType]}`}>
            <FileIcon type={file.contentType} className="w-7 h-7" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        {renaming ? (
          <RenameInput name={file.name} onSave={(n) => { onRename(n); setRenaming(false); }} onCancel={() => setRenaming(false)} />
        ) : (
          <p className="text-[12px] font-semibold text-gray-900 truncate leading-snug">{file.name}</p>
        )}
        <p className="text-[11px] text-[rgba(60,60,67,0.45)] mt-1">{formatBytes(file.size)}</p>
      </div>

      {/* Hover actions */}
      <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <button onClick={onPreview} className="w-7 h-7 bg-white border border-[rgba(60,60,67,0.1)] rounded-lg flex items-center justify-center text-gray-500 hover:text-[#007AFF] transition shadow-sm">
          <FiEye className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setRenaming(true)} className="w-7 h-7 bg-white border border-[rgba(60,60,67,0.1)] rounded-lg flex items-center justify-center text-gray-500 hover:text-[#FF9500] transition shadow-sm">
          <FiEdit2 className="w-3.5 h-3.5" />
        </button>
        <a href={file.url} download target="_blank" rel="noopener noreferrer" className="w-7 h-7 bg-white border border-[rgba(60,60,67,0.1)] rounded-lg flex items-center justify-center text-gray-500 hover:text-[#007AFF] transition shadow-sm">
          <FiDownload className="w-3.5 h-3.5" />
        </a>
        <button onClick={onDelete} className="w-7 h-7 bg-white border border-[rgba(60,60,67,0.1)] rounded-lg flex items-center justify-center text-gray-500 hover:text-[#FF3B30] transition shadow-sm">
          <FiTrash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ── File Row (list) ────────────────────────────────────────── */
function FileRow({
  file, selected, onSelect, onDelete, onRename, onPreview,
}: {
  file: FileItem; selected: boolean;
  onSelect: () => void; onDelete: () => void;
  onRename: (n: string) => void; onPreview: () => void;
}) {
  const [renaming, setRenaming] = useState(false);

  return (
    <tr
      onClick={onSelect}
      className={`group cursor-pointer transition-colors ${selected ? 'bg-[rgba(0,122,255,0.05)]' : 'hover:bg-[rgba(0,0,0,0.02)]'}`}
    >
      <td className="pl-5 py-3.5 w-10">
        <div
          className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center transition-all ${
            selected ? 'border-[#007AFF] bg-[#007AFF]' : 'border-[rgba(60,60,67,0.25)] group-hover:border-[rgba(60,60,67,0.45)]'
          }`}
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
        >
          {selected && <FiCheck className="w-2.5 h-2.5 text-white" />}
        </div>
      </td>
      <td className="px-3 py-3.5">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${typeColor[file.contentType]}`}>
            <FileIcon type={file.contentType} className="w-4 h-4" />
          </div>
          {renaming ? (
            <RenameInput name={file.name} onSave={(n) => { onRename(n); setRenaming(false); }} onCancel={() => setRenaming(false)} />
          ) : (
            <span className="text-[13px] font-medium text-gray-900 truncate max-w-xs">{file.name}</span>
          )}
        </div>
      </td>
      <td className="px-3 py-3.5">
        <p className="text-[12px] text-[rgba(60,60,67,0.55)]">{file.folder}</p>
        {file.source && <p className="text-[11px] text-[rgba(60,60,67,0.35)] truncate max-w-[160px]">{file.source}</p>}
      </td>
      <td className="px-3 py-3.5 text-[12px] text-[rgba(60,60,67,0.55)]">{formatBytes(file.size)}</td>
      <td className="px-3 py-3.5 text-[12px] text-[rgba(60,60,67,0.55)]">
        {file.lastModified ? new Date(file.lastModified).toLocaleDateString() : '—'}
      </td>
      <td className="px-3 py-3.5">
        {file.isReferenced ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-green-50 text-[#34C759] rounded-full text-[11px] font-semibold">Referenced</span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-full text-[11px] font-semibold">
            <FiAlertTriangle className="w-2.5 h-2.5" /> Orphan
          </span>
        )}
      </td>
      <td className="pr-5 py-3.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onPreview} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-[#007AFF] transition"><FiEye className="w-3.5 h-3.5" /></button>
          <button onClick={() => setRenaming(true)} className="p-1.5 rounded-lg hover:bg-orange-50 text-gray-400 hover:text-[#FF9500] transition"><FiEdit2 className="w-3.5 h-3.5" /></button>
          <a href={file.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-[#007AFF] transition"><FiDownload className="w-3.5 h-3.5" /></a>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-[#FF3B30] transition"><FiTrash2 className="w-3.5 h-3.5" /></button>
        </div>
      </td>
    </tr>
  );
}

/* ── Main Page ──────────────────────────────────────────────── */
function FileManagerContent() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderStat[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [tab, setTab] = useState<'all' | 'unreferenced'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<FileItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newFolderInput, setNewFolderInput] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiClient.get('/file-management/stats');
      setStats(res.data);
    } catch { /* silent */ }
  }, []);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await apiClient.get('/file-management/folders');
      setFolders(res.data.folders);
    } catch { /* silent */ }
  }, []);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'unreferenced') {
        setFiles([]);
        setLoading(false);
        return;
      }
      const params = activeFolder ? `?folder=${activeFolder}` : '';
      const res = await apiClient.get(`/file-management/files${params}`);
      setFiles(res.data.files);
    } catch {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [tab, activeFolder]);

  useEffect(() => {
    fetchFolders();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchFiles();
    setSelected(new Set());
  }, [fetchFiles]);

  const handleDelete = async (file: FileItem) => {
    if (!confirm(`Delete "${file.name}"? This cannot be undone.`)) return;
    try {
      await apiClient.delete('/file-management/files', { data: { key: file.key } });
      toast.success('File deleted');
      setFiles((prev) => prev.filter((f) => f.key !== file.key));
      fetchStats();
    } catch {
      toast.error('Failed to delete file');
    }
  };

  const handleBulkDownload = async () => {
    const selectedFiles = filtered.filter((f) => selected.has(f.key));
    if (selectedFiles.length === 0) return;

    if (selectedFiles.length === 1) {
      const a = document.createElement('a');
      a.href = selectedFiles[0].url;
      a.download = selectedFiles[0].name;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    const toastId = toast.loading(`Building zip for ${selectedFiles.length} files…`);
    try {
      const res = await apiClient.post(
        '/file-management/download-zip',
        { files: selectedFiles.map((f) => ({ key: f.key, url: f.url, name: f.name })) },
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/zip' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `files-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${selectedFiles.length} files as zip`, { id: toastId });
    } catch {
      toast.error('Failed to create zip', { id: toastId });
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} file(s)? This cannot be undone.`)) return;
    try {
      await apiClient.delete('/file-management/files/bulk', { data: { keys: [...selected] } });
      toast.success(`Deleted ${selected.size} file(s)`);
      setFiles((prev) => prev.filter((f) => !selected.has(f.key)));
      setSelected(new Set());
      fetchStats();
    } catch {
      toast.error('Bulk delete failed');
    }
  };

  const handleRename = async (file: FileItem, newName: string) => {
    if (!newName.trim() || newName === file.name) return;
    try {
      const res = await apiClient.patch('/file-management/files/rename', { key: file.key, newName });
      toast.success('File renamed');
      setFiles((prev) => prev.map((f) => f.key === file.key
        ? { ...f, key: res.data.newKey, name: newName, url: res.data.url }
        : f
      ));
    } catch {
      toast.error('Rename failed');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', activeFolder || 'uploads');
      await apiClient.post('/file-management/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('File uploaded');
      fetchFiles();
      fetchStats();
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderInput.trim()) return;
    try {
      await apiClient.post('/file-management/folders', { name: newFolderInput.trim() });
      toast.success('Folder created');
      setNewFolderInput('');
      setShowNewFolder(false);
      fetchFolders();
    } catch {
      toast.error('Failed to create folder');
    }
  };

  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((f) => f.key)));
  };

  const filtered = files.filter((f) =>
    !search || f.name.toLowerCase().includes(search.toLowerCase())
  );

  const folderColors = ['bg-blue-50 text-[#007AFF]', 'bg-green-50 text-[#34C759]', 'bg-purple-50 text-[#AF52DE]', 'bg-orange-50 text-[#FF9500]', 'bg-pink-50 text-pink-500', 'bg-cyan-50 text-cyan-500', 'bg-yellow-50 text-yellow-600'];

  return (
    <DashboardLayout title="File Management">
      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 animate-slide-up">
          {[
            { label: 'Total Files', value: stats.totalFiles, icon: <FiFile className="w-4 h-4" />, bg: 'bg-blue-50', color: 'text-[#007AFF]' },
            { label: 'Total Size', value: formatBytes(stats.totalSize), icon: <FiHardDrive className="w-4 h-4" />, bg: 'bg-purple-50', color: 'text-[#AF52DE]' },
            { label: 'Referenced', value: stats.referencedCount, icon: <FiCheck className="w-4 h-4" />, bg: 'bg-green-50', color: 'text-[#34C759]' },
            { label: 'Orphaned', value: stats.unreferencedCount ?? '—', icon: <FiAlertTriangle className="w-4 h-4" />, bg: 'bg-amber-50', color: 'text-amber-600' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-[rgba(60,60,67,0.07)] shadow-sm flex items-center gap-3" style={{ animationDelay: `${i * 55}ms` }}>
              <div className={`w-9 h-9 rounded-xl ${s.bg} ${s.color} flex items-center justify-center flex-shrink-0`}>{s.icon}</div>
              <div>
                <p className={`text-[20px] font-bold leading-none ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-[rgba(60,60,67,0.5)] font-medium mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-5 animate-slide-up" style={{ animationDelay: '60ms' }}>
        {/* Sidebar — folders */}
        <aside className="w-52 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-[rgba(60,60,67,0.07)] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[rgba(60,60,67,0.07)] flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[rgba(60,60,67,0.4)]">Folders</p>
              <button onClick={() => setShowNewFolder((v) => !v)} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#007AFF] transition">
                <FiFolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>

            {showNewFolder && (
              <div className="px-3 py-2 border-b border-[rgba(60,60,67,0.07)] flex items-center gap-1.5">
                <input
                  autoFocus
                  value={newFolderInput}
                  onChange={(e) => setNewFolderInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowNewFolder(false); }}
                  placeholder="Folder name"
                  className="text-[12px] flex-1 bg-[#f2f2f7] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30"
                />
                <button onClick={handleCreateFolder} className="p-1 text-[#34C759]"><FiCheck className="w-3.5 h-3.5" /></button>
              </div>
            )}

            <nav className="py-1">
              <button
                onClick={() => { setActiveFolder(null); setTab('all'); }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium transition ${
                  !activeFolder && tab === 'all' ? 'bg-[rgba(0,122,255,0.08)] text-[#007AFF]' : 'text-[rgba(60,60,67,0.7)] hover:bg-gray-50'
                }`}
              >
                <FiHome className="w-3.5 h-3.5" /> All Files
              </button>
              <button
                onClick={() => { setTab('unreferenced'); setActiveFolder(null); }}
                className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-medium transition ${
                  tab === 'unreferenced' ? 'bg-amber-50 text-amber-600' : 'text-[rgba(60,60,67,0.7)] hover:bg-gray-50'
                }`}
              >
                <FiAlertTriangle className="w-3.5 h-3.5" />
                <span className="flex-1 text-left">Orphaned</span>
                {stats?.unreferencedCount ? (
                  <span className="ml-auto px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded-full text-[10px] font-bold">{stats.unreferencedCount}</span>
                ) : null}
              </button>
              <div className="mx-3 my-1 h-px bg-[rgba(60,60,67,0.07)]" />
              {folders.map((folder, i) => (
                <button
                  key={folder.name}
                  onClick={() => { setActiveFolder(folder.name); setTab('all'); }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium transition ${
                    activeFolder === folder.name && tab === 'all'
                      ? 'bg-[rgba(0,122,255,0.08)] text-[#007AFF]'
                      : 'text-[rgba(60,60,67,0.7)] hover:bg-gray-50'
                  }`}
                >
                  <FiFolder className={`w-3.5 h-3.5 flex-shrink-0 ${folderColors[i % folderColors.length].split(' ')[1]}`} />
                  <span className="flex-1 text-left truncate">{folder.name}</span>
                  <span className="text-[10px] text-[rgba(60,60,67,0.35)] font-medium">{folder.count}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main panel */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="bg-white rounded-2xl border border-[rgba(60,60,67,0.07)] shadow-sm px-4 py-3 mb-4 flex items-center gap-3 flex-wrap">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-[13px] font-medium text-[rgba(60,60,67,0.55)] flex-1 min-w-0">
              <button onClick={() => { setActiveFolder(null); setTab('all'); }} className="hover:text-[#007AFF] transition flex-shrink-0">
                <FiHome className="w-3.5 h-3.5" />
              </button>
              {activeFolder && (
                <>
                  <FiChevronRight className="w-3 h-3 flex-shrink-0" />
                  <span className="text-gray-900 font-semibold truncate">{activeFolder}</span>
                </>
              )}
              {tab === 'unreferenced' && (
                <>
                  <FiChevronRight className="w-3 h-3 flex-shrink-0" />
                  <span className="text-amber-600 font-semibold">Orphaned Files</span>
                </>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files…"
                className="pl-8 pr-3 py-1.5 text-[12px] bg-[#f2f2f7] rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 w-44"
              />
            </div>

            {/* Actions */}
            {selected.size > 0 && (
              <div className="flex items-center gap-2">
                <button onClick={handleBulkDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(0,122,255,0.1)] text-[#007AFF] rounded-xl text-[12px] font-semibold hover:bg-[rgba(0,122,255,0.18)] transition">
                  <FiDownload className="w-3.5 h-3.5" /> Download {selected.size}
                </button>
                <button onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(255,59,48,0.1)] text-[#FF3B30] rounded-xl text-[12px] font-semibold hover:bg-[rgba(255,59,48,0.18)] transition">
                  <FiTrash2 className="w-3.5 h-3.5" /> Delete {selected.size}
                </button>
              </div>
            )}

            <button onClick={() => { fetchFiles(); fetchStats(); fetchFolders(); }}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition">
              <FiRefreshCw className="w-4 h-4" />
            </button>

            <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#007AFF] text-white rounded-xl text-[12px] font-semibold hover:bg-[#0071E3] transition disabled:opacity-50"
            >
              <FiUpload className="w-3.5 h-3.5" />
              {uploading ? 'Uploading…' : 'Upload'}
            </button>

            {/* View toggle */}
            <div className="flex items-center bg-[#f2f2f7] rounded-xl p-0.5">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#007AFF]' : 'text-gray-400'}`}>
                <FiGrid className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition ${viewMode === 'list' ? 'bg-white shadow-sm text-[#007AFF]' : 'text-gray-400'}`}>
                <FiList className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* File area */}
          <div className="bg-white rounded-2xl border border-[rgba(60,60,67,0.07)] shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-8 h-8 border-2 border-[rgba(0,122,255,0.2)] border-t-[#007AFF] rounded-full animate-spin" />
              </div>
            ) : tab === 'unreferenced' ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
                  <FiAlertTriangle className="w-7 h-7 text-amber-500" />
                </div>
                <p className="text-[14px] font-semibold text-gray-800 mb-2">ListBucket Permission Required</p>
                <p className="text-[13px] text-[rgba(60,60,67,0.55)] max-w-sm leading-relaxed">
                  Detecting orphaned files requires <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[12px] font-mono">s3:ListBucket</code> permission,
                  which is explicitly denied for the current IAM user (<code className="bg-gray-100 px-1 py-0.5 rounded text-[12px] font-mono">rpms-s3</code>).
                </p>
                <p className="text-[12px] text-[rgba(60,60,67,0.4)] mt-3">
                  Remove the explicit deny from the IAM policy to enable orphan detection.
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-[#f2f2f7] flex items-center justify-center mb-4">
                  <FiFile className="w-7 h-7 text-gray-400" />
                </div>
                <p className="text-[14px] font-semibold text-gray-700">{search ? 'No files match your search' : 'No files here'}</p>
                <p className="text-[12px] text-[rgba(60,60,67,0.45)] mt-1">Upload a file to get started</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="p-4">
                {/* Select all */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <button onClick={selectAll} className="text-[12px] text-[rgba(60,60,67,0.5)] hover:text-[#007AFF] transition font-medium">
                    {selected.size === filtered.length ? 'Deselect all' : `Select all (${filtered.length})`}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filtered.map((file) => (
                    <FileCard
                      key={file.key}
                      file={file}
                      selected={selected.has(file.key)}
                      onSelect={() => toggleSelect(file.key)}
                      onDelete={() => handleDelete(file)}
                      onRename={(n) => handleRename(file, n)}
                      onPreview={() => setPreview(file)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#f2f2f7] border-b border-[rgba(60,60,67,0.07)]">
                    <tr>
                      <th className="pl-5 py-3 w-10">
                        <div onClick={selectAll} className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition ${selected.size === filtered.length && filtered.length > 0 ? 'border-[#007AFF] bg-[#007AFF]' : 'border-[rgba(60,60,67,0.3)]'}`}>
                          {selected.size === filtered.length && filtered.length > 0 && <FiCheck className="w-2.5 h-2.5 text-white" />}
                        </div>
                      </th>
                      {['Name', 'Folder', 'Size', 'Modified', 'Status', ''].map((h) => (
                        <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-[rgba(60,60,67,0.45)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(60,60,67,0.06)]">
                    {filtered.map((file) => (
                      <FileRow
                        key={file.key}
                        file={file}
                        selected={selected.has(file.key)}
                        onSelect={() => toggleSelect(file.key)}
                        onDelete={() => handleDelete(file)}
                        onRename={(n) => handleRename(file, n)}
                        onPreview={() => setPreview(file)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer count */}
            {!loading && filtered.length > 0 && (
              <div className="px-5 py-3 border-t border-[rgba(60,60,67,0.07)] flex items-center justify-between">
                <p className="text-[11px] text-[rgba(60,60,67,0.45)]">{filtered.length} file{filtered.length !== 1 ? 's' : ''}</p>
                {selected.size > 0 && (
                  <p className="text-[11px] text-[#007AFF] font-semibold">{selected.size} selected</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {preview && <PreviewModal file={preview} onClose={() => setPreview(null)} />}
    </DashboardLayout>
  );
}

export default function FileManagementPage() {
  return (
    <ProtectedRoute requiredRoles={['ADMIN']} requiredPerm="files.view">
      <FileManagerContent />
    </ProtectedRoute>
  );
}
