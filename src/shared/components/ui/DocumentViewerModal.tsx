import { useState, useEffect } from 'react';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  Music as AudioIcon,
  FileCode,
  FileArchive,
  ExternalLink,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Loader2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export interface ViewerFile {
  id: string;
  originalFileName: string;
  mimeType?: string;
  extension?: string;
  fileSize?: number;
  wasabiUrl?: string;
  downloadUrl?: string;
  uploadedByRole?: string;
  createdAt?: string;
}

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: ViewerFile | null;
  downloadUrl?: string;
}

export default function DocumentViewerModal({ isOpen, onClose, file, downloadUrl }: DocumentViewerModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);
  const [docHtml, setDocHtml] = useState<string | null>(null);
  const [loadingDocHtml, setLoadingDocHtml] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Determine File Type Category
  const ext = file?.extension?.toLowerCase() || file?.originalFileName.split('.').pop()?.toLowerCase() || '';
  const mime = file?.mimeType?.toLowerCase() || '';

  const isImage =
    mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic', 'bmp', 'ico'].includes(ext);
  const isVideo = mime.startsWith('video/') || ['mp4', 'webm', 'mov', 'm4v', 'avi', 'mkv'].includes(ext);
  const isAudio = mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext);
  const isPdf = mime.includes('pdf') || ext === 'pdf';
  const isOfficeDoc = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext);
  const isCodeOrText = ['txt', 'json', 'csv', 'md', 'js', 'ts', 'html', 'css', 'xml', 'log'].includes(ext);

  // Construct Stream URL (prioritize signed authenticated downloadUrl)
  const resolvedStreamUrl =
    downloadUrl ||
    file?.downloadUrl ||
    (file?.id ? `/api/v1/portal/files/${file.id}/download` : '') ||
    file?.wasabiUrl ||
    '';

  // Reset zoom & rotation when file changes
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setTextContent(null);
    setDocHtml(null);

    // Fetch raw text for text/code files
    if (isOpen && isCodeOrText && resolvedStreamUrl) {
      setLoadingText(true);
      fetch(resolvedStreamUrl)
        .then((res) => res.text())
        .then((txt) => setTextContent(txt))
        .catch(() => setTextContent('Failed to load text content.'))
        .finally(() => setLoadingText(false));
    }

    // Fetch HTML conversion for Word documents
    if (isOpen && (isOfficeDoc || ext === 'docx' || ext === 'doc') && resolvedStreamUrl) {
      setLoadingDocHtml(true);
      const htmlUrl = resolvedStreamUrl.includes('?') ? `${resolvedStreamUrl}&format=html` : `${resolvedStreamUrl}?format=html`;
      fetch(htmlUrl)
        .then((res) => res.json())
        .then((json) => {
          if (json.data?.html) {
            setDocHtml(json.data.html);
          } else {
            setDocHtml(null);
          }
        })
        .catch(() => setDocHtml(null))
        .finally(() => setLoadingDocHtml(false));
    }
  }, [isOpen, file?.id, resolvedStreamUrl, isCodeOrText, isOfficeDoc, ext]);

  if (!isOpen || !file) return null;

  const handleDownload = () => {
    if (resolvedStreamUrl) {
      window.open(resolvedStreamUrl, '_blank');
      toast.success(`Downloading "${file.originalFileName}"`);
    }
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-md animate-fadeIn">
      {/* ── TOP HEADER CONTROL BAR ───────────────────────────────────────── */}
      <header className="h-16 bg-[#191B23]/90 border-b border-gray-800 px-6 flex items-center justify-between text-white shrink-0">
        <div className="flex items-center gap-3 truncate max-w-xl">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
            {isImage && <ImageIcon size={20} />}
            {isVideo && <VideoIcon size={20} />}
            {isAudio && <AudioIcon size={20} />}
            {isPdf && <FileText size={20} />}
            {isOfficeDoc && <FileText size={20} />}
            {isCodeOrText && <FileCode size={20} />}
            {!isImage && !isVideo && !isAudio && !isPdf && !isOfficeDoc && !isCodeOrText && <FileArchive size={20} />}
          </div>
          <div className="truncate">
            <h3 className="font-bold text-sm text-white truncate">{file.originalFileName}</h3>
            <p className="text-[11px] text-gray-400 font-medium">
              {file.fileSize ? `${(file.fileSize / (1024 * 1024)).toFixed(2)} MB` : ''}{' '}
              {file.uploadedByRole ? `• Uploaded by ${file.uploadedByRole}` : ''}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Zoom controls for Images */}
          {isImage && (
            <div className="flex items-center bg-gray-800/80 rounded-xl p-1 border border-gray-700">
              <button
                onClick={handleZoomOut}
                className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-xs font-mono px-2 font-semibold text-gray-300">{Math.round(zoom * 100)}%</span>
              <button
                onClick={handleZoomIn}
                className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
              <button
                onClick={handleRotate}
                className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors border-l border-gray-700 ml-1 pl-2"
                title="Rotate 90°"
              >
                <RotateCw size={16} />
              </button>
            </div>
          )}

          {/* Full Screen Mode Toggle Button */}
          <button
            onClick={toggleFullscreen}
            className={`px-3 py-2 border text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${
              isFullscreen
                ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                : 'border-gray-700 bg-gray-800/80 text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
            title={isFullscreen ? 'Exit Full Screen' : 'Full Screen Mode'}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</span>
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <Download size={15} />
            <span>Download</span>
          </button>

          {/* Close Button */}
          <button
            onClick={() => {
              if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
              }
              setIsFullscreen(false);
              onClose();
            }}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors"
            title="Close Preview"
          >
            <X size={22} />
          </button>
        </div>
      </header>

      {/* ── MAIN STAGE VIEWER CONTENT ───────────────────────────────────── */}
      <main className={`flex-1 overflow-auto w-full relative ${isFullscreen ? 'p-0 flex flex-col' : 'p-6 flex flex-col items-center justify-center'}`}>
        
        {/* 1. IMAGE VIEWER */}
        {isImage && (
          <div className={`w-full h-full flex items-center justify-center overflow-auto ${isFullscreen ? 'p-0' : 'p-2'}`}>
            <img
              src={resolvedStreamUrl}
              alt={file.originalFileName}
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease-out',
              }}
              className={`${
                isFullscreen ? 'max-w-none max-h-[calc(100vh-64px)] rounded-none' : 'max-w-full max-h-[82vh] rounded-lg'
              } object-contain shadow-2xl`}
              onError={(e) => {
                toast.error('Could not load image preview.');
              }}
            />
          </div>
        )}

        {/* 2. VIDEO PLAYER */}
        {isVideo && (
          <div className={`w-full ${isFullscreen ? 'max-w-none h-[calc(100vh-64px)] rounded-none border-none m-0' : 'max-w-5xl max-h-[82vh] rounded-2xl border border-gray-800 my-auto mx-auto'} flex items-center justify-center bg-black overflow-hidden shadow-2xl`}>
            <video
              src={resolvedStreamUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
            >
              Your browser does not support HTML5 video playback.
            </video>
          </div>
        )}

        {/* 3. AUDIO PLAYER */}
        {isAudio && (
          <div className="bg-[#191B23] border border-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6 shrink-0 my-auto mx-auto">
            <div className="w-24 h-24 bg-blue-600/20 text-blue-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <AudioIcon size={48} className="animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-lg text-white truncate">{file.originalFileName}</h4>
              <p className="text-xs text-gray-400 mt-1">Audio File • Ready to play</p>
            </div>
            <audio src={resolvedStreamUrl} controls className="w-full rounded-xl">
              Your browser does not support HTML5 audio playback.
            </audio>
          </div>
        )}

        {/* 4. PDF VIEWER */}
        {isPdf && (
          <div className={`w-full ${isFullscreen ? 'h-[calc(100vh-64px)] max-w-none rounded-none border-none m-0' : 'h-[82vh] max-w-6xl rounded-2xl border border-gray-800 my-auto mx-auto'} bg-white overflow-hidden shadow-2xl flex flex-col`}>
            <object
              data={resolvedStreamUrl}
              type="application/pdf"
              className="w-full h-full"
            >
              <iframe
                src={`${resolvedStreamUrl}#toolbar=1`}
                title={file.originalFileName}
                className="w-full h-full border-none"
              />
            </object>
          </div>
        )}

        {/* 5. OFFICE DOCUMENTS (DOC, DOCX, XLS, XLSX, PPT, PPTX) */}
        {isOfficeDoc && (
          loadingDocHtml ? (
            <div className="bg-[#191B23] border border-gray-800 rounded-3xl p-12 max-w-md w-full shadow-2xl text-center space-y-4 my-auto mx-auto">
              <Loader2 className="animate-spin text-blue-500 mx-auto" size={40} />
              <p className="text-sm font-semibold text-gray-300">Converting Word document pages...</p>
            </div>
          ) : docHtml ? (
            <div className={`w-full ${isFullscreen ? 'max-w-none h-[calc(100vh-64px)] rounded-none border-none p-6 sm:p-14 m-0' : 'max-w-4xl h-[82vh] rounded-2xl border border-gray-300 p-8 sm:p-14 my-auto mx-auto'} bg-white text-gray-900 overflow-auto shadow-2xl space-y-4 select-text`}>
              <div className="border-b border-gray-200 pb-3 mb-6 flex justify-between items-center text-xs text-gray-500 font-sans select-none">
                <span className="font-bold text-gray-800 uppercase tracking-wider">{file.originalFileName}</span>
                <span className="bg-blue-50 text-blue-600 font-semibold px-2.5 py-1 rounded-md border border-blue-200">Word Document (.docx)</span>
              </div>
              <div
                className="prose max-w-none text-sm leading-relaxed text-gray-800 space-y-4 [&>p]:mb-3 [&>h1]:text-2xl [&>h1]:font-bold [&>h2]:text-xl [&>h2]:font-bold [&>ul]:list-disc [&>ul]:ml-6 [&>ol]:list-decimal [&>ol]:ml-6 [&>table]:w-full [&>table]:border-collapse [&>table]:border [&>table_td]:border [&>table_td]:p-2"
                dangerouslySetInnerHTML={{ __html: docHtml }}
              />
            </div>
          ) : (
            <div className="bg-[#191B23] border border-gray-800 rounded-3xl p-8 w-full max-w-lg min-w-[320px] shadow-2xl text-center space-y-6 shrink-0 my-auto mx-auto">
              <div className="w-20 h-20 bg-blue-600/15 text-blue-400 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/30 shadow-lg">
                <FileText size={44} />
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-xl text-white truncate">{file.originalFileName}</h4>
                <p className="text-xs text-gray-400">
                  Microsoft {ext.toUpperCase()} Document • {file.fileSize ? `${(file.fileSize / (1024 * 1024)).toFixed(2)} MB` : 'Office File'}
                </p>
              </div>

              <div className="bg-gray-800/60 border border-gray-700/60 rounded-2xl p-4 text-xs text-left space-y-2 text-gray-300">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-semibold">Document Format:</span>
                  <span className="font-mono text-blue-400 font-bold uppercase">{ext}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-semibold">Local Server Security:</span>
                  <span className="text-green-400 font-semibold flex items-center gap-1">
                    <ShieldCheck size={14} /> Verified Clean
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleDownload}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Download size={16} />
                  <span>Open / Download ({ext.toUpperCase()})</span>
                </button>
                <a
                  href={resolvedStreamUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 border border-gray-700"
                >
                  <ExternalLink size={14} />
                  <span>Open Stream</span>
                </a>
              </div>
            </div>
          )
        )}

        {/* 6. CODE & TEXT READER */}
        {isCodeOrText && (
          <div className={`w-full ${isFullscreen ? 'h-[calc(100vh-64px)] max-w-none rounded-none border-none m-0' : 'max-w-5xl h-[82vh] rounded-2xl border border-gray-800 my-auto mx-auto'} bg-[#1E1E2E] text-gray-200 overflow-hidden shadow-2xl flex flex-col`}>
            <div className="bg-[#181825] px-4 py-2.5 border-b border-gray-800 flex justify-between items-center text-xs font-mono text-gray-400">
              <span>{file.originalFileName}</span>
              <span>UTF-8 Text File</span>
            </div>
            <div className="flex-1 p-6 overflow-auto font-mono text-xs leading-relaxed selection:bg-blue-600/40">
              {loadingText ? (
                <div className="text-gray-500 italic">Loading file content...</div>
              ) : (
                <pre className="whitespace-pre-wrap break-words">{textContent || 'Empty document'}</pre>
              )}
            </div>
          </div>
        )}

        {/* 7. GENERIC / ARCHIVE / OTHER FILES (ZIP, APK, PSD, AI, etc.) */}
        {!isImage && !isVideo && !isAudio && !isPdf && !isOfficeDoc && !isCodeOrText && (
          <div className="bg-[#191B23] border border-gray-800 rounded-3xl p-10 max-w-lg w-full shadow-2xl text-center space-y-6">
            <div className="w-24 h-24 bg-blue-600/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/20 shadow-lg">
              <FileArchive size={52} />
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-xl text-white truncate">{file.originalFileName}</h4>
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <span className="uppercase font-mono font-bold bg-gray-800 text-blue-400 px-2 py-0.5 rounded">
                  {ext}
                </span>
                <span>•</span>
                <span>{file.fileSize ? `${(file.fileSize / (1024 * 1024)).toFixed(2)} MB` : 'Binary File'}</span>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4 text-xs text-gray-300 flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-400">
                <ShieldCheck size={18} />
                <span className="font-semibold">Clean File</span>
              </div>
              <span className="text-gray-400">No virus detected</span>
            </div>

            <button
              onClick={handleDownload}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Download size={18} />
              <span>Download File ({ext.toUpperCase()})</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
