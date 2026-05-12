'use client';

import { useState } from 'react';
import { FiDownload, FiX, FiChevronDown, FiChevronUp } from 'react-icons/fi';

interface Creator {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImage?: string;
  role?: string;
  approvedRole?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'PUBLIC' | 'PRIVATE';
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  imageOrientation?: 'SQUARE' | 'LANDSCAPE' | 'PORTRAIT';
  createdAt: string;
  updatedAt: string;
  Creator?: Creator;
}

interface Props {
  announcement: Announcement;
  showRole?: boolean;
}

export default function AnnouncementCard({ announcement, showRole = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const isImage = announcement.fileUrl && announcement.fileType?.startsWith('image/');
  const isPDF = announcement.fileUrl && announcement.fileType === 'application/pdf';

  const getImageClasses = () => {
    const baseClasses = 'w-full h-auto rounded-lg cursor-pointer hover:opacity-80 transition';
    if (announcement.imageOrientation === 'SQUARE') return `${baseClasses} aspect-square object-cover`;
    if (announcement.imageOrientation === 'LANDSCAPE') return `${baseClasses} aspect-video object-cover`;
    if (announcement.imageOrientation === 'PORTRAIT') return `${baseClasses} aspect-[3/4] object-cover`;
    return baseClasses;
  };

  const handleImageClick = () => {
    if (announcement.fileUrl) {
      window.open(announcement.fileUrl, '_blank');
    }
  };

  const handleFileDownload = () => {
    if (announcement.fileUrl) {
      const link = document.createElement('a');
      link.href = announcement.fileUrl;
      link.download = announcement.fileName || 'file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition overflow-hidden bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{announcement.title}</h3>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                announcement.type === 'PUBLIC' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {announcement.type}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              By <span className="font-medium text-gray-700">
                {announcement.Creator?.firstName} {announcement.Creator?.lastName}
              </span>
              {showRole && (announcement.Creator?.role || announcement.Creator?.approvedRole) && (
                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                  {announcement.Creator?.role || announcement.Creator?.approvedRole}
                </span>
              )}
            </p>
            <p className="text-xs text-gray-400 mt-1">{formatDate(announcement.createdAt)}</p>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            {expanded ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
          </button>
        </div>
      </div>

      {/* Content - Expandable */}
      {expanded && (
        <div className="p-4">
          {/* Text Content */}
          <div className="prose prose-sm max-w-none mb-4">
            <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
              {announcement.content}
            </p>
          </div>

          {/* File Display */}
          {announcement.fileUrl && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              {isImage ? (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">Attached Image</p>
                  <div className="bg-gray-50 rounded-lg p-2 inline-block">
                    <img
                      src={announcement.fileUrl}
                      alt={announcement.fileName}
                      className={getImageClasses()}
                      onClick={handleImageClick}
                      onLoad={() => setImageLoaded(true)}
                    />
                  </div>
                  <button
                    onClick={handleFileDownload}
                    className="ml-2 inline-flex items-center gap-1 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-medium rounded transition"
                  >
                    <FiDownload size={14} /> Download
                  </button>
                </div>
              ) : isPDF || announcement.fileType?.includes('document') || announcement.fileType?.includes('pdf') ? (
                <div className="bg-red-50 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-red-200 rounded flex items-center justify-center text-red-600 text-xs font-bold">
                      PDF
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{announcement.fileName}</p>
                      <p className="text-xs text-gray-500">PDF Document</p>
                    </div>
                  </div>
                  <button
                    onClick={handleFileDownload}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-600 text-xs font-medium rounded transition"
                  >
                    <FiDownload size={14} /> Download
                  </button>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{announcement.fileName}</p>
                    <p className="text-xs text-gray-500">
                      {(announcement.fileType || 'File').split('/').pop()}
                    </p>
                  </div>
                  <button
                    onClick={handleFileDownload}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-medium rounded transition"
                  >
                    <FiDownload size={14} /> Download
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Collapsed Preview */}
      {!expanded && announcement.fileUrl && isImage && (
        <div className="px-4 pb-4">
          <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
            <img
              src={announcement.fileUrl}
              alt={announcement.fileName}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );
}
