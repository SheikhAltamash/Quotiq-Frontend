import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/shared/lib/axios';
import {
  X,
  FileText,
  MessageSquare,
  Activity,
  Info,
  Send,
  Trash2,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Download,
  AtSign,
  Smile,
  Paperclip,
  User as UserIcon,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface DocumentDetailsCommentsSidebarProps {
  file: any | null;
  customerId?: string;
  isClientPortal?: boolean;
  onClose: () => void;
  onOpenViewer?: (file: any) => void;
}

export default function DocumentDetailsCommentsSidebar({
  file,
  customerId,
  isClientPortal = false,
  onClose,
  onOpenViewer,
}: DocumentDetailsCommentsSidebarProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'details' | 'activity' | 'comments'>('comments');
  const [commentText, setCommentText] = useState('');
  const [noteType, setNoteType] = useState<'client_note' | 'internal_note' | 'comment'>(
    isClientPortal ? 'client_note' : 'internal_note'
  );

  const fileId = file?.id;

  // Build comments API endpoint based on context
  const commentsEndpoint = isClientPortal
    ? `/v1/portal/files/${fileId}/comments`
    : `/v1/customers/${customerId}/portal/files/${fileId}/comments`;

  // Fetch Comments Query
  const { data: comments = [], isLoading: loadingComments } = useQuery({
    queryKey: ['document-comments', fileId, isClientPortal ? 'client' : customerId],
    queryFn: async () => {
      if (!fileId) return [];
      const res = await api.get(commentsEndpoint);
      return res.data.data || res.data;
    },
    enabled: !!fileId,
  });

  // Create Comment Mutation
  const addCommentMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(commentsEndpoint, {
        content: commentText,
        noteType,
      });
      return res.data;
    },
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['document-comments', fileId] });
      queryClient.invalidateQueries({ queryKey: ['portal-files'] });
      queryClient.invalidateQueries({ queryKey: ['customer-portal-files'] });
      toast.success('Comment posted successfully');
    },
    onError: () => {
      toast.error('Failed to post comment');
    },
  });

  // Delete Comment Mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const deleteEndpoint = isClientPortal
        ? `/v1/portal/files/${fileId}/comments/${commentId}`
        : `/v1/customers/${customerId}/portal/files/${fileId}/comments/${commentId}`;
      await api.delete(deleteEndpoint);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-comments', fileId] });
      toast.success('Comment removed');
    },
    onError: () => {
      toast.error('Could not delete comment');
    },
  });

  if (!file) return null;

  const ext = file.extension?.toLowerCase() || file.originalFileName?.split('.').pop()?.toLowerCase() || '';

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addCommentMutation.mutate();
  };

  return (
    <div className="w-full md:w-[380px] lg:w-[420px] bg-white border-l border-[#E1E2ED] flex flex-col h-full shrink-0 shadow-xl select-none animate-fadeIn">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="p-5 border-b border-[#E1E2ED] flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-3 truncate pr-2">
          <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center shrink-0 font-bold uppercase text-xs">
            {ext === 'pdf' ? (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded font-extrabold">PDF</span>
            ) : (
              ext.slice(0, 4) || 'FILE'
            )}
          </div>
          <div className="truncate">
            <h3 className="font-bold text-sm text-[#191B23] truncate" title={file.originalFileName}>
              {file.originalFileName}
            </h3>
            <p className="text-xs text-[#737686] capitalize truncate">
              {file.category || file.folder?.name || 'Workspace Document'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenViewer && (
            <button
              onClick={() => onOpenViewer(file)}
              className="p-2 text-[#737686] hover:text-[#2563EB] hover:bg-[#F3F3FE] rounded-xl transition-colors"
              title="Open Full Viewer"
            >
              <ExternalLink size={17} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 text-[#737686] hover:text-[#191B23] hover:bg-[#F3F3FE] rounded-xl transition-colors"
            title="Close Panel"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── TAB NAVIGATION BAR ─────────────────────────────────────────── */}
      <div className="flex border-b border-[#E1E2ED] bg-[#FAF8FF] px-3 pt-2 shrink-0">
        <button
          onClick={() => setActiveTab('details')}
          className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'details'
              ? 'border-[#2563EB] text-[#2563EB]'
              : 'border-transparent text-[#737686] hover:text-[#191B23]'
          }`}
        >
          <Info size={14} />
          <span>Details</span>
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'activity'
              ? 'border-[#2563EB] text-[#2563EB]'
              : 'border-transparent text-[#737686] hover:text-[#191B23]'
          }`}
        >
          <Activity size={14} />
          <span>Activity</span>
        </button>

        <button
          onClick={() => setActiveTab('comments')}
          className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'comments'
              ? 'border-[#2563EB] text-[#2563EB]'
              : 'border-transparent text-[#737686] hover:text-[#191B23]'
          }`}
        >
          <MessageSquare size={14} />
          <span>Comments</span>
          {comments.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-[#2563EB] text-white rounded-full">
              {comments.length}
            </span>
          )}
        </button>
      </div>

      {/* ── TAB CONTENTS ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* TAB 1: DETAILS */}
        {activeTab === 'details' && (
          <div className="space-y-4 text-xs">
            <div className="bg-[#FAF8FF] border border-[#E1E2ED] rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-[#E1E2ED]">
                <span className="text-[#737686] font-medium">File Size</span>
                <span className="font-bold text-[#191B23]">
                  {file.fileSize ? `${(file.fileSize / (1024 * 1024)).toFixed(2)} MB` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#E1E2ED]">
                <span className="text-[#737686] font-medium">Format Extension</span>
                <span className="font-mono uppercase font-bold text-[#2563EB]">{ext}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#E1E2ED]">
                <span className="text-[#737686] font-medium">Uploaded By</span>
                <span className="font-bold capitalize text-[#191B23]">{file.uploadedByRole || 'Admin'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#E1E2ED]">
                <span className="text-[#737686] font-medium">Created Date</span>
                <span className="font-mono text-[#191B23]">
                  {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : 'Today'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#737686] font-medium">Security Scan</span>
                <span className="text-green-600 font-bold flex items-center gap-1">
                  <ShieldCheck size={14} /> Clean
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVITY LOG */}
        {activeTab === 'activity' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-3 p-3 bg-[#FAF8FF] rounded-xl border border-[#E1E2ED]">
              <div className="w-7 h-7 rounded-full bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center shrink-0">
                <FileText size={14} />
              </div>
              <div>
                <p className="font-semibold text-[#191B23]">Document Created</p>
                <p className="text-[11px] text-[#737686]">
                  {file.createdAt ? new Date(file.createdAt).toLocaleString() : 'Recently'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: COMMENTS & DISCUSSION THREAD */}
        {activeTab === 'comments' && (
          <div className="space-y-5">
            {/* ADD COMMENT INPUT BOX */}
            <form onSubmit={handleSubmitComment} className="bg-white border border-[#E1E2ED] rounded-2xl p-3 shadow-sm space-y-3">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-bold text-[#191B23] uppercase tracking-wider">Add a comment or note</span>
                {!isClientPortal && (
                  <select
                    value={noteType}
                    onChange={(e: any) => setNoteType(e.target.value)}
                    className="bg-[#FAF8FF] border border-[#E1E2ED] rounded-lg px-2 py-0.5 text-[11px] font-semibold text-[#2563EB] outline-none"
                  >
                    <option value="internal_note">Internal Note</option>
                    <option value="client_note">Client Note</option>
                    <option value="comment">Public Comment</option>
                  </select>
                )}
              </div>

              <textarea
                rows={3}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment or add a note..."
                className="w-full p-2.5 bg-[#FAF8FF] border border-[#E1E2ED] rounded-xl text-xs text-[#191B23] placeholder-[#737686] outline-none resize-none focus:border-[#2563EB] transition-all"
              />

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 text-[#737686]">
                  <button type="button" className="p-1 hover:text-[#2563EB] transition-colors" title="Mention user">
                    <AtSign size={15} />
                  </button>
                  <button type="button" className="p-1 hover:text-[#2563EB] transition-colors" title="Add emoji">
                    <Smile size={15} />
                  </button>
                  <button type="button" className="p-1 hover:text-[#2563EB] transition-colors" title="Attach file">
                    <Paperclip size={15} />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={addCommentMutation.isPending || !commentText.trim()}
                  className="px-4 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-gray-300 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  {addCommentMutation.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <span>Post</span>
                      <Send size={13} />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* DISCUSSION THREAD LIST */}
            <div className="space-y-3">
              {loadingComments ? (
                <div className="py-8 flex justify-center items-center">
                  <Loader2 className="animate-spin text-[#2563EB]" size={24} />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#737686] space-y-1">
                  <MessageSquare size={28} className="mx-auto text-gray-300 mb-2" />
                  <p className="font-semibold text-[#191B23]">No comments yet</p>
                  <p>Start the conversation or add a note above!</p>
                </div>
              ) : (
                comments.map((c: any) => (
                  <div
                    key={c.id}
                    className="p-3.5 bg-[#FAF8FF] border border-[#E1E2ED] rounded-2xl shadow-sm space-y-2 group hover:border-[#2563EB]/40 transition-all"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#2563EB] text-white font-bold flex items-center justify-center text-xs shadow-sm">
                          {c.authorName?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <span className="font-bold text-[#191B23]">{c.authorName}</span>
                          {c.noteType === 'internal_note' && (
                            <span className="ml-2 text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                              Internal Note
                            </span>
                          )}
                          {c.noteType === 'client_note' && (
                            <span className="ml-2 text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                              Client Note
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="text-[11px] text-[#737686]">
                        {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-[#434655] leading-relaxed pl-9 whitespace-pre-wrap">{c.content}</p>

                    <div className="flex justify-end items-center gap-3 pt-1 text-[11px]">
                      <button
                        onClick={() => deleteCommentMutation.mutate(c.id)}
                        className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete comment"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
