import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/shared/lib/axios';
import {
  UploadCloud,
  Folder,
  FileText,
  MessageSquare,
  Link as LinkIcon,
  Activity,
  Search,
  HardDrive,
  Download,
  Trash2,
  Plus,
  LogOut,
  HelpCircle,
  FolderPlus,
  Send,
  ExternalLink,
  Shield,
  Loader2,
  CheckCircle2,
  File,
  X,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal from '@/shared/components/ui/Modal';
import DocumentViewerModal, { ViewerFile } from '@/shared/components/ui/DocumentViewerModal';
import DocumentDetailsCommentsSidebar from '@/shared/components/ui/DocumentDetailsCommentsSidebar';

export default function ClientWorkspacePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Auth Context check
  const [clientInfo, setClientInfo] = useState<any>(null);
  const token = localStorage.getItem('clientToken');

  // Preview Modal & Sidebar state
  const [previewFile, setPreviewFile] = useState<ViewerFile | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedFileForSidebar, setSelectedFileForSidebar] = useState<any | null>(null);

  useEffect(() => {
    if (!token) {
      navigate('/portal/login');
      return;
    }
    const storedInfo = localStorage.getItem('clientInfo');
    if (storedInfo) {
      try {
        setClientInfo(JSON.parse(storedInfo));
      } catch (e) {}
    }
  }, [token, navigate]);

  // Tab State
  const [activeTab, setActiveTab] = useState<'files' | 'folders' | 'posts' | 'links' | 'activity'>('files');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Selected item for deletion request
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'folder' | 'file'; id: string; name: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  // Forms State
  const [newFolderName, setNewFolderName] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [postMessage, setPostMessage] = useState('');
  const [postTags, setPostTags] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');

  // Wasabi Upload State
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Axios instance helper with Client Token
  const clientApi = axiosClient();

  function axiosClient() {
    return {
      get: (url: string) => api.get(url, { headers: { Authorization: `Bearer ${token}` } }),
      post: (url: string, data?: any) => api.post(url, data, { headers: { Authorization: `Bearer ${token}` } }),
      postForm: (url: string, formData: FormData) =>
        api.post(url, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }),
    };
  }

  // Fetch Client Profile
  const { data: profile } = useQuery({
    queryKey: ['portal-me'],
    queryFn: async () => {
      const { data } = await clientApi.get('/v1/portal/auth/me');
      return data.data;
    },
    enabled: !!token,
  });

  // Fetch Workspace Folders
  const { data: folders = [] } = useQuery({
    queryKey: ['portal-folders'],
    queryFn: async () => {
      const { data } = await clientApi.get('/v1/portal/folders');
      return data.data;
    },
    enabled: !!token,
  });

  // Fetch Workspace Files
  const { data: files = [] } = useQuery({
    queryKey: ['portal-files', selectedFolderId],
    queryFn: async () => {
      const url = selectedFolderId ? `/v1/portal/files?folderId=${selectedFolderId}` : '/v1/portal/files';
      const { data } = await clientApi.get(url);
      return data.data;
    },
    enabled: !!token,
  });

  // Fetch Text Posts
  const { data: textPosts = [] } = useQuery({
    queryKey: ['portal-posts'],
    queryFn: async () => {
      const { data } = await clientApi.get('/v1/portal/text-posts');
      return data.data;
    },
    enabled: !!token,
  });

  // Fetch Links
  const { data: links = [] } = useQuery({
    queryKey: ['portal-links'],
    queryFn: async () => {
      const { data } = await clientApi.get('/v1/portal/links');
      return data.data;
    },
    enabled: !!token,
  });

  // Fetch Activities
  const { data: activities = [] } = useQuery({
    queryKey: ['portal-activities'],
    queryFn: async () => {
      const { data } = await clientApi.get('/v1/portal/activities');
      return data.data;
    },
    enabled: !!token,
  });

  // Perform Wasabi Upload (with S3 presigned URL + automatic Server Proxy fallback)
  const uploadFilesToWasabi = async (filesToUpload: File[]) => {
    if (!filesToUpload.length) return;
    try {
      setUploading(true);
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        if (!file) continue;
        setUploadProgress(10 + Math.round((i / filesToUpload.length) * 80));

        let uploadSuccess = false;

        // Try direct browser presigned S3 upload first
        try {
          const { data: presignedRes } = await clientApi.post('/v1/portal/upload-url', {
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            folderId: selectedFolderId || undefined,
          });

          const { uploadUrl, objectKey } = presignedRes.data;

          const s3Res = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type || 'application/octet-stream' },
            body: file,
          });

          if (!s3Res.ok) throw new Error(`S3 returned ${s3Res.status}`);

          await clientApi.post('/v1/portal/files/complete', {
            originalFileName: file.name,
            objectKey,
            fileSize: file.size,
            mimeType: file.type,
            folderId: selectedFolderId || undefined,
          });

          uploadSuccess = true;
        } catch (s3Error) {
          // Direct browser S3 failed (e.g. ERR_CONNECTION_RESET or S3 CORS), seamless fallback to backend upload
          const formData = new FormData();
          formData.append('file', file);
          if (selectedFolderId) formData.append('folderId', selectedFolderId);

          await clientApi.postForm('/v1/portal/files/upload-direct', formData);
          uploadSuccess = true;
        }
      }

      setUploadProgress(100);
      toast.success(`${filesToUpload.length} file(s) uploaded successfully!`);
      setSelectedFiles([]);
      setIsUploadModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['portal-files'] });
      queryClient.invalidateQueries({ queryKey: ['portal-activities'] });
    } catch (err) {
      toast.error('Upload failed. Please check file and try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Drag & Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      uploadFilesToWasabi(droppedFiles);
    }
  };

  // Clipboard Paste listener for screenshots
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item && item.kind === 'file') {
          const file = item.getAsFile();
          if (file) pastedFiles.push(file);
        }
      }
      if (pastedFiles.length) {
        toast.success(`Pasted image detected (${pastedFiles.length} file)`);
        uploadFilesToWasabi(pastedFiles);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [selectedFolderId]);

  // Create Folder
  const createFolderMutation = useMutation({
    mutationFn: async () => {
      const { data } = await clientApi.post('/v1/portal/folders', { name: newFolderName });
      return data;
    },
    onSuccess: () => {
      toast.success('Folder created!');
      setIsFolderModalOpen(false);
      setNewFolderName('');
      queryClient.invalidateQueries({ queryKey: ['portal-folders'] });
    },
    onError: () => toast.error('Failed to create folder'),
  });

  // Create Text Post
  const createPostMutation = useMutation({
    mutationFn: async () => {
      const tagsArr = postTags.split(',').map((t) => t.trim()).filter(Boolean);
      const { data } = await clientApi.post('/v1/portal/text-posts', {
        title: postTitle,
        message: postMessage,
        tags: tagsArr,
        folderId: selectedFolderId || undefined,
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Message posted to workspace!');
      setIsPostModalOpen(false);
      setPostTitle('');
      setPostMessage('');
      setPostTags('');
      queryClient.invalidateQueries({ queryKey: ['portal-posts'] });
      queryClient.invalidateQueries({ queryKey: ['portal-activities'] });
    },
    onError: () => toast.error('Failed to post message'),
  });

  // Submit Link
  const createLinkMutation = useMutation({
    mutationFn: async () => {
      const { data } = await clientApi.post('/v1/portal/links', {
        url: linkUrl,
        title: linkTitle,
        folderId: selectedFolderId || undefined,
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Link added to workspace!');
      setIsLinkModalOpen(false);
      setLinkUrl('');
      setLinkTitle('');
      queryClient.invalidateQueries({ queryKey: ['portal-links'] });
      queryClient.invalidateQueries({ queryKey: ['portal-activities'] });
    },
    onError: () => toast.error('Failed to submit link'),
  });

  // Request Deletion
  const requestDeletionMutation = useMutation({
    mutationFn: async () => {
      if (!deleteTarget) return;
      const { data } = await clientApi.post('/v1/portal/deletion-request', {
        itemType: deleteTarget.type,
        itemId: deleteTarget.id,
        reason: deleteReason,
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Deletion request submitted to company admin!');
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      setDeleteReason('');
      queryClient.invalidateQueries({ queryKey: ['portal-folders'] });
      queryClient.invalidateQueries({ queryKey: ['portal-files'] });
    },
    onError: () => toast.error('Failed to submit deletion request'),
  });

  // Download File via Wasabi S3 or Local Disk Storage
  const handleDownloadFile = (fileId: string) => {
    try {
      const token = localStorage.getItem('clientToken');
      const baseURL = import.meta.env.VITE_API_URL || '/api';
      const downloadEndpoint = `${baseURL.replace(/\/$/, '')}/v1/portal/files/${fileId}/download?token=${token}`;
      window.open(downloadEndpoint, '_blank');
    } catch (e) {
      toast.error('Could not download file');
    }
  };

  // Open Universal Document Viewer
  const handleOpenPreview = (fileItem: any) => {
    const clientToken = localStorage.getItem('clientToken');
    const baseURL = import.meta.env.VITE_API_URL || '/api';
    const downloadUrl = `${baseURL.replace(/\/$/, '')}/v1/portal/files/${fileItem.id}/download?token=${clientToken}`;
    setPreviewFile({
      ...fileItem,
      downloadUrl,
    });
    setIsPreviewOpen(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('clientToken');
    localStorage.removeItem('clientInfo');
    toast.success('Logged out successfully');
    navigate('/portal/login');
  };

  const clientName = profile?.firstName || profile?.customerName || clientInfo?.firstName || 'Client';
  const companyName = profile?.companyName || profile?.organization?.name || 'Workspace Vault';

  return (
    <div className="min-h-screen bg-[#FAF8FF] text-[#191B23] flex flex-col font-sans">
      
      {/* Top Header */}
      <header className="bg-white border-b border-[#E1E2ED] px-4 sm:px-8 h-16 flex items-center justify-between shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#2563EB] text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-sm">
            Q
          </div>
          <div>
            <h1 className="font-bold text-base text-[#191B23]">{companyName}</h1>
            <p className="text-xs text-[#737686]">Client Workspace Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border-l border-[#E1E2ED] pl-4">
            <span className="text-sm font-semibold text-[#191B23] hidden sm:block">Hello, {clientName}</span>
            <button
              onClick={handleLogout}
              className="p-2 text-[#737686] hover:text-[#ba1a1a] hover:bg-[#F3F3FE] rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-[1300px] w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Banner Card */}
        <div className="bg-white border border-[#E1E2ED] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#191B23]">Digital Client Workspace</h2>
            <p className="text-sm text-[#434655] mt-1">
              Store, view, and share project assets, quotations, invoices, and source code securely.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPostModalOpen(true)}
              className="px-4 py-2.5 bg-[#F3F3FE] border border-[#E1E2ED] text-[#191B23] rounded-xl font-semibold text-sm hover:bg-[#EDEDF9] transition-colors flex items-center gap-2"
            >
              <MessageSquare size={16} className="text-[#2563EB]" /> New Note Post
            </button>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2.5 bg-[#2563EB] text-white rounded-xl font-semibold text-sm hover:bg-[#1D4ED8] transition-colors shadow-sm flex items-center gap-2"
            >
              <UploadCloud size={16} /> Upload Files
            </button>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#737686]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Global Search workspace files, folders, notes, and submitted links..."
            className="w-full h-12 pl-11 pr-4 bg-white border border-[#E1E2ED] rounded-xl text-sm text-[#191B23] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none shadow-sm"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-[#E1E2ED] flex gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('files')}
            className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'files' ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#737686] hover:text-[#191B23]'
            }`}
          >
            <FileText size={16} /> Files ({files.length})
          </button>
          <button
            onClick={() => setActiveTab('folders')}
            className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'folders' ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#737686] hover:text-[#191B23]'
            }`}
          >
            <Folder size={16} /> Folders ({folders.length})
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'posts' ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#737686] hover:text-[#191B23]'
            }`}
          >
            <MessageSquare size={16} /> Text Posts ({textPosts.length})
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'links' ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#737686] hover:text-[#191B23]'
            }`}
          >
            <LinkIcon size={16} /> Links ({links.length})
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'activity' ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#737686] hover:text-[#191B23]'
            }`}
          >
            <Activity size={16} /> Activity Timeline
          </button>
        </div>

        {/* Tab 1: Files */}
        {activeTab === 'files' && (
          <div className="space-y-6">
            
            {/* Drag & Drop Upload Zone Card */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`w-full min-w-0 bg-white border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center flex flex-col items-center justify-center transition-all shadow-sm ${
                dragActive ? 'border-[#2563EB] bg-[#F3F3FE]' : 'border-[#E1E2ED] hover:border-[#2563EB]'
              }`}
            >
              <div className="w-14 h-14 bg-[#F3F3FE] text-[#2563EB] rounded-2xl flex items-center justify-center mb-3 border border-[#2563EB]/20 shrink-0">
                <UploadCloud size={32} />
              </div>

              <h3 className="font-bold text-lg text-[#191B23] w-full tracking-tight">
                Drag & Drop files here or click to upload
              </h3>
              
              {/* File Type Pill Badges */}
              <div className="w-full flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto mt-4">
                {[
                  'PDF',
                  'Word',
                  'Excel',
                  'PPT',
                  'TXT',
                  'CSV',
                  'Images',
                  'Videos',
                  'Audio',
                  'APK',
                  'AAB',
                  'ZIP',
                  'PSD',
                  'AI',
                  'FIG',
                ].map((ext) => (
                  <span
                    key={ext}
                    className="inline-flex items-center px-2.5 py-1 bg-[#F3F3FE] border border-[#E1E2ED] text-[#2563EB] rounded-lg text-xs font-semibold shrink-0"
                  >
                    {ext}
                  </span>
                ))}
              </div>

              <p className="w-full text-xs text-[#737686] max-w-xl mx-auto mt-3 leading-relaxed">
                Directly encrypted in Wasabi Cloud S3. You can also paste screenshots from your clipboard!
              </p>

              <div className="mt-5">
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      uploadFilesToWasabi(Array.from(e.target.files));
                    }
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-[#2563EB] text-white rounded-xl font-semibold text-sm hover:bg-[#1D4ED8] transition-all shadow-md active:scale-95"
                >
                  Browse Files
                </button>
              </div>

              {uploading && (
                <div className="max-w-xs mx-auto mt-4 space-y-1">
                  <div className="flex justify-between text-xs font-bold text-[#191B23]">
                    <span>Uploading to Wasabi...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-[#F3F3FE] rounded-full h-2 overflow-hidden">
                    <div className="bg-[#2563EB] h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Files List Table */}
            <div className="bg-white border border-[#E1E2ED] rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-[#E1E2ED] flex justify-between items-center bg-[#FAF8FF]">
                <h3 className="font-bold text-base text-[#191B23]">Vault Files</h3>
                <span className="text-xs text-[#737686]">{files.length} items</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E1E2ED] text-xs font-bold text-[#737686] uppercase tracking-wider bg-[#FAF8FF]">
                      <th className="py-3 px-6">File Name</th>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-4">Uploaded By</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1E2ED]/60 text-sm">
                    {files.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-[#737686]">
                          No files uploaded to workspace yet. Drag and drop a file above to start!
                        </td>
                      </tr>
                    ) : (
                      files
                        .filter((f: any) => !searchQuery || f.originalFileName.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((f: any) => (
                          <tr key={f.id} className="hover:bg-[#F3F3FE]/50 transition-colors">
                            <td className="py-3.5 px-6 font-semibold text-[#191B23]">
                              <div
                                onClick={() => handleOpenPreview(f)}
                                className="flex items-center gap-3 cursor-pointer group min-w-0"
                              >
                                <div className="w-9 h-9 bg-[#2563EB]/10 text-[#2563EB] rounded-lg flex items-center justify-center shrink-0 group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                                  <FileText size={18} />
                                </div>
                                <div className="min-w-0">
                                  <span className="group-hover:text-[#2563EB] transition-colors font-semibold truncate block" title={f.originalFileName}>
                                    {f.originalFileName}
                                  </span>
                                  {f.folder && (
                                    <span className="block text-xs text-[#737686] font-normal truncate">
                                      in {f.folder.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-[#737686]">
                              {(f.fileSize / (1024 * 1024)).toFixed(2)} MB
                            </td>
                            <td className="py-3.5 px-4 capitalize text-[#737686] font-medium">
                              {f.uploadedByRole}
                            </td>
                            <td className="py-3.5 px-4 text-[#737686] text-xs">
                              {new Date(f.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3.5 px-6 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setSelectedFileForSidebar(f)}
                                  className="p-2 border border-[#E1E2ED] text-[#434655] hover:text-[#2563EB] hover:bg-[#F3F3FE] rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                                  title="View / Add Comments"
                                >
                                  <MessageSquare size={16} />
                                </button>
                                <button
                                  onClick={() => handleDownloadFile(f.id)}
                                  className="p-2 border border-[#E1E2ED] text-[#434655] hover:text-[#2563EB] hover:bg-[#F3F3FE] rounded-lg transition-colors"
                                  title="Download File"
                                >
                                  <Download size={16} />
                                </button>
                                <button
                                  onClick={() => {
                                    setDeleteTarget({ type: 'file', id: f.id, name: f.originalFileName });
                                    setIsDeleteModalOpen(true);
                                  }}
                                  className="p-2 border border-[#E1E2ED] text-[#737686] hover:text-[#ba1a1a] hover:bg-[#F3F3FE] rounded-lg transition-colors"
                                  title="Request Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Folders */}
        {activeTab === 'folders' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#191B23]">Workspace Folders</h3>
              <button
                onClick={() => setIsFolderModalOpen(true)}
                className="px-4 py-2 bg-[#2563EB] text-white rounded-xl font-semibold text-sm hover:bg-[#1D4ED8] transition-colors flex items-center gap-2"
              >
                <FolderPlus size={16} /> Create Folder
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {folders.map((f: any) => (
                <div
                  key={f.id}
                  onClick={() => setSelectedFolderId(f.id === selectedFolderId ? null : f.id)}
                  className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-3 ${
                    selectedFolderId === f.id ? 'border-[#2563EB] ring-2 ring-[#2563EB]/10' : 'border-[#E1E2ED]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="w-11 h-11 bg-[#2563EB]/10 text-[#2563EB] rounded-xl flex items-center justify-center">
                      <Folder size={22} />
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-[#F3F3FE] text-[#2563EB]">
                      {f.visibility.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-[#191B23]">{f.name}</h4>
                    <p className="text-xs text-[#737686] mt-0.5">{f.files?.length || 0} files stored</p>
                  </div>
                  <div className="pt-2 border-t border-[#E1E2ED] flex justify-between items-center">
                    <span className="text-xs text-[#737686]">Created by {f.createdByRole}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ type: 'folder', id: f.id, name: f.name });
                        setIsDeleteModalOpen(true);
                      }}
                      className="text-xs text-[#737686] hover:text-[#ba1a1a] font-semibold"
                    >
                      Request Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Text Posts (Messages) */}
        {activeTab === 'posts' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#191B23]">Text Messages & Requests</h3>
              <button
                onClick={() => setIsPostModalOpen(true)}
                className="px-4 py-2 bg-[#2563EB] text-white rounded-xl font-semibold text-sm hover:bg-[#1D4ED8] transition-colors flex items-center gap-2"
              >
                <MessageSquare size={16} /> New Text Post
              </button>
            </div>

            <div className="space-y-4 max-w-3xl">
              {textPosts.length === 0 ? (
                <div className="bg-white border border-[#E1E2ED] rounded-2xl p-8 text-center text-[#737686]">
                  No messages or notes posted yet. Click "New Text Post" to leave project notes!
                </div>
              ) : (
                textPosts.map((post: any) => (
                  <div key={post.id} className="bg-white border border-[#E1E2ED] rounded-2xl p-5 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-sm">
                          {post.authorName ? post.authorName.slice(0, 2).toUpperCase() : 'C'}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#191B23]">{post.authorName || 'Client'}</h4>
                          <span className="text-xs text-[#737686]">
                            {new Date(post.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F3F3FE] text-[#2563EB] capitalize">
                        {post.authorRole}
                      </span>
                    </div>

                    {post.title && <h5 className="font-bold text-base text-[#191B23]">{post.title}</h5>}

                    <p className="text-sm text-[#434655] whitespace-pre-wrap leading-relaxed">
                      {post.message}
                    </p>

                    {post.tags && post.tags.length > 0 && (
                      <div className="flex gap-2 flex-wrap pt-2">
                        {post.tags.map((tag: string, idx: number) => (
                          <span key={idx} className="bg-[#EEEOFF] text-[#2563EB] text-xs font-medium px-2.5 py-0.5 rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Links */}
        {activeTab === 'links' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#191B23]">External Project Links</h3>
              <button
                onClick={() => setIsLinkModalOpen(true)}
                className="px-4 py-2 bg-[#2563EB] text-white rounded-xl font-semibold text-sm hover:bg-[#1D4ED8] transition-colors flex items-center gap-2"
              >
                <LinkIcon size={16} /> Submit Link
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {links.length === 0 ? (
                <div className="col-span-full bg-white border border-[#E1E2ED] rounded-2xl p-8 text-center text-[#737686]">
                  No links submitted yet. Add Figma, Google Drive, YouTube, or GitHub URLs.
                </div>
              ) : (
                links.map((lnk: any) => (
                  <a
                    key={lnk.id}
                    href={lnk.url}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-white border border-[#E1E2ED] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-3 block group"
                  >
                    <div className="flex justify-between items-center">
                      <span className="bg-[#2563EB]/10 text-[#2563EB] font-bold text-xs px-2.5 py-0.5 rounded-full">
                        {lnk.websiteName || 'Link'}
                      </span>
                      <ExternalLink size={16} className="text-[#737686] group-hover:text-[#2563EB] transition-colors" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-[#191B23] group-hover:text-[#2563EB] transition-colors">
                        {lnk.title || lnk.url}
                      </h4>
                      <p className="text-xs text-[#737686] truncate mt-1">{lnk.url}</p>
                    </div>
                  </a>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Activity Timeline */}
        {activeTab === 'activity' && (
          <div className="bg-white border border-[#E1E2ED] rounded-2xl p-6 shadow-sm space-y-6 max-w-3xl">
            <h3 className="font-bold text-lg text-[#191B23]">Chronological Workspace Activity</h3>

            <div className="relative space-y-6 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-[#E1E2ED]">
              {activities.map((act: any) => (
                <div key={act.id} className="relative pl-10 flex justify-between items-start gap-4">
                  <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-[#F3F3FE] border border-[#E1E2ED] flex items-center justify-center text-[#2563EB] z-10">
                    <Activity size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#191B23]">{act.description}</h4>
                    <p className="text-xs text-[#737686] mt-0.5">By {act.actorName} ({act.actorRole})</p>
                  </div>
                  <span className="text-xs text-[#737686] font-mono whitespace-nowrap">
                    {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* Modals */}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Upload Files to Vault">
          <div className="space-y-4 pt-2">
            <input
              type="file"
              multiple
              onChange={(e) => {
                if (e.target.files?.length) {
                  uploadFilesToWasabi(Array.from(e.target.files));
                }
              }}
              className="block w-full text-sm text-[#737686] file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#2563EB] file:text-white hover:file:bg-[#1D4ED8] cursor-pointer"
            />
            {uploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span>Uploading directly to Wasabi Cloud...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-[#F3F3FE] rounded-full h-2 overflow-hidden">
                  <div className="bg-[#2563EB] h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Folder Creation Modal */}
      {isFolderModalOpen && (
        <Modal isOpen={isFolderModalOpen} onClose={() => setIsFolderModalOpen(false)} title="Create Workspace Folder">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createFolderMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            <div>
              <label className="block text-xs font-semibold text-[#191B23] uppercase tracking-wider mb-1">Folder Name</label>
              <input
                type="text"
                required
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. Raw Assets & Media"
                className="w-full h-11 px-4 bg-[#F3F3FE] border border-[#E1E2ED] rounded-xl text-sm text-[#191B23] outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsFolderModalOpen(false)}
                className="px-4 py-2 border border-[#E1E2ED] text-sm font-semibold rounded-xl text-[#737686]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createFolderMutation.isPending}
                className="px-4 py-2 bg-[#2563EB] text-white text-sm font-semibold rounded-xl hover:bg-[#1D4ED8]"
              >
                {createFolderMutation.isPending ? 'Creating...' : 'Create Folder'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Text Post Modal */}
      {isPostModalOpen && (
        <Modal isOpen={isPostModalOpen} onClose={() => setIsPostModalOpen(false)} title="Create Text Note / Post">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createPostMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            <div>
              <label className="block text-xs font-semibold text-[#191B23] uppercase tracking-wider mb-1">Title (Optional)</label>
              <input
                type="text"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="e.g. Logo change request"
                className="w-full h-10 px-3 bg-[#F3F3FE] border border-[#E1E2ED] rounded-xl text-sm text-[#191B23] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#191B23] uppercase tracking-wider mb-1">Message Content</label>
              <textarea
                required
                rows={4}
                value={postMessage}
                onChange={(e) => setPostMessage(e.target.value)}
                placeholder="Type your message, notes, or instructions here..."
                className="w-full p-3 bg-[#F3F3FE] border border-[#E1E2ED] rounded-xl text-sm text-[#191B23] outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#191B23] uppercase tracking-wider mb-1">Tags (Comma-separated)</label>
              <input
                type="text"
                value={postTags}
                onChange={(e) => setPostTags(e.target.value)}
                placeholder="urgent, design, branding"
                className="w-full h-10 px-3 bg-[#F3F3FE] border border-[#E1E2ED] rounded-xl text-sm text-[#191B23] outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPostModalOpen(false)}
                className="px-4 py-2 border border-[#E1E2ED] text-sm font-semibold rounded-xl text-[#737686]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createPostMutation.isPending}
                className="px-4 py-2 bg-[#2563EB] text-white text-sm font-semibold rounded-xl hover:bg-[#1D4ED8]"
              >
                {createPostMutation.isPending ? 'Posting...' : 'Post Message'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Submit Link Modal */}
      {isLinkModalOpen && (
        <Modal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} title="Submit External Link">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createLinkMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            <div>
              <label className="block text-xs font-semibold text-[#191B23] uppercase tracking-wider mb-1">Link URL</label>
              <input
                type="url"
                required
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://figma.com/file/..."
                className="w-full h-10 px-3 bg-[#F3F3FE] border border-[#E1E2ED] rounded-xl text-sm text-[#191B23] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#191B23] uppercase tracking-wider mb-1">Link Title</label>
              <input
                type="text"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="e.g. Brand Guidelines Figma Design"
                className="w-full h-10 px-3 bg-[#F3F3FE] border border-[#E1E2ED] rounded-xl text-sm text-[#191B23] outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="px-4 py-2 border border-[#E1E2ED] text-sm font-semibold rounded-xl text-[#737686]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLinkMutation.isPending}
                className="px-4 py-2 bg-[#2563EB] text-white text-sm font-semibold rounded-xl hover:bg-[#1D4ED8]"
              >
                {createLinkMutation.isPending ? 'Submitting...' : 'Add Link'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Deletion Request Modal */}
      {isDeleteModalOpen && deleteTarget && (
        <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title={`Request Deletion of ${deleteTarget.type}`}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              requestDeletionMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            <p className="text-sm text-[#434655]">
              You are requesting deletion of <b>{deleteTarget.name}</b>. Company admins will be notified to confirm deletion.
            </p>
            <div>
              <label className="block text-xs font-semibold text-[#191B23] uppercase tracking-wider mb-1">Reason for Deletion</label>
              <textarea
                rows={3}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Please state why this file/folder should be removed..."
                className="w-full p-3 bg-[#F3F3FE] border border-[#E1E2ED] rounded-xl text-sm text-[#191B23] outline-none resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border border-[#E1E2ED] text-sm font-semibold rounded-xl text-[#737686]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={requestDeletionMutation.isPending}
                className="px-4 py-2 bg-[#ba1a1a] text-white text-sm font-semibold rounded-xl hover:bg-[#93000a]"
              >
                {requestDeletionMutation.isPending ? 'Submitting...' : 'Submit Deletion Request'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Universal Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        file={previewFile}
      />

      {/* Document Details & Discussion Comments Sidebar */}
      {selectedFileForSidebar && (
        <div className="fixed inset-y-0 right-0 z-50 shadow-2xl">
          <DocumentDetailsCommentsSidebar
            file={selectedFileForSidebar}
            isClientPortal={true}
            onClose={() => setSelectedFileForSidebar(null)}
            onOpenViewer={handleOpenPreview}
          />
        </div>
      )}
    </div>
  );
}
