import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/shared/lib/axios';
import {
  ArrowLeft,
  Printer,
  Download,
  Loader2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Building2,
  Calendar,
  Briefcase,
  User,
  Edit3
} from 'lucide-react';

interface OrgAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

interface Organization {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: OrgAddress | null;
  currency: string;
}

interface OfferLetter {
  id: string;
  offerNumber: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string | null;
  candidateAddress: string;
  jobTitle: string;
  department: 'technical' | 'social_media';
  jobType: 'full_time' | 'internship' | 'freelance';
  workplaceType: 'remote' | 'onsite' | 'hybrid';
  salaryPerMonth: string | number;
  joiningDate: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined';
  notes: string | null;
  letterContent: string;
  createdAt: string;
}

// Helper to format currency in Indian Rupees
function formatINR(val: string | number): string {
  const num = Number(val) || 0;
  return `₹ ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Helper to format organization and candidate addresses cleanly on a single wide line
function formatAddress(addr: any): string {
  if (!addr) return '';
  
  if (typeof addr === 'string') {
    try {
      const parsed = JSON.parse(addr);
      if (typeof parsed === 'object' && parsed !== null) {
        return formatAddress(parsed);
      }
    } catch {
      // Plain string
    }
    return addr
      .replace(/[\r\n]+/g, ', ')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean)
      .join(', ');
  }

  if (typeof addr === 'object' && addr !== null) {
    const rawParts: string[] = [];
    const fields = [addr.street, addr.city, addr.state, addr.zipCode, addr.country];
    for (const f of fields) {
      if (f) {
        const cleaned = String(f)
          .replace(/[\r\n]+/g, ', ')
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
        rawParts.push(...cleaned);
      }
    }

    // Deduplicate any repeated consecutive terms
    const result: string[] = [];
    for (const part of rawParts) {
      const last = result[result.length - 1];
      if (!last || last.toLowerCase() !== part.toLowerCase()) {
        result.push(part);
      }
    }

    return result.join(', ');
  }

  return String(addr).replace(/[\r\n]+/g, ', ').trim();
}

export default function OfferDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPrintMode = searchParams.get('print') === 'true';

  // Fetch Offer Letter Details
  const { data: offer, isLoading: isOfferLoading } = useQuery<OfferLetter>({
    queryKey: ['offers', id],
    queryFn: async () => {
      const { data } = await api.get(`/v1/offers/${id}`);
      return data.data;
    },
  });

  // Fetch Org Details
  const { data: org, isLoading: isOrgLoading } = useQuery<Organization>({
    queryKey: ['organization'],
    queryFn: async () => {
      const { data } = await api.get('/v1/organization');
      return data.data;
    },
  });

  // Trigger print if param ?print=true is present
  useEffect(() => {
    let timer: any;
    if (offer && org && isPrintMode) {
      timer = setTimeout(() => {
        window.print();
      }, 500);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [offer, org, isPrintMode]);

  if (isOfferLoading || isOrgLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="py-12 text-center space-y-4">
        <p className="text-on-surface-variant font-bold">Offer letter details not found.</p>
        <button onClick={() => navigate('/offers')} className="text-primary hover:underline font-semibold">
          Go back to list
        </button>
      </div>
    );
  }

  const creationDate = new Date(offer.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const joiningDateFormatted = new Date(offer.joiningDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const orgAddressStr = formatAddress(org?.address);
  const candidateAddressStr = formatAddress(offer.candidateAddress);

  const getStatusBadge = (status: OfferLetter['status']) => {
    switch (status) {
      case 'accepted':
        return <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">Accepted</span>;
      case 'sent':
        return <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">Sent</span>;
      case 'declined':
        return <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">Declined</span>;
      default:
        return <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300">Draft</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Global & Print CSS Styles */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 12mm 10mm 12mm 10mm;
        }

        @media screen {
          .a4-sheet {
            width: 210mm;
            min-height: 297mm;
            background: #ffffff;
            color: #0f172a;
            box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04);
            border-radius: 4px;
            box-sizing: border-box;
            margin: 0 auto;
            padding: 36px 40px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          }
        }

        @media print {
          html, body {
            width: 210mm !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide all application chrome */
          header, nav, aside,
          .no-print, button,
          .chat-widget, [class*="chat"],
          [class*="floating"], iframe {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Reset layout containers */
          #root, #root > div, main, main > div,
          .min-h-screen, .space-y-6, .max-w-4xl, .mx-auto {
            display: block !important;
            position: static !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
            width: 100% !important;
            background: transparent !important;
            box-shadow: none !important;
            border: none !important;
          }

          .a4-sheet {
            display: block !important;
            position: static !important;
            width: 100% !important;
            min-height: 0 !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #0f172a !important;
          }

          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Action Bar (hidden in Print Mode) */}
      <div className="no-print flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
        <button
          onClick={() => navigate('/offers')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-semibold text-sm cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back to Offer Letters</span>
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/offers/new?id=${offer.id}`)}
            className="px-3.5 h-10 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Edit3 size={15} />
            <span>Edit Offer</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Printer size={16} />
            <span>Download PDF / Print</span>
          </button>
        </div>
      </div>

      {/* CLEAN A4 OFFER LETTER SHEET */}
      <div className="a4-sheet">

        {/* ─── 1. TOP HEADER: BRANDING & OFFER META ─── */}
        <div className="flex items-start justify-between gap-6 pb-6 border-b border-slate-200">
          {/* Brand Left */}
          <div className="flex items-start gap-3.5 flex-1 min-w-0 pr-6">
            {/* Clean Quotiq SVG Logo */}
            <div className="shrink-0 mt-0.5">
              <svg width="42" height="42" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="#2563eb" />
                <circle cx="16" cy="16" r="9" stroke="white" strokeWidth="2.2" fill="none" />
                <circle cx="16" cy="16" r="3.5" fill="white" />
                <line x1="22.5" y1="22.5" x2="27" y2="27" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">
                {org?.name || 'Quotiq Technologies'}
              </h1>
              {orgAddressStr && (
                <p className="text-xs text-slate-500 mt-1 leading-relaxed w-full">
                  {orgAddressStr}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1.5 font-medium">
                {org?.phone && (
                  <span className="flex items-center gap-1">
                    <strong className="text-slate-700">Tel:</strong> {org.phone}
                  </span>
                )}
                {org?.phone && org?.email && <span className="text-slate-300">•</span>}
                {org?.email && (
                  <span className="flex items-center gap-1">
                    <strong className="text-slate-700">Email:</strong> {org.email}
                  </span>
                )}
                {org?.email && org?.website && <span className="text-slate-300">•</span>}
                {org?.website && (
                  <span className="flex items-center gap-1">
                    <strong className="text-slate-700">Web:</strong> {org.website}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Offer Meta Right */}
          <div className="text-right shrink-0">
            <div className="mb-1">
              {getStatusBadge(offer.status)}
            </div>
            <div className="text-lg font-extrabold text-slate-900 mt-1 tracking-tight font-mono">
              #{offer.offerNumber}
            </div>
            <div className="text-xs text-slate-600 mt-1.5 space-y-0.5 font-medium">
              <div><strong>Issue Date:</strong> {creationDate}</div>
              <div><strong>Joining Date:</strong> {joiningDateFormatted}</div>
            </div>
          </div>
        </div>

        {/* ─── 2. ISSUER & CANDIDATE DETAILS ─── */}
        <div className="grid grid-cols-2 gap-6 py-5 border-b border-slate-200 text-xs">
          {/* Issuer details */}
          <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Issued By
            </span>
            <div className="text-sm font-bold text-slate-900">{org?.name || 'Quotiq Technologies'}</div>
            <div className="text-slate-600 mt-1 space-y-0.5 leading-relaxed">
              {orgAddressStr && <p>{orgAddressStr}</p>}
              {org?.email && <p>Email: {org.email}</p>}
              {org?.phone && <p>Phone: {org.phone}</p>}
            </div>
          </div>

          {/* Candidate details */}
          <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Proffered To
            </span>
            <div className="text-sm font-bold text-slate-900">{offer.candidateName}</div>
            <div className="text-slate-600 mt-1 space-y-0.5 leading-relaxed">
              {candidateAddressStr && <p>Address: {candidateAddressStr}</p>}
              <p>Email: {offer.candidateEmail}</p>
              {offer.candidatePhone && <p>Phone: {offer.candidatePhone}</p>}
            </div>
          </div>
        </div>

        {/* ─── 3. POSITION & ENGAGEMENT SUMMARY ─── */}
        <div className="grid grid-cols-3 gap-3 py-4 border-b border-slate-200 text-xs">
          <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Position</span>
            <span className="text-xs font-bold text-slate-900 mt-0.5 block">{offer.jobTitle}</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Engagement</span>
            <span className="text-xs font-bold text-slate-900 mt-0.5 capitalize block">
              {offer.jobType.replace('_', ' ')} • {offer.workplaceType}
            </span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Remuneration</span>
            <span className="text-xs font-bold text-blue-700 mt-0.5 block">
              {formatINR(offer.salaryPerMonth)} / month
            </span>
          </div>
        </div>

        {/* ─── 4. SUBJECT LINE ─── */}
        <div className="bg-slate-50 border border-slate-200/90 py-2.5 px-4 my-5 rounded text-center">
          <p className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            Subject: Official Offer of Employment — {offer.jobTitle}
          </p>
        </div>

        {/* ─── 5. LETTER CONTENT ─── */}
        <div className="whitespace-pre-wrap text-xs text-slate-800 leading-relaxed font-sans mb-8">
          {offer.letterContent}
        </div>

        {/* ─── 6. ACCEPTANCE & SIGNATURES ─── */}
        <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-10 text-xs print-avoid-break">
          {/* Organization Signatory */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Authorized Signatory
            </span>
            <div className="font-bold text-slate-900">{org?.name || 'Quotiq Technologies'}</div>
            <div className="h-14 border-b border-slate-300 flex items-end pb-1">
              <span className="text-[11px] text-slate-400 italic">Signature &amp; Company Seal</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Date: {creationDate}</div>
          </div>

          {/* Candidate Acceptance */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Candidate Acceptance
            </span>
            <div className="font-bold text-slate-900">{offer.candidateName}</div>
            <div className="h-14 border-b border-slate-300 flex items-end pb-1">
              <span className="text-[11px] text-slate-400 italic">Signature &amp; Acceptance Date</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Target Joining Date: <strong className="text-slate-700">{joiningDateFormatted}</strong>
            </div>
          </div>
        </div>

        {/* ─── 7. FOOTER ─── */}
        <div className="text-center text-[10px] text-slate-400 border-t border-slate-100 pt-6 mt-8">
          This is an official employment offer document issued by {org?.name || 'Quotiq Technologies'}.
        </div>

      </div>
    </div>
  );
}
