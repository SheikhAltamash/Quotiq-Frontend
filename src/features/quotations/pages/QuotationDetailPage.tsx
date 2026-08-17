import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/shared/lib/axios';
import { 
  ArrowLeft, 
  Printer, 
  User, 
  MapPin, 
  Calendar,
  Clock,
  Phone,
  Mail,
  Globe,
  FileText,
  CheckCircle2,
  Building2,
  CreditCard
} from 'lucide-react';

interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: string | number;
  discount: string | number;
  tax: string | number;
}

interface QuotationSection {
  id: string;
  name: string;
  items: QuotationItem[];
}

interface Customer {
  id: string;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  address: string | null;
}

interface Department {
  id: string;
  name: string;
}

interface Quotation {
  id: string;
  quotationNumber: string;
  projectName: string;
  projectType: string | null;
  description: string | null;
  status: string;
  currency: string;
  subtotal: string | number;
  discountTotal: string | number;
  taxTotal: string | number;
  grandTotal: string | number;
  validUntil: string | null;
  paymentTerms: string | null;
  termsAndConditions: string | null;
  notes: string | null;
  createdAt: string;
  customer: Customer;
  department: Department | null;
  sections: QuotationSection[];
}

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

// Helper to format currency in Indian Rupees
function formatINR(val: string | number): string {
  const num = Number(val) || 0;
  return `₹ ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Helper to convert numbers to words in Indian Rupees style
function numberToWords(num: number): string {
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const numToWordsIndian = (n: number): string => {
    if (n < 20) return a[n] || '';
    if (n < 100) return (b[Math.floor(n / 10)] || '') + (n % 10 ? ' ' + (a[n % 10] || '') : '');
    if (n < 1000) return (a[Math.floor(n / 100)] || '') + ' Hundred' + (n % 100 ? ' and ' + numToWordsIndian(n % 100) : '');
    if (n < 100000) return numToWordsIndian(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numToWordsIndian(n % 1000) : '');
    if (n < 10000000) return numToWordsIndian(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numToWordsIndian(n % 100000) : '');
    return numToWordsIndian(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numToWordsIndian(n % 10000000) : '');
  };

  if (num === 0) return 'Zero Rupees Only';
  const val = Math.floor(Math.abs(num));
  return numToWordsIndian(val) + ' Rupees Only';
}

// Helper to format organization and customer addresses cleanly on a single wide line
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

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shouldPrint = searchParams.get('print') === 'true';

  // Fetch single quotation details
  const { data: quotation, isLoading, error } = useQuery<Quotation>({
    queryKey: ['quotation', id],
    queryFn: async () => {
      const { data } = await api.get(`/v1/quotations/${id}`);
      return data.data;
    },
    enabled: !!id,
  });

  // Fetch Organization settings for clean dynamic branding
  const { data: org } = useQuery<Organization>({
    queryKey: ['organization'],
    queryFn: async () => {
      const { data } = await api.get('/v1/organization');
      return data.data;
    },
  });

  useEffect(() => {
    let timer: number | undefined;
    if (quotation && shouldPrint) {
      timer = window.setTimeout(() => {
        window.print();
      }, 500);
    }
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [quotation, shouldPrint]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="py-12 text-center space-y-4">
        <p className="text-on-surface-variant font-bold">Failed to load quotation details.</p>
        <button onClick={() => navigate('/quotations')} className="text-primary hover:underline font-semibold">
          Go back to list
        </button>
      </div>
    );
  }

  // Parse contact person and billing address from notes
  const notesParts = quotation.notes ? quotation.notes.split(' | ') : [];
  const duration = notesParts[0] || '';
  const contactPerson = notesParts[1]?.replace('Contact: ', '') || '';
  const rawBillingAddress = notesParts[2]?.replace('Address: ', '') || quotation.customer?.address || '';
  const billingAddress = formatAddress(rawBillingAddress);

  const handlePrint = () => {
    window.print();
  };

  // Date Formatting for template
  const rawDate = new Date(quotation.createdAt);
  const formattedDate = rawDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Validity Date Formatting
  const validUntilFormatted = quotation.validUntil
    ? new Date(quotation.validUntil).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '15 Days from Issue';

  const orgAddressStr = formatAddress(org?.address);

  const currencySymbol = quotation.currency === 'INR' ? '₹' : quotation.currency === 'EUR' ? '€' : quotation.currency === 'GBP' ? '£' : '$';

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

          /* Reset containers */
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

          .print-break-before {
            page-break-before: always !important;
            break-before: page !important;
          }

          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          thead {
            display: table-header-group;
          }

          tfoot {
            display: table-footer-group;
          }
        }
      `}</style>

      {/* ACTION BAR */}
      <div className="no-print flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
        <button 
          onClick={() => navigate('/quotations')}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors font-semibold text-sm cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back to Quotations</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-4 h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Printer size={16} />
            <span>Download PDF / Print</span>
          </button>
        </div>
      </div>

      {/* CLEAN A4 DOCUMENT SHEET */}
      <div className="a4-sheet">
        
        {/* ─── 1. TOP HEADER: BRANDING & QUOTATION META ─── */}
        <div className="flex items-start justify-between pb-6 border-b border-slate-200">
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

          {/* Quotation Meta Right */}
          <div className="text-right shrink-0">
            <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              Quotation
            </span>
            <div className="text-lg font-extrabold text-slate-900 mt-1 tracking-tight">
              #{quotation.quotationNumber}
            </div>
            <div className="text-xs text-slate-600 mt-1.5 space-y-0.5 font-medium">
              <div><strong>Date:</strong> {formattedDate}</div>
              <div><strong>Valid Until:</strong> {validUntilFormatted}</div>
              {quotation.department?.name && (
                <div className="text-slate-500"><strong>Dept:</strong> {quotation.department.name}</div>
              )}
            </div>
          </div>
        </div>

        {/* ─── 2. CLIENT & PROJECT SUMMARY CARDS ─── */}
        <div className="grid grid-cols-2 gap-6 py-5 border-b border-slate-200 text-xs">
          {/* Client Info */}
          <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Prepared For
            </span>
            <div className="text-sm font-bold text-slate-900">
              {quotation.customer?.company || quotation.customer?.name || 'Valued Client'}
            </div>
            {quotation.customer?.company && quotation.customer?.name && (
              <div className="text-slate-700 font-medium mt-0.5">
                Attn: {quotation.customer.name}
              </div>
            )}
            {contactPerson && contactPerson !== quotation.customer?.name && (
              <div className="text-slate-600 mt-0.5">
                Contact: {contactPerson}
              </div>
            )}
            {quotation.customer?.email && (
              <div className="text-slate-600 mt-0.5">
                Email: {quotation.customer.email}
              </div>
            )}
            {quotation.customer?.phone && (
              <div className="text-slate-600 mt-0.5">
                Phone: {quotation.customer.phone}
              </div>
            )}
            {billingAddress && (
              <div className="text-slate-500 mt-1 leading-relaxed">
                Address: {billingAddress}
              </div>
            )}
          </div>

          {/* Project Info */}
          <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Project Details
            </span>
            <div className="text-sm font-bold text-slate-900">
              {quotation.projectName || 'Project Quotation'}
            </div>
            {quotation.projectType && (
              <div className="text-slate-700 font-medium mt-0.5">
                Type: {quotation.projectType}
              </div>
            )}
            {duration && (
              <div className="text-slate-600 mt-0.5">
                Estimated Timeline: <strong className="text-slate-800">{duration}</strong>
              </div>
            )}
            <div className="text-slate-600 mt-0.5">
              Currency: <strong className="text-slate-800">INR (₹)</strong>
            </div>
            <div className="text-slate-600 mt-0.5">
              Status: <span className="capitalize font-semibold text-slate-800">{quotation.status}</span>
            </div>
          </div>
        </div>

        {/* ─── 3. PROJECT OVERVIEW (If provided in editor) ─── */}
        {quotation.description && (
          <div className="py-4 border-b border-slate-200 print-avoid-break">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Project Overview &amp; Objectives
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed text-justify">
              {quotation.description}
            </p>
          </div>
        )}

        {/* ─── 4. DELIVERABLES & LINE ITEMS ─── */}
        <div className="py-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
            Scope of Work &amp; Quotation Items
          </h2>

          {quotation.sections && quotation.sections.length > 0 ? (
            <div className="space-y-6">
              {quotation.sections.map((section, secIdx) => {
                // Parse section name and optional scope description from editor
                const parts = section.name.split('|||');
                const moduleName = parts[0]?.trim() || section.name;
                const scopeText = parts[1]?.trim() || '';
                const scopeLines = scopeText
                  ? scopeText.split('\n').map((l: string) => l.trim()).filter(Boolean)
                  : [];

                return (
                  <div key={section.id || secIdx} className="print-avoid-break">
                    {/* Section Header */}
                    <div className="bg-slate-100/90 px-3.5 py-2 rounded-t border-t border-x border-slate-300 flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">
                        {secIdx + 1}. {moduleName}
                      </span>
                    </div>

                    {/* Scope text / bullet points if added in editor */}
                    {scopeLines.length > 0 && (
                      <div className="bg-slate-50/50 px-3.5 py-2 border-x border-slate-300 text-[11px] text-slate-600">
                        <ul className="list-disc pl-4 space-y-0.5">
                          {scopeLines.map((line, li) => (
                            <li key={li}>{line.replace(/^[•\-]\s*/, '')}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Section Items Table */}
                    <table className="w-full border-collapse border border-slate-300 text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-300 text-slate-700 font-bold text-[11px]">
                          <th className="py-2 px-3 text-center w-10 border-r border-slate-300">#</th>
                          <th className="py-2 px-3 text-left border-r border-slate-300">Item / Description</th>
                          <th className="py-2 px-3 text-center w-16 border-r border-slate-300">Qty</th>
                          <th className="py-2 px-3 text-right w-28 border-r border-slate-300">Unit Price (₹)</th>
                          {(Number(quotation.discountTotal) > 0 || Number(quotation.taxTotal) > 0) && (
                            <th className="py-2 px-3 text-center w-20 border-r border-slate-300">Tax/Disc</th>
                          )}
                          <th className="py-2 px-3 text-right w-32">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-800">
                        {section.items && section.items.length > 0 ? (
                          section.items.map((item, itemIdx) => {
                            const qty = Number(item.quantity) || 1;
                            const price = Number(item.unitPrice) || 0;
                            const discPct = Number(item.discount) || 0;
                            const taxPct = Number(item.tax) || 0;
                            const baseTotal = qty * price;
                            const discAmt = baseTotal * (discPct / 100);
                            const itemTaxable = baseTotal - discAmt;
                            const taxAmt = itemTaxable * (taxPct / 100);
                            const lineTotal = itemTaxable + taxAmt;

                            const descParts = item.description.split(' - ');
                            const title = descParts[0] || item.description;
                            const detail = descParts[1] || '';

                            return (
                              <tr key={item.id || itemIdx} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-3 text-center text-slate-500 border-r border-slate-300 font-medium">
                                  {itemIdx + 1}
                                </td>
                                <td className="py-2.5 px-3 border-r border-slate-300">
                                  <div className="font-semibold text-slate-900">{title}</div>
                                  {detail && (
                                    <div className="text-[11px] text-slate-500 mt-0.5">{detail}</div>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center text-slate-700 border-r border-slate-300 font-medium">
                                  {qty} {item.unit ? <span className="text-[10px] text-slate-500">{item.unit}</span> : ''}
                                </td>
                                <td className="py-2.5 px-3 text-right font-medium text-slate-700 border-r border-slate-300">
                                  {formatINR(price)}
                                </td>
                                {(Number(quotation.discountTotal) > 0 || Number(quotation.taxTotal) > 0) && (
                                  <td className="py-2.5 px-3 text-center text-[10px] text-slate-500 border-r border-slate-300">
                                    {discPct > 0 && <span className="text-amber-600 block">-{discPct}%</span>}
                                    {taxPct > 0 && <span className="text-slate-600 block">+{taxPct}%</span>}
                                    {discPct === 0 && taxPct === 0 && <span>—</span>}
                                  </td>
                                )}
                                <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                  {formatINR(lineTotal)}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-3 px-3 text-center text-slate-400 italic">
                              No items in this section
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 border border-dashed border-slate-300 rounded text-slate-500 text-xs">
              No sections or line items drafted.
            </div>
          )}
        </div>

        {/* ─── 5. FINANCIAL TOTALS & NUMBER IN WORDS ─── */}
        <div className="py-4 border-t border-slate-200 print-avoid-break">
          <div className="flex justify-between items-start gap-6">
            {/* Amount In Words & Notes */}
            <div className="flex-1 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Amount in Words (INR)
              </span>
              <p className="font-semibold text-slate-800 italic bg-slate-50 p-2.5 rounded border border-slate-200/80">
                {numberToWords(Number(quotation.grandTotal) || 0)}
              </p>
            </div>

            {/* Financial Summary Table */}
            <div className="w-72 shrink-0 text-xs">
              <div className="space-y-1.5 border border-slate-200 rounded p-3 bg-slate-50/60">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800">
                    {formatINR(quotation.subtotal)}
                  </span>
                </div>

                {Number(quotation.discountTotal) > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>Discount:</span>
                    <span className="font-semibold">
                      - {formatINR(quotation.discountTotal)}
                    </span>
                  </div>
                )}

                {Number(quotation.taxTotal) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Estimated Tax / GST:</span>
                    <span className="font-semibold text-slate-800">
                      + {formatINR(quotation.taxTotal)}
                    </span>
                  </div>
                )}

                <div className="border-t border-slate-300 pt-2 mt-2 flex justify-between items-center text-sm font-extrabold text-slate-900">
                  <span>Grand Total:</span>
                  <span className="text-blue-700">
                    {formatINR(quotation.grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 6. PAYMENT TERMS & MILESTONES ─── */}
        {quotation.paymentTerms && (
          <div className="py-4 border-t border-slate-200 text-xs print-avoid-break">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Payment Terms &amp; Milestones
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {(() => {
                const parts = quotation.paymentTerms.split(',').map((s: string) => s.trim()).filter(Boolean);
                const defaultLabels = ['1. Project Advance', '2. Mid-Development Stage', '3. Final Handover & Launch'];
                const grandTotal = Number(quotation.grandTotal) || 0;

                return parts.map((pctStr: string, idx: number) => {
                  const pctNum = parseFloat(pctStr);
                  const amount = isNaN(pctNum) ? 0 : (grandTotal * pctNum) / 100;

                  return (
                    <div key={idx} className="bg-slate-50 p-2.5 rounded border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">
                        {defaultLabels[idx] || `Milestone ${idx + 1}`}
                      </span>
                      <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                        {isNaN(pctNum) ? pctStr : `${pctNum}%`}
                      </div>
                      {!isNaN(pctNum) && (
                        <div className="text-[11px] font-semibold text-blue-600 mt-0.5">
                          {formatINR(amount)}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}


        {/* ─── 7. TERMS AND CONDITIONS ─── */}
        <div className="py-4 border-t border-slate-200 text-xs print-avoid-break">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Terms &amp; Conditions
          </h2>
          {quotation.termsAndConditions ? (
            <div className="text-slate-600 text-[11px] leading-relaxed whitespace-pre-line">
              {quotation.termsAndConditions}
            </div>
          ) : (
            <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
              <li><strong>Validity:</strong> This quotation remains valid for {validUntilFormatted}.</li>
              <li><strong>Scope Adjustments:</strong> Any work or features not specified in this document will be quoted separately.</li>
              <li><strong>Payment Schedule:</strong> Invoices are payable according to the agreed milestone terms outlined above.</li>
              <li><strong>Intellectual Property:</strong> Full ownership of custom source codes and deliverables transfers upon complete settlement of invoices.</li>
              <li><strong>Confidentiality:</strong> Both parties agree to maintain strict confidentiality regarding project assets and specifications.</li>
            </ul>
          )}
        </div>

        {/* ─── 8. AUTHORIZATION & ACCEPTANCE SIGN-OFF ─── */}
        <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-10 text-xs print-avoid-break">
          {/* Issuer Signature */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Authorized Signatory
            </span>
            <div className="font-bold text-slate-900">{org?.name || 'Quotiq Technologies'}</div>
            <div className="h-14 border-b border-slate-300 flex items-end pb-1">
              <span className="text-[11px] text-slate-400 italic">Official Signature &amp; Stamp</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Date: {formattedDate}</div>
          </div>

          {/* Client Acceptance */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Client Acceptance
            </span>
            <div className="font-bold text-slate-900">{quotation.customer?.company || quotation.customer?.name || 'Client Representative'}</div>
            <div className="h-14 border-b border-slate-300 flex items-end pb-1">
              <span className="text-[11px] text-slate-400 italic">Signature &amp; Acceptance Date</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">I accept the terms and deliverables specified above.</div>
          </div>
        </div>

      </div>
    </div>
  );
}
