import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/shared/lib/axios';
import {
  Search,
  Upload,
  Filter,
  LayoutGrid,
  List,
  FileText,
  Folder,
  Image as ImageIcon,
  Link as LinkIcon,
  MessageSquare,
  MoreVertical,
  Download,
  Trash2,
  ExternalLink,
  Plus,
  Loader2,
  FileCode,
  FileSpreadsheet,
  FileArchive,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Sparkles,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal from '@/shared/components/ui/Modal';
import DocumentViewerModal, { ViewerFile } from '@/shared/components/ui/DocumentViewerModal';
import DocumentDetailsCommentsSidebar from '@/shared/components/ui/DocumentDetailsCommentsSidebar';

interface CustomerDocumentsTabProps {
  customerId: string;
  customerName: string;
}

export default function CustomerDocumentsTab({ customerId, customerName }: CustomerDocumentsTabProps) {
  const queryClient = useQueryClient();

  // Selected Directory filter
  const [selectedDirectory, setSelectedDirectory] = useState<
    'all' | 'quotations' | 'invoices' | 'contracts' | 'projects' | 'client_uploads' | 'notes' | 'links'
  >('all');

  // Search & Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Advanced Filters
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('newest');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [versionFilter, setVersionFilter] = useState('all');

  // Sidebar / Split Panel state
  const [selectedFileForSidebar, setSelectedFileForSidebar] = useState<any | null>(null);

  // Preview Modal state
  const [previewFile, setPreviewFile] = useState<ViewerFile | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  // Forms state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteMessage, setNoteMessage] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');

  // Uploading state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Customer Workspace Files
  const { data: files = [], isLoading: loadingFiles } = useQuery<any[]>({
    queryKey: ['admin-customer-files', customerId],
    queryFn: async () => {
      const { data } = await api.get(`/v1/customers/${customerId}/portal/files`);
      return data.data || [];
    },
  });

  // 2. Fetch Customer Workspace Folders
  const { data: folders = [] } = useQuery<any[]>({
    queryKey: ['admin-customer-folders', customerId],
    queryFn: async () => {
      const { data } = await api.get(`/v1/customers/${customerId}/portal/folders`);
      return data.data || [];
    },
  });

  // 3. Fetch Customer Text Notes / Posts
  const { data: notes = [] } = useQuery<any[]>({
    queryKey: ['admin-customer-notes', customerId],
    queryFn: async () => {
      const { data } = await api.get(`/v1/customers/${customerId}/portal/text-posts`);
      return data.data || [];
    },
  });

  // 4. Fetch Customer Links
  const { data: links = [] } = useQuery<any[]>({
    queryKey: ['admin-customer-links', customerId],
    queryFn: async () => {
      const { data } = await api.get(`/v1/customers/${customerId}/portal/links`);
      return data.data || [];
    },
  });

  // 5. Fetch Customer Quotations
  const { data: quotations = [] } = useQuery<any[]>({
    queryKey: ['admin-customer-quotations', customerId],
    queryFn: async () => {
      const { data } = await api.get('/v1/quotations');
      return (data.data || []).filter((q: any) => q.customer?.id === customerId);
    },
  });

  // 6. Fetch Customer Invoices
  const { data: invoices = [] } = useQuery<any[]>({
    queryKey: ['admin-customer-invoices', customerId],
    queryFn: async () => {
      const { data } = await api.get('/v1/invoices');
      return (data.data || []).filter((inv: any) => inv.customer?.id === customerId);
    },
  });

  // Upload File Handler (Direct Proxy + S3)
  const handleUploadFiles = async (filesToUpload: File[]) => {
    if (!filesToUpload.length) return;
    try {
      setUploading(true);
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        if (!file) continue;
        setUploadProgress(10 + Math.round((i / filesToUpload.length) * 80));

        const formData = new FormData();
        formData.append('file', file);

        await api.post(`/v1/customers/${customerId}/portal/files/upload-direct`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setUploadProgress(100);
      toast.success(`${filesToUpload.length} document(s) uploaded to customer vault!`);
      setIsUploadModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-customer-files', customerId] });
    } catch (err) {
      toast.error('Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Add Note Handler
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteMessage.trim()) return;
    try {
      await api.post(`/v1/customers/${customerId}/portal/text-posts`, {
        title: noteTitle,
        message: noteMessage,
      });
      toast.success('Document note added for customer!');
      setIsNoteModalOpen(false);
      setNoteTitle('');
      setNoteMessage('');
      queryClient.invalidateQueries({ queryKey: ['admin-customer-notes', customerId] });
    } catch {
      toast.error('Failed to add note');
    }
  };

  // Add Link Handler
  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    try {
      await api.post(`/v1/customers/${customerId}/portal/links`, {
        url: linkUrl,
        title: linkTitle || linkUrl,
      });
      toast.success('External link added!');
      setIsLinkModalOpen(false);
      setLinkUrl('');
      setLinkTitle('');
      queryClient.invalidateQueries({ queryKey: ['admin-customer-links', customerId] });
    } catch {
      toast.error('Failed to add link');
    }
  };

  // Download File Handler for Admin Workspace
  const handleDownloadFile = (fileId: string) => {
    const downloadUrl = getFileStreamUrl(fileId);
    window.open(downloadUrl, '_blank');
  };

  // Get authenticated stream URL for file
  const getFileStreamUrl = (fileId: string) => {
    const tokens = localStorage.getItem('qt_tokens');
    let accessToken = '';
    if (tokens) {
      try {
        accessToken = JSON.parse(tokens).accessToken || JSON.parse(tokens).token || '';
      } catch (e) {}
    }
    const baseURL = import.meta.env.VITE_API_URL || '/api';
    return `${baseURL.replace(/\/$/, '')}/v1/customers/${customerId}/portal/files/${fileId}/download?token=${accessToken}`;
  };

  // Open Universal Document Viewer
  const handleOpenPreview = (fileItem: any) => {
    const downloadUrl = getFileStreamUrl(fileItem.id);
    setPreviewFile({
      ...fileItem,
      downloadUrl,
    });
    setIsPreviewOpen(true);
  };

  // Directory Category Filters
  const quotationsCount = quotations.length;
  const invoicesCount = invoices.length;
  const contractsCount = files.filter(
    (f: any) =>
      f.extension?.includes('pdf') ||
      f.extension?.includes('doc') ||
      f.originalFileName?.toLowerCase().includes('contract')
  ).length;
  const projectsCount = files.filter(
    (f: any) =>
      f.mimeType?.startsWith('image') ||
      f.mimeType?.startsWith('video') ||
      f.extension?.includes('fig') ||
      f.extension?.includes('psd') ||
      f.extension?.includes('ai')
  ).length;
  const clientUploadsCount = files.filter((f: any) => f.uploadedByRole === 'client').length;
  const notesCount = notes.length;
  const linksCount = links.length;
  const totalFilesCount = files.length + quotationsCount + invoicesCount + notesCount + linksCount;

  // Storage calculation
  const totalStorageBytes = files.reduce((acc: number, f: any) => acc + Number(f.fileSize || 0), 0);
  const totalStorageMB = (totalStorageBytes / (1024 * 1024)).toFixed(1);

  // Filtered files list based on active directory and search
  const filteredFiles = files.filter((f: any) => {
    const matchesSearch = !searchQuery || f.originalFileName.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedDirectory === 'contracts') {
      return (
        f.extension?.includes('pdf') ||
        f.extension?.includes('doc') ||
        f.originalFileName?.toLowerCase().includes('contract')
      );
    }
    if (selectedDirectory === 'projects') {
      return (
        f.mimeType?.startsWith('image') ||
        f.mimeType?.startsWith('video') ||
        f.extension?.includes('fig') ||
        f.extension?.includes('psd') ||
        f.extension?.includes('ai')
      );
    }
    if (selectedDirectory === 'client_uploads') {
      return f.uploadedByRole === 'client';
    }
    return true;
  });

  return (
    <div className="bg-white border border-[#E1E2ED] rounded-2xl shadow-sm overflow-hidden font-sans">
      <div className="flex flex-col lg:flex-row min-h-[680px]">
        
        {/* ── LEFT SIDEBAR: DIRECTORIES ───────────────────────────────────── */}
        <aside className="w-full lg:w-64 bg-[#FAF8FF] border-b lg:border-b-0 lg:border-r border-[#E1E2ED] p-5 shrink-0 flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-[#191B23] tracking-tight">Directories</h3>
              <p className="text-xs text-[#737686] mt-0.5">Files & assets for {customerName}</p>
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => setSelectedDirectory('all')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                  selectedDirectory === 'all'
                    ? 'bg-[#2563EB] text-white shadow-sm font-bold'
                    : 'text-[#434655] hover:bg-[#F3F3FE] hover:text-[#191B23]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Folder size={18} className={selectedDirectory === 'all' ? 'text-white' : 'text-[#2563EB]'} />
                  <span>All Files</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    selectedDirectory === 'all' ? 'bg-white/20 text-white' : 'bg-[#2563EB]/10 text-[#2563EB]'
                  }`}
                >
                  {totalFilesCount}
                </span>
              </button>

              <button
                onClick={() => setSelectedDirectory('quotations')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                  selectedDirectory === 'quotations'
                    ? 'bg-[#2563EB] text-white shadow-sm font-bold'
                    : 'text-[#434655] hover:bg-[#F3F3FE] hover:text-[#191B23]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText size={18} className={selectedDirectory === 'quotations' ? 'text-white' : 'text-[#737686]'} />
                  <span>Quotations</span>
                </div>
                <span className="text-xs text-[#737686] font-data-mono">{quotationsCount}</span>
              </button>

              <button
                onClick={() => setSelectedDirectory('invoices')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                  selectedDirectory === 'invoices'
                    ? 'bg-[#2563EB] text-white shadow-sm font-bold'
                    : 'text-[#434655] hover:bg-[#F3F3FE] hover:text-[#191B23]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <DollarSign size={18} className={selectedDirectory === 'invoices' ? 'text-white' : 'text-[#737686]'} />
                  <span>Invoices</span>
                </div>
                <span className="text-xs text-[#737686] font-data-mono">{invoicesCount}</span>
              </button>

              <button
                onClick={() => setSelectedDirectory('contracts')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                  selectedDirectory === 'contracts'
                    ? 'bg-[#2563EB] text-white shadow-sm font-bold'
                    : 'text-[#434655] hover:bg-[#F3F3FE] hover:text-[#191B23]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText size={18} className={selectedDirectory === 'contracts' ? 'text-white' : 'text-[#737686]'} />
                  <span>Contracts & PDFs</span>
                </div>
                <span className="text-xs text-[#737686] font-data-mono">{contractsCount}</span>
              </button>

              <button
                onClick={() => setSelectedDirectory('projects')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                  selectedDirectory === 'projects'
                    ? 'bg-[#2563EB] text-white shadow-sm font-bold'
                    : 'text-[#434655] hover:bg-[#F3F3FE] hover:text-[#191B23]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ImageIcon size={18} className={selectedDirectory === 'projects' ? 'text-white' : 'text-[#737686]'} />
                  <span>Projects & Media</span>
                </div>
                <span className="text-xs text-[#737686] font-data-mono">{projectsCount}</span>
              </button>

              <button
                onClick={() => setSelectedDirectory('client_uploads')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                  selectedDirectory === 'client_uploads'
                    ? 'bg-[#2563EB] text-white shadow-sm font-bold'
                    : 'text-[#434655] hover:bg-[#F3F3FE] hover:text-[#191B23]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Upload size={18} className={selectedDirectory === 'client_uploads' ? 'text-white' : 'text-[#737686]'} />
                  <span>Client Uploads</span>
                </div>
                <span className="text-xs text-[#737686] font-data-mono">{clientUploadsCount}</span>
              </button>

              <button
                onClick={() => setSelectedDirectory('notes')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                  selectedDirectory === 'notes'
                    ? 'bg-[#2563EB] text-white shadow-sm font-bold'
                    : 'text-[#434655] hover:bg-[#F3F3FE] hover:text-[#191B23]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare size={18} className={selectedDirectory === 'notes' ? 'text-white' : 'text-[#737686]'} />
                  <span>Text Notes</span>
                </div>
                <span className="text-xs text-[#737686] font-data-mono">{notesCount}</span>
              </button>

              <button
                onClick={() => setSelectedDirectory('links')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                  selectedDirectory === 'links'
                    ? 'bg-[#2563EB] text-white shadow-sm font-bold'
                    : 'text-[#434655] hover:bg-[#F3F3FE] hover:text-[#191B23]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <LinkIcon size={18} className={selectedDirectory === 'links' ? 'text-white' : 'text-[#737686]'} />
                  <span>Links & Resources</span>
                </div>
                <span className="text-xs text-[#737686] font-data-mono">{linksCount}</span>
              </button>
            </nav>
          </div>

          {/* Storage Used Gauge Bar */}
          <div className="pt-6 border-t border-[#E1E2ED] space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-[#191B23]">Storage Used</span>
              <span className="font-semibold text-[#2563EB] font-data-mono">{totalStorageMB} MB / 10 GB</span>
            </div>
            <div className="w-full bg-[#E1E2ED] rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#2563EB] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min((Number(totalStorageMB) / 10240) * 100, 100)}%` }}
              />
            </div>
          </div>
        </aside>

        {/* ── RIGHT MAIN CONTENT AREA ────────────────────────────────────── */}
        <main className="flex-1 p-6 space-y-6 bg-white overflow-hidden">
          
          {/* Top Controls Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737686]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files, contracts, notes, and links..."
                className="w-full h-11 pl-10 pr-4 bg-[#FAF8FF] border border-[#E1E2ED] rounded-xl text-sm text-[#191B23] focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all outline-none"
              />
            </div>

            {/* Right Action Controls */}
            <div className="flex items-center gap-2 shrink-0">
              
              {/* Filter */}
              <button
                type="button"
                className="px-3.5 py-2.5 border border-[#E1E2ED] text-[#434655] hover:text-[#191B23] hover:bg-[#FAF8FF] rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <Filter size={15} />
                <span>Filter</span>
              </button>

              {/* Grid vs List View Switcher */}
              <div className="flex bg-[#F3F3FE] p-1 rounded-xl border border-[#E1E2ED]">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'grid' ? 'bg-white text-[#2563EB] shadow-sm' : 'text-[#737686] hover:text-[#191B23]'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'list' ? 'bg-white text-[#2563EB] shadow-sm' : 'text-[#737686] hover:text-[#191B23]'
                  }`}
                  title="List View"
                >
                  <List size={16} />
                </button>
              </div>

              {/* Upload Button */}
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="px-4 py-2.5 bg-[#2563EB] text-white rounded-xl font-semibold text-xs sm:text-sm hover:bg-[#1D4ED8] transition-all shadow-md flex items-center gap-2"
              >
                <Upload size={16} />
                <span>Upload</span>
              </button>
            </div>
          </div>

          {/* Directory Title Bar */}
          <div className="flex justify-between items-center border-b border-[#E1E2ED] pb-3">
            <h4 className="text-sm font-bold text-[#191B23] capitalize">
              {selectedDirectory === 'all' && 'All Customer Documents'}
              {selectedDirectory === 'quotations' && 'Generated Quotations'}
              {selectedDirectory === 'invoices' && 'Billing Invoices'}
              {selectedDirectory === 'contracts' && 'Contracts & Signed PDFs'}
              {selectedDirectory === 'projects' && 'Project Assets & Designs'}
              {selectedDirectory === 'client_uploads' && 'Client Direct Uploads'}
              {selectedDirectory === 'notes' && 'WhatsApp & Workspace Notes'}
              {selectedDirectory === 'links' && 'External Resources & Links'}
            </h4>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(true)}
                className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> Note
              </button>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(true)}
                className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> Link
              </button>
            </div>
          </div>

          {/* Loading Spinner */}
          {loadingFiles && (
            <div className="py-20 flex justify-center items-center">
              <Loader2 className="animate-spin text-[#2563EB]" size={32} />
            </div>
          )}

          {/* ── GRID VIEW ─────────────────────────────────────────────────── */}
          {!loadingFiles && viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
              
              {/* Render Quotations if selected */}
              {(selectedDirectory === 'all' || selectedDirectory === 'quotations') &&
                quotations.map((q: any) => (
                  <div
                    key={`q-${q.id}`}
                    className="bg-white border border-[#E1E2ED] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
                  >
                    <div className="h-32 bg-[#F3F3FE] flex items-center justify-center p-4 relative border-b border-[#E1E2ED]">
                      <FileText size={44} className="text-[#2563EB]" />
                      <span className="absolute top-3 left-3 bg-[#2563EB] text-white text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                        Quotation
                      </span>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <h5 className="font-bold text-sm text-[#191B23] truncate">{q.quotationNumber}</h5>
                      </div>
                      <p className="text-xs text-[#737686] font-semibold">{q.projectName || 'Estimate Proposal'}</p>
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="font-bold text-[#191B23]">₹{Number(q.grandTotal || 0).toLocaleString('en-IN')}</span>
                        <span className="text-[#737686] font-data-mono">{new Date(q.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}

              {/* Render Invoices if selected */}
              {(selectedDirectory === 'all' || selectedDirectory === 'invoices') &&
                invoices.map((inv: any) => (
                  <div
                    key={`inv-${inv.id}`}
                    className="bg-white border border-[#E1E2ED] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
                  >
                    <div className="h-32 bg-[#FAF8FF] flex items-center justify-center p-4 relative border-b border-[#E1E2ED]">
                      <DollarSign size={44} className="text-green-600" />
                      <span className="absolute top-3 left-3 bg-green-600 text-white text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                        Invoice
                      </span>
                    </div>
                    <div className="p-4 space-y-2">
                      <h5 className="font-bold text-sm text-[#191B23] truncate">{inv.invoiceNumber}</h5>
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="font-bold text-[#191B23]">₹{Number(inv.grandTotal || 0).toLocaleString('en-IN')}</span>
                        <span className="text-[#737686] font-data-mono">{new Date(inv.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}

              {/* Render Text Notes if selected */}
              {(selectedDirectory === 'all' || selectedDirectory === 'notes') &&
                notes.map((n: any) => (
                  <div
                    key={`note-${n.id}`}
                    className="bg-white border border-[#E1E2ED] rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#2563EB]">
                        <MessageSquare size={16} />
                        <span>{n.title || 'Workspace Note'}</span>
                      </div>
                      <p className="text-xs text-[#191B23] leading-relaxed line-clamp-4">{n.message}</p>
                    </div>
                    <div className="pt-3 border-t border-[#E1E2ED] mt-3 flex justify-between items-center text-[11px] text-[#737686]">
                      <span>{n.authorName || 'Team Note'}</span>
                      <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}

              {/* Render Links if selected */}
              {(selectedDirectory === 'all' || selectedDirectory === 'links') &&
                links.map((l: any) => (
                  <div
                    key={`link-${l.id}`}
                    className="bg-white border border-[#E1E2ED] rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-[#2563EB]">
                        <div className="flex items-center gap-2 truncate">
                          <LinkIcon size={16} />
                          <span className="truncate">{l.title || l.url}</span>
                        </div>
                        <a href={l.url} target="_blank" rel="noreferrer" className="text-[#737686] hover:text-[#2563EB]">
                          <ExternalLink size={14} />
                        </a>
                      </div>
                      <p className="text-xs text-[#737686] truncate font-mono">{l.url}</p>
                    </div>
                    <div className="pt-3 border-t border-[#E1E2ED] mt-3 text-[11px] text-[#737686] text-right">
                      {new Date(l.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}

              {/* Render Files Cards */}
              {filteredFiles.map((f: any) => {
                const isImage = f.mimeType?.startsWith('image');
                const isPdf = f.extension?.includes('pdf');
                const isFolder = f.extension?.includes('folder');

                return (
                  <div
                    key={`file-${f.id}`}
                    className="bg-white border border-[#E1E2ED] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
                  >
                    {/* Thumbnail Card Top */}
                    <div
                      onClick={() => handleOpenPreview(f)}
                      className="h-36 bg-[#F3F3FE] flex items-center justify-center p-3 relative border-b border-[#E1E2ED] overflow-hidden cursor-pointer"
                    >
                      {isImage ? (
                        <div className="w-full h-full rounded-xl overflow-hidden flex items-center justify-center bg-gray-100">
                          <img
                            src={getFileStreamUrl(f.id)}
                            alt={f.originalFileName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <ImageIcon size={40} className="text-[#2563EB]" />
                        </div>
                      ) : isPdf ? (
                        <div className="w-16 h-20 bg-red-500 text-white rounded-xl flex items-center justify-center font-extrabold text-lg shadow-md">
                          PDF
                        </div>
                      ) : isFolder ? (
                        <Folder size={48} className="text-[#2563EB]" />
                      ) : (
                        <FileText size={44} className="text-[#434655]" />
                      )}

                      {/* Download Button Overlay */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadFile(f.id);
                        }}
                        className="absolute top-3 right-3 p-2 bg-white/90 text-[#191B23] hover:text-[#2563EB] rounded-xl shadow-md opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                        title="Download File"
                      >
                        <Download size={16} />
                      </button>
                    </div>

                    {/* File Card Details */}
                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h5 className="font-bold text-sm text-[#191B23] truncate leading-tight" title={f.originalFileName}>
                            {f.originalFileName}
                          </h5>
                          <p className="text-[11px] text-[#737686] font-medium capitalize mt-0.5">
                            {f.folder?.name || 'Workspace Document'}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedFileForSidebar(f)}
                          className="text-[#737686] hover:text-[#2563EB] shrink-0 p-1"
                          title="Open Details & Discussion"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>

                      {/* Status Pills */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-md text-[10px] font-bold">
                          Approved
                        </span>
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[10px] font-bold">
                          Final
                        </span>
                      </div>

                      {/* Footer Bar: Avatar, Date, Version & Comments Button */}
                      <div className="pt-3 border-t border-[#E1E2ED] flex items-center justify-between text-xs text-[#737686]">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-[#2563EB] text-white font-bold flex items-center justify-center text-[10px]">
                            {f.uploadedByRole === 'client' ? 'C' : 'A'}
                          </div>
                          <span className="font-semibold text-[#191B23]">
                            {f.uploadedByRole === 'client' ? 'Client' : 'Admin'}
                          </span>
                          <span className="text-[11px]">{new Date(f.createdAt).toLocaleDateString()}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[#2563EB]">v{f.currentVersion || 1}.0</span>
                          <button
                            onClick={() => setSelectedFileForSidebar(f)}
                            className="flex items-center gap-1 text-xs font-bold text-[#737686] hover:text-[#2563EB] p-1 rounded-md hover:bg-[#F3F3FE] transition-colors"
                            title="View / Add Comments"
                          >
                            <MessageSquare size={14} />
                            <span>{f.commentsCount || 0}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── LIST VIEW ─────────────────────────────────────────────────── */}
          {!loadingFiles && viewMode === 'list' && (
            <div className="border border-[#E1E2ED] rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E1E2ED] text-xs font-bold text-[#737686] uppercase tracking-wider bg-[#FAF8FF]">
                    <th className="py-3.5 px-5">Document Name</th>
                    <th className="py-3.5 px-4">Size</th>
                    <th className="py-3.5 px-4">Uploaded By</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E2ED]/60 text-sm">
                  {filteredFiles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#737686] text-xs">
                        No documents found in this directory for {customerName}.
                      </td>
                    </tr>
                  ) : (
                    filteredFiles.map((f: any) => (
                      <tr key={`list-${f.id}`} className="hover:bg-[#F3F3FE]/50 transition-colors">
                        <td className="py-3 px-5 font-semibold text-[#191B23]">
                          <div
                            onClick={() => handleOpenPreview(f)}
                            className="flex items-center gap-3 min-w-0 cursor-pointer group"
                          >
                            <div className="w-8 h-8 bg-[#2563EB]/10 text-[#2563EB] rounded-lg flex items-center justify-center shrink-0 group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                              <FileText size={16} />
                            </div>
                            <span
                              className="truncate text-sm font-semibold text-[#191B23] group-hover:text-[#2563EB] transition-colors"
                              title={f.originalFileName}
                            >
                              {f.originalFileName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-[#737686]">
                          {(Number(f.fileSize || 0) / (1024 * 1024)).toFixed(2)} MB
                        </td>
                        <td className="py-3 px-4 text-xs font-medium capitalize text-[#434655]">
                          {f.uploadedByRole}
                        </td>
                        <td className="py-3 px-4 text-xs text-[#737686] font-data-mono">
                          {new Date(f.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-5 text-center">
                          <button
                            onClick={() => handleDownloadFile(f.id)}
                            className="p-2 border border-[#E1E2ED] text-[#434655] hover:text-[#2563EB] hover:bg-[#F3F3FE] rounded-lg transition-colors"
                            title="Download Document"
                          >
                            <Download size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </main>

        {/* Right Side Slide-Over Details & Comments Panel */}
        {selectedFileForSidebar && (
          <DocumentDetailsCommentsSidebar
            file={selectedFileForSidebar}
            customerId={customerId}
            onClose={() => setSelectedFileForSidebar(null)}
            onOpenViewer={handleOpenPreview}
          />
        )}
      </div>

      {/* ── MODALS ────────────────────────────────────────────────────────── */}

      {/* Upload File Modal */}
      {isUploadModalOpen && (
        <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Upload Document to Vault">
          <div className="space-y-4 pt-2">
            <p className="text-xs text-[#737686]">
              Upload documents, PDFs, images, or contracts directly to <b>{customerName}</b>'s digital workspace.
            </p>
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files?.length) {
                  handleUploadFiles(Array.from(e.target.files));
                }
              }}
              className="block w-full text-xs text-[#737686] file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#2563EB] file:text-white hover:file:bg-[#1D4ED8] cursor-pointer"
            />

            {uploading && (
              <div className="space-y-1 pt-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>Uploading to Vault...</span>
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

      {/* Add Note Modal */}
      {isNoteModalOpen && (
        <Modal isOpen={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)} title="Post Document Note">
          <form onSubmit={handleCreateNote} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[#191B23] uppercase tracking-wider mb-1">Title (Optional)</label>
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="e.g. Project Delivery Instructions"
                className="w-full h-10 px-3 bg-[#F3F3FE] border border-[#E1E2ED] rounded-xl text-xs text-[#191B23] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#191B23] uppercase tracking-wider mb-1">Message Note</label>
              <textarea
                required
                rows={4}
                value={noteMessage}
                onChange={(e) => setNoteMessage(e.target.value)}
                placeholder="Type note or instructions for client workspace..."
                className="w-full p-3 bg-[#F3F3FE] border border-[#E1E2ED] rounded-xl text-xs text-[#191B23] outline-none resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(false)}
                className="px-4 py-2 border border-[#E1E2ED] text-xs font-semibold rounded-xl text-[#737686]"
              >
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-[#2563EB] text-white text-xs font-semibold rounded-xl hover:bg-[#1D4ED8]">
                Post Note
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Link Modal */}
      {isLinkModalOpen && (
        <Modal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} title="Add Resource Link">
          <form onSubmit={handleCreateLink} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[#191B23] uppercase tracking-wider mb-1">Link Title</label>
              <input
                type="text"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="e.g. Figma Design Mockups / Google Drive Folder"
                className="w-full h-10 px-3 bg-[#F3F3FE] border border-[#E1E2ED] rounded-xl text-xs text-[#191B23] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#191B23] uppercase tracking-wider mb-1">URL</label>
              <input
                type="url"
                required
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://figma.com/file/..."
                className="w-full h-10 px-3 bg-[#F3F3FE] border border-[#E1E2ED] rounded-xl text-xs text-[#191B23] outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="px-4 py-2 border border-[#E1E2ED] text-xs font-semibold rounded-xl text-[#737686]"
              >
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-[#2563EB] text-white text-xs font-semibold rounded-xl hover:bg-[#1D4ED8]">
                Save Link
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
    </div>
  );
}
