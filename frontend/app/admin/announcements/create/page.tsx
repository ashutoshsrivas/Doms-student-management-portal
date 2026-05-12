'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import useAuthStore from '@/app/store/authStore';
import { FiArrowLeft, FiLoader, FiX, FiImage } from 'react-icons/fi';
import toast from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function CreateAnnouncementContent() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getBackUrl = () => {
    if (user?.role === 'PLACEMENT_COORDINATOR') {
      return '/coordinator/dashboard';
    }
    return '/admin/dashboard';
  };
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'PUBLIC',
  });
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      setFile(selectedFile);

      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setFilePreview(event.target?.result as string);
        setImageLoaded(false);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFilePreview(null);
    setImageLoaded(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    setLoading(true);
    try {
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('content', formData.content);
      submitData.append('type', formData.type);

      if (file) {
        submitData.append('file', file);
        
        // Detect image dimensions if it's an image
        if (file.type.startsWith('image/')) {
          const img = new Image();
          img.onload = () => {
            const ratio = img.width / img.height;
            let orientation = 'SQUARE';
            if (Math.abs(ratio - 1) > 0.1) {
              orientation = ratio > 1 ? 'LANDSCAPE' : 'PORTRAIT';
            }
            submitData.append('imageDimensions', JSON.stringify({
              width: img.width,
              height: img.height,
              orientation
            }));
          };
          img.src = filePreview!;
        }
      }

      const response = await fetch(`${API_BASE}/announcements`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: submitData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Announcement created successfully');
        router.push('/admin/announcements');
      } else {
        toast.error(data.message || 'Failed to create announcement');
      }
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast.error('Error creating announcement');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <FiLoader className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4">
            <Link
              href={getBackUrl()}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <FiArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create Announcement</h1>
              <p className="text-gray-600 mt-1">Share important news with your audience</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm">
          <div className="p-6 space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-900 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter announcement title"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">{formData.title.length}/200</p>
            </div>

            {/* Content */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-900 mb-2">
                Content <span className="text-red-500">*</span>
              </label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                placeholder="Enter announcement content"
                rows={10}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
              />
            </div>

            {/* Type */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-900 mb-2">
                Visibility <span className="text-red-500">*</span>
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              >
                <option value="PUBLIC">Public (Visible to everyone)</option>
                <option value="PRIVATE">Private (Only logged-in users)</option>
              </select>
              <p className="text-xs text-gray-500 mt-2">
                {formData.type === 'PUBLIC'
                  ? 'This announcement will be visible on the homepage and to all users'
                  : 'This announcement will only be visible to logged-in users in their dashboard'}
              </p>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Attachment (Optional)
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Upload a single file (image, PDF, or document). Max 10MB.
              </p>

              {!file ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition"
                >
                  <FiImage className="mx-auto text-gray-400 mb-2" size={32} />
                  <p className="text-gray-900 font-medium">Click to upload or drag and drop</p>
                  <p className="text-gray-500 text-sm mt-1">SVG, PNG, JPG, PDF, DOC or DOCX</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  />
                </div>
              ) : (
                <div className="border border-gray-300 rounded-lg p-4">
                  {filePreview && file.type.startsWith('image/') ? (
                    <div className="relative inline-block mb-4">
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="max-h-64 rounded-lg"
                        onLoad={() => setImageLoaded(true)}
                      />
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition"
                      >
                        <FiX size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
                      <div>
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="p-2 hover:bg-red-50 rounded-lg transition"
                      >
                        <FiX className="text-red-500" size={20} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200 rounded-b-lg">
            <Link
              href="/admin/announcements"
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition"
            >
              {loading && <FiLoader className="animate-spin" size={18} />}
              {loading ? 'Creating...' : 'Create Announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CreateAnnouncementPage() {
  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'HOD', 'PLACEMENT_COORDINATOR']}>
      <CreateAnnouncementContent />
    </ProtectedRoute>
  );
}
