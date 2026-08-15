import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/shared/lib/axios';
import {
  ShieldCheck,
  Key,
  Copy,
  RotateCw,
  Lock,
  Eye,
  EyeOff,
  UploadCloud,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  FolderPlus,
  FileText,
  Download,
  Trash2,
  Plus,
  ExternalLink,
  Loader2,
  Clock,
  UserCheck,
  Folder,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal from '@/shared/components/ui/Modal';

interface CustomerPortalTabProps {
  customerId: string;
  customerName: string;
  customerCompany?: string | null;
}

export default function CustomerPortalTab({ customerId, customerName, customerCompany }: CustomerPortalTabProps) {
  const queryClient = useQueryClient();

  // Modals state
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Form states
  const [newPassword, setNewPassword] = useState('');
  const [folderName, setFolderName] = useState('');
  const [folderVisibility, setFolderVisibility] = useState('public');

  // File Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch Portal Account & Stats
  const { data: portalData, isLoading: isPortalLoading } = useQuery({
    queryKey: ['customer-portal', customerId],
    queryFn: async () => {
      const { data } = await api.get(`/v1/customers/${customerId}/portal`);
      return data.data;
    },
  });

  // Fetch Folders
  const { data: folders = [] } = useQuery({
    queryKey: ['customer-portal-folders', customerId],
    queryFn: async () => {
      const { data } = await api.get(`/v1/customers/${customerId}/portal/folders`);
      return data.data;
    },
  });

  // Fetch Files
  const { data: files = [] } = useQuery({
    queryKey: ['customer-portal-files', customerId],
    queryFn: async () => {
      const { data } = await api.get(`/v1/customers/${customerId}/portal/files`);
      return data.data;
    },
  });

  // Fetch Activities
  const { data: activities = [] } = useQuery({
    queryKey: ['customer-portal-activities', customerId],
    queryFn: async () => {
      const { data } = await api.get(`/v1/customers/${customerId}/portal/activities`);
      return data.data;
    },
  });

  // Toggle Portal Status
  const toggleStatusMutation = useMutation({
    mutationFn: async (newStatus: 'enabled' | 'disabled') => {
      const { data } = await api.put(`/v1/customers/${customerId}/portal`, { status: newStatus });
      return data;
    },
    onSuccess: () => {
      toast.success('Portal status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['customer-portal', customerId] });
    },
    onError: () => toast.error('Failed to update portal status'),
  });

  // Regenerate Code
  const regenerateCodeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/v1/customers/${customerId}/portal/code/regenerate`);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Client Code regenerated: ${data.clientCode}`);
      queryClient.invalidateQueries({ queryKey: ['customer-portal', customerId] });
    },
    onError: () => toast.error('Failed to regenerate client code'),
  });

  // Reset Password
  const resetPasswordMutation = useMutation({
    mutationFn: async (pwd: string) => {
      const { data } = await api.post(`/v1/customers/${customerId}/portal/password/reset`, { newPassword: pwd });
      return data;
    },
    onSuccess: () => {
      toast.success('Client portal password updated!');
      setIsResetPasswordOpen(false);
      setNewPassword('');
    },
    onError: () => toast.error('Failed to reset password'),
  });

  // Update Folder Visibility
  const updateFolderMutation = useMutation({
    mutationFn: async ({ folderId, visibility }: { folderId: string; visibility: string }) => {
      const { data } = await api.put(`/v1/customers/${customerId}/portal/folders/${folderId}`, { visibility });
      return data;
    },
    onSuccess: () => {
      toast.success('Folder visibility updated');
      queryClient.invalidateQueries({ queryKey: ['customer-portal-folders', customerId] });
    },
    onError: () => toast.error('Failed to update folder'),
  });

  // Create Folder
  const createFolderMutation = useMutation({
    mutationFn: async ({ name, visibility }: { name: string; visibility: string }) => {
      const { data } = await api.post(`/v1/customers/${customerId}/portal/folders`, { name, visibility });
      return data;
    },
    onSuccess: () => {
      toast.success('Workspace folder created');
      setIsCreateFolderOpen(false);
      setFolderName('');
      queryClient.invalidateQueries({ queryKey: ['customer-portal-folders', customerId] });
    },
    onError: () => toast.error('Failed to create folder'),
  });

  // Resolve Deletion Request
  const resolveDeletionMutation = useMutation({
    mutationFn: async ({ itemType, itemId, action }: { itemType: 'folder' | 'file'; itemId: string; action: 'approve' | 'reject' }) => {
      const { data } = await api.post(`/v1/customers/${customerId}/portal/deletion-request/resolve`, {
        itemType,
        itemId,
        action,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(`Deletion request ${variables.action}d`);
      queryClient.invalidateQueries({ queryKey: ['customer-portal-folders', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer-portal-files', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer-portal', customerId] });
    },
    onError: () => toast.error('Failed to process deletion request'),
  });

  // Wasabi File Upload Handler
  const handleAdminFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(10);

      // Step 1: Request presigned upload URL
      const { data: presignedRes } = await api.post(`/v1/customers/${customerId}/portal/upload-url`, {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
      });

      const { uploadUrl, objectKey } = presignedRes.data;
      setUploadProgress(40);

      // Step 2: Upload directly to Wasabi S3 via PUT
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': selectedFile.type || 'application/octet-stream' },
        body: selectedFile,
      });

      setUploadProgress(80);

      // Step 3: Save metadata in PostgreSQL
      await api.post(`/v1/customers/${customerId}/portal/files/complete`, {
        originalFileName: selectedFile.name,
        objectKey,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
      });

      setUploadProgress(100);
      toast.success('File uploaded to Wasabi successfully!');
      setIsUploadOpen(false);
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['customer-portal-files', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer-portal', customerId] });
    } catch (err) {
      toast.error('File upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const portalAccount = portalData?.portalAccount;
  const stats = portalData?.stats;

  const portalUrl = `${window.location.origin}/portal/login`;

  const copyPortalLink = () => {
    navigator.clipboard.writeText(portalUrl);
    toast.success('Client Portal link copied to clipboard!');
  };

  const copyClientCode = () => {
    if (portalAccount?.clientCode) {
      navigator.clipboard.writeText(portalAccount.clientCode);
      toast.success('Client Code copied!');
    }
  };

  if (isPortalLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const storageUsedMB = (stats?.storageUsedBytes || 0) / (1024 * 1024);
  const quotaGB = (portalAccount?.storageQuotaBytes || 10737418240) / (1024 * 1024 * 1024);
  const usagePercentage = Math.min(100, Math.round((storageUsedMB / (quotaGB * 1024)) * 100));

  return (
    <div className="space-y-lg">
      {/* Top Banner / Portal Status Header */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-lg">
          <div className="flex items-start gap-md">
            <div className="w-14 h-14 bg-primary-fixed rounded-xl flex items-center justify-center text-primary shrink-0">
              <ShieldCheck size={32} />
            </div>
            <div>
              <div className="flex items-center gap-sm flex-wrap">
                <h3 className="font-headline-sm text-on-surface">Client Workspace Portal</h3>
                <span
                  className={`px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase border ${
                    portalAccount?.status === 'enabled'
                      ? 'bg-green-100 text-green-800 border-green-300'
                      : 'bg-red-100 text-red-800 border-red-300'
                  }`}
                >
                  {portalAccount?.status === 'enabled' ? 'Portal Active' : 'Portal Disabled'}
                </span>
                {portalAccount?.isActivated ? (
                  <span className="bg-blue-100 text-blue-800 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                    Account Activated
                  </span>
                ) : (
                  <span className="bg-amber-100 text-amber-800 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                    Pending First Login
                  </span>
                )}
              </div>
              <p className="text-body-sm text-on-surface-variant mt-1">
                Dedicated secure digital workspace for {customerCompany || customerName}. Direct Wasabi S3 file vault.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-sm flex-wrap">
            <button
              onClick={() => toggleStatusMutation.mutate(portalAccount?.status === 'enabled' ? 'disabled' : 'enabled')}
              className={`px-md py-2 rounded-lg font-body-sm font-semibold text-[13px] border transition-all ${
                portalAccount?.status === 'enabled'
                  ? 'border-red-200 text-red-700 bg-red-50 hover:bg-red-100'
                  : 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
              }`}
            >
              {portalAccount?.status === 'enabled' ? 'Disable Access' : 'Enable Access'}
            </button>
            <button
              onClick={copyPortalLink}
              className="px-md py-2 bg-primary text-white rounded-lg font-body-sm font-semibold text-[13px] hover:bg-primary/95 shadow-sm flex items-center gap-1.5"
            >
              <Copy size={14} /> Copy Portal Link
            </button>
            <a
              href="/portal/login"
              target="_blank"
              rel="noreferrer"
              className="px-md py-2 bg-surface-container border border-outline-variant text-on-surface rounded-lg font-body-sm font-semibold text-[13px] hover:bg-surface-variant flex items-center gap-1.5"
            >
              <ExternalLink size={14} /> Open Portal
            </a>
          </div>
        </div>
      </section>

      {/* Overview Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-lg">
        {/* Client Code Box */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider font-bold">
              Unique Client Code
            </span>
            <button
              onClick={() => regenerateCodeMutation.mutate()}
              disabled={regenerateCodeMutation.isPending}
              className="text-primary text-[12px] font-semibold hover:underline flex items-center gap-1"
            >
              <RotateCw size={12} className={regenerateCodeMutation.isPending ? 'animate-spin' : ''} /> Regenerate
            </button>
          </div>
          <div className="flex items-center justify-between bg-surface-container-low p-2.5 rounded-lg border border-outline-variant">
            <span className="font-mono text-[16px] font-bold text-primary tracking-wider">
              {portalAccount?.clientCode || '—'}
            </span>
            <button onClick={copyClientCode} className="text-secondary hover:text-primary p-1">
              <Copy size={16} />
            </button>
          </div>
          <p className="text-[11px] text-secondary">Use code to authenticate or recover first-time client account.</p>
        </div>

        {/* Security / Password Reset */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm space-y-2">
          <span className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider font-bold block">
            Client Authentication
          </span>
          <div className="text-body-sm text-on-surface">
            <span className="font-bold">Login Email:</span> {portalAccount?.email}
          </div>
          <div className="pt-1">
            <button
              onClick={() => setIsResetPasswordOpen(true)}
              className="w-full py-2 bg-surface border border-outline-variant rounded-lg font-body-sm text-[13px] font-semibold hover:bg-surface-container flex items-center justify-center gap-1.5"
            >
              <Key size={14} /> Reset Portal Password
            </button>
          </div>
        </div>

        {/* Wasabi Storage Metric */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider font-bold">
              Wasabi S3 Vault Usage
            </span>
            <span className="font-mono text-[12px] font-bold text-on-surface">
              {storageUsedMB < 1024
                ? `${storageUsedMB.toFixed(1)} MB`
                : `${(storageUsedMB / 1024).toFixed(2)} GB`}{' '}
              / {quotaGB} GB
            </span>
          </div>
          <div className="w-full bg-surface-container rounded-full h-3 overflow-hidden border border-outline-variant">
            <div
              className={`h-full transition-all duration-500 ${
                usagePercentage > 85 ? 'bg-red-500' : 'bg-primary'
              }`}
              style={{ width: `${Math.max(5, usagePercentage)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-secondary pt-0.5">
            <span>{stats?.totalUploads || 0} files stored</span>
            <span>{usagePercentage}% quota consumed</span>
          </div>
        </div>
      </section>

      {/* Visibility Manager & Folder Permissions */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="p-md border-b border-outline-variant flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md bg-surface-container-low/50">
          <div>
            <h3 className="font-title-lg text-on-surface font-bold">Workspace Folder Visibility Manager</h3>
            <p className="font-body-sm text-on-surface-variant text-[13px]">
              Configure folder access levels and visibility modes for {customerName}.
            </p>
          </div>
          <div className="flex gap-sm">
            <button
              onClick={() => setIsCreateFolderOpen(true)}
              className="px-md py-2 bg-surface-container border border-outline-variant text-on-surface rounded-lg text-[13px] font-semibold hover:bg-surface-container-high flex items-center gap-1.5"
            >
              <FolderPlus size={16} /> New Folder
            </button>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-md py-2 bg-primary text-white rounded-lg text-[13px] font-semibold hover:bg-primary/95 shadow-sm flex items-center gap-1.5"
            >
              <UploadCloud size={16} /> Upload to Vault
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-lowest text-secondary font-label-sm text-[11px] uppercase tracking-wider">
                <th className="py-3 px-md font-bold">Folder Name</th>
                <th className="py-3 px-md font-bold">Created By</th>
                <th className="py-3 px-md font-bold w-48">Visibility Setting</th>
                <th className="py-3 px-md font-bold w-32">Status</th>
                <th className="py-3 px-md font-bold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60 font-body-sm text-[14px]">
              {folders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-secondary">
                    No folders created in client workspace yet.
                  </td>
                </tr>
              ) : (
                folders.map((f: any) => (
                  <tr key={f.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-3 px-md font-semibold text-on-surface flex items-center gap-2.5">
                      <Folder size={18} className="text-primary fill-primary/10" />
                      <span>{f.name}</span>
                      {f.deletionRequested && (
                        <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle size={10} /> Deletion Requested
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-md text-secondary text-[13px] capitalize">{f.createdByRole || 'admin'}</td>
                    <td className="py-3 px-md">
                      <select
                        value={f.visibility}
                        onChange={(e) => updateFolderMutation.mutate({ folderId: f.id, visibility: e.target.value })}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded-md py-1 px-2.5 text-[13px] font-medium text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="public">Public to Client</option>
                        <option value="client_upload">Client Upload Enabled</option>
                        <option value="upload_only">Upload Only (Client)</option>
                        <option value="read_only">Read Only (Client)</option>
                        <option value="company_only">Company Only</option>
                        <option value="private">Private</option>
                        <option value="hidden">Hidden</option>
                        <option value="locked">Locked</option>
                        <option value="archive">Archive</option>
                      </select>
                    </td>
                    <td className="py-3 px-md">
                      <span className="text-[12px] font-medium text-secondary capitalize">{f.visibility.replace('_', ' ')}</span>
                    </td>
                    <td className="py-3 px-md text-center">
                      {f.deletionRequested && (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => resolveDeletionMutation.mutate({ itemType: 'folder', itemId: f.id, action: 'approve' })}
                            className="px-2.5 py-1 bg-red-600 text-white rounded text-[11px] font-bold hover:bg-red-700"
                          >
                            Approve Delete
                          </button>
                          <button
                            onClick={() => resolveDeletionMutation.mutate({ itemType: 'folder', itemId: f.id, action: 'reject' })}
                            className="px-2.5 py-1 bg-surface-container border text-on-surface rounded text-[11px] font-bold hover:bg-surface-container-high"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Files List in Workspace */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-lg">
        <div className="flex items-center justify-between mb-md">
          <h3 className="font-title-lg text-on-surface font-bold">Uploaded Files ({files.length})</h3>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="text-primary font-semibold text-[13px] flex items-center gap-1 hover:underline"
          >
            <Plus size={14} /> Upload File
          </button>
        </div>

        {files.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-outline-variant rounded-xl text-secondary text-body-sm">
            No files uploaded to this client workspace yet.
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/60">
            {files.map((file: any) => (
              <div key={file.id} className="py-3 flex items-center justify-between gap-md hover:bg-surface-container-low/30 px-2 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h4 className="font-body-sm font-bold text-on-surface">{file.originalFileName}</h4>
                    <p className="text-[11px] text-secondary">
                      {(file.fileSize / (1024 * 1024)).toFixed(2)} MB • Uploaded by {file.uploadedByRole} • v{file.currentVersion}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-sm">
                  {file.deletionRequested && (
                    <span className="text-[11px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded">
                      Delete Requested
                    </span>
                  )}
                  <a
                    href={file.wasabiUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 border border-outline-variant rounded-lg text-secondary hover:text-primary hover:bg-surface-container"
                    title="Download / View"
                  >
                    <Download size={16} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modals */}

      {/* Reset Password Modal */}
      {isResetPasswordOpen && (
        <Modal isOpen={isResetPasswordOpen} onClose={() => setIsResetPasswordOpen(false)} title="Reset Client Portal Password">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              resetPasswordMutation.mutate(newPassword);
            }}
            className="space-y-md pt-2"
          >
            <div>
              <label className="block text-body-sm font-semibold text-on-surface mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new portal password"
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-md text-body-sm focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <div className="flex justify-end gap-sm pt-md border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setIsResetPasswordOpen(false)}
                className="px-md py-2 border border-outline-variant rounded-lg text-body-sm font-semibold text-secondary hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resetPasswordMutation.isPending}
                className="px-md py-2 bg-primary text-white rounded-lg text-body-sm font-semibold hover:bg-primary/95"
              >
                {resetPasswordMutation.isPending ? 'Updating...' : 'Save Password'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create Folder Modal */}
      {isCreateFolderOpen && (
        <Modal isOpen={isCreateFolderOpen} onClose={() => setIsCreateFolderOpen(false)} title="Create Workspace Folder">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createFolderMutation.mutate({ name: folderName, visibility: folderVisibility });
            }}
            className="space-y-md pt-2"
          >
            <div>
              <label className="block text-body-sm font-semibold text-on-surface mb-1">Folder Name</label>
              <input
                type="text"
                required
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="e.g. Reference Designs & Wireframes"
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-md text-body-sm focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-body-sm font-semibold text-on-surface mb-1">Initial Visibility</label>
              <select
                value={folderVisibility}
                onChange={(e) => setFolderVisibility(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-md text-body-sm focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="public">Public to Client</option>
                <option value="client_upload">Client Upload Enabled</option>
                <option value="upload_only">Upload Only</option>
                <option value="read_only">Read Only</option>
                <option value="company_only">Company Only</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
            <div className="flex justify-end gap-sm pt-md border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setIsCreateFolderOpen(false)}
                className="px-md py-2 border border-outline-variant rounded-lg text-body-sm font-semibold text-secondary hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createFolderMutation.isPending}
                className="px-md py-2 bg-primary text-white rounded-lg text-body-sm font-semibold hover:bg-primary/95"
              >
                {createFolderMutation.isPending ? 'Creating...' : 'Create Folder'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Upload File to Wasabi Modal */}
      {isUploadOpen && (
        <Modal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Upload File directly to Wasabi Vault">
          <form onSubmit={handleAdminFileUpload} className="space-y-md pt-2">
            <div className="border-2 border-dashed border-outline-variant rounded-xl p-lg text-center hover:bg-surface-container-low transition-colors">
              <UploadCloud size={40} className="mx-auto text-primary mb-2" />
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="block w-full text-body-sm text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-body-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer"
              />
              {selectedFile && (
                <p className="mt-2 text-body-sm font-bold text-on-surface">
                  Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              )}
            </div>

            {uploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-[12px] font-bold">
                  <span>Uploading to Wasabi...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                  <div className="bg-primary h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-sm pt-md border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="px-md py-2 border border-outline-variant rounded-lg text-body-sm font-semibold text-secondary hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="px-md py-2 bg-primary text-white rounded-lg text-body-sm font-semibold hover:bg-primary/95 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Start Vault Upload'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
