import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  FileText,
  Trash2,
  Download,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  File,
  FolderOpen,
  FileSpreadsheet,
  Presentation,
  FileCode,
  Image,
} from 'lucide-react';
import { documentsAPI } from '../../api/documents.api.js';
import { Button, Card, Spinner } from '../../components/ui/index.js';
import { cn } from '../../lib/cn.js';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const statusConfig = {
  pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', label: 'Pending' },
  processing: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', label: 'Processing' },
  ready: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', label: 'Ready' },
  failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', label: 'Failed' },
};

const getFileTypeConfig = (mimeType, filename) => {
  // Check by MIME type first
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel') || mimeType === 'text/csv') {
    return { icon: FileSpreadsheet, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' };
  }
  if (mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) {
    return { icon: Presentation, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' };
  }
  if (mimeType?.startsWith('image/')) {
    return { icon: Image, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' };
  }
  if (mimeType === 'text/html' || mimeType === 'text/markdown' || mimeType === 'text/x-markdown') {
    return { icon: FileCode, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/20' };
  }

  // Fallback to extension check
  const ext = filename?.split('.').pop()?.toLowerCase();
  if (['xlsx', 'xls', 'csv'].includes(ext)) {
    return { icon: FileSpreadsheet, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' };
  }
  if (['pptx', 'ppt'].includes(ext)) {
    return { icon: Presentation, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' };
  }
  if (['png', 'jpg', 'jpeg', 'tiff', 'bmp', 'webp'].includes(ext)) {
    return { icon: Image, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' };
  }
  if (['html', 'htm', 'md', 'markdown'].includes(ext)) {
    return { icon: FileCode, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/20' };
  }

  // Default for PDF, DOC, DOCX, TXT
  return { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' };
};

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['documents', { search }],
    queryFn: () => documentsAPI.list({ search, limit: 50 }),
    select: (res) => res.data.data,
  });

  const uploadMutation = useMutation({
    mutationFn: (files) => {
      setUploading(true);
      setUploadProgress(0);
      return documentsAPI.upload(files, setUploadProgress);
    },
    onSuccess: (res) => {
      setUploading(false);
      const results = res.data.data;
      const successCount = results.filter((r) => r.success).length;
      toast.success(`${successCount} file(s) uploaded successfully`);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error) => {
      setUploading(false);
      toast.error(error.response?.data?.message || 'Upload failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: documentsAPI.delete,
    onSuccess: () => {
      toast.success('Document deleted');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Delete failed');
    },
  });

  const handleFileChange = useCallback(
    (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        uploadMutation.mutate(files);
      }
      e.target.value = '';
    },
    [uploadMutation]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragActive(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        uploadMutation.mutate(files);
      }
    },
    [uploadMutation]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const documents = data?.documents || [];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          Documents
        </h1>
        <p className="mt-1 text-gray-500 dark:text-slate-400">
          Upload and manage your knowledge base documents
        </p>
      </div>

      {/* Upload area */}
      <Card className="mb-8 overflow-hidden">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            'relative p-8 lg:p-12 border-2 border-dashed rounded-xl m-4 transition-all duration-200',
            dragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-slate-700 hover:border-blue-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
          )}
        >
          {uploading ? (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Uploading your files...
                </p>
                <p className="text-sm text-gray-500 dark:text-slate-400">{uploadProgress}% complete</p>
              </div>
              <div className="w-full max-w-xs mx-auto bg-white dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center mb-6">
                <Upload className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Drop files here or click to upload
              </p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                Supports PDF, Word, Excel, PowerPoint, CSV, HTML, Markdown, TXT, and images (up to 50MB)
              </p>
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.csv,.pptx,.ppt,.html,.htm,.md,.markdown,.png,.jpg,.jpeg,.tiff,.bmp,.webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button size="lg" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                  Select Files
                </Button>
              </>
            </div>
          )}
        </div>
      </Card>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Documents list */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : documents.length === 0 ? (
        <Card className="p-16 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center mb-6">
            <FolderOpen className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No documents yet
          </h3>
          <p className="text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
            Upload your first document to start building your knowledge base.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const status = statusConfig[doc.status];
            const StatusIcon = status.icon;
            const fileType = getFileTypeConfig(doc.mimeType, doc.originalName);
            const FileIcon = fileType.icon;
            return (
              <Card key={doc._id} hover className="p-5">
                <div className="flex items-center gap-4">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', fileType.bg)}>
                    <FileIcon className={cn('h-6 w-6', fileType.color)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {doc.originalName}
                    </h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-slate-400">
                      <span>{(doc.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-slate-500" />
                      <span>
                        {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium', status.bg, status.color)}>
                    <StatusIcon className={cn('h-4 w-4', doc.status === 'processing' && 'animate-spin')} />
                    <span>{status.label}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {doc.status === 'ready' && (
                      <a
                        href={documentsAPI.getDownloadUrl(doc._id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                      >
                        <Download className="h-5 w-5" />
                      </a>
                    )}
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this document?')) {
                          deleteMutation.mutate(doc._id);
                        }
                      }}
                      className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
