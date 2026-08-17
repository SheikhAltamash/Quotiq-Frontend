import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/shared/lib/axios';
import { 
  ArrowLeft, 
  Printer, 
  MapPin, 
  Phone, 
  Mail, 
  Globe,
  FileText,
  CreditCard,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  address: string | null;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: string | number;
  discount: string | number;
  tax: string | number;
}

interface Payment {
  id: string;
  amount: string | number;
  paymentDate: string;
  paymentMethod: string;
  transactionReference: string | null;
  notes: string | null;
}

interface Department {
  id: string;
  name: string;
}

interface Quotation {
  id: string;
  quotationNumber: string;
  projectName: string;
  notes: string | null;
  department: Department | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  type: string;
  status: 'draft' | 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'voided';
  grandTotal: string | number;
  amountPaid: string | number;
  discountTotal: string | number;
  taxTotal: string | number;
  issueDate: string;
  dueDate: string;
  paymentTerms: string | null;
  createdAt: string;
  customer: Customer;
  quotation: Quotation | null;
  items: InvoiceItem[];
  payments: Payment[];
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

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shouldPrint = searchParams.get('print') === 'true';

  // Fetch Invoice Details
  const { data: invoice, isLoading, error } = useQuery<Invoice>({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const { data } = await api.get(`/v1/invoices/${id}`);
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
    if (invoice && shouldPrint) {
      timer = window.setTimeout(() => {
        window.print();
      }, 500);
    }
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [invoice, shouldPrint]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="py-12 text-center space-y-4">
        <p className="text-on-surface-variant font-bold">Failed to load invoice details.</p>
        <button onClick={() => navigate('/invoices')} className="text-primary hover:underline font-semibold">
          Go back to list
        </button>
      </div>
    );
  }

  // Parse contact person and billing address from notes if linked
  const notesParts = invoice.quotation?.notes ? invoice.quotation.notes.split(' | ') : [];
  const contactPerson = notesParts[1]?.replace('Contact: ', '') || '';
  const rawBillingAddress = notesParts[2]?.replace('Address: ', '') || invoice.customer?.address || '';
  const billingAddress = formatAddress(rawBillingAddress);

  const handlePrint = () => {
    window.print();
  };

  // Date Formatting for template
  const issueDateText = new Date(invoice.issueDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const dueDateText = new Date(invoice.dueDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const orgAddressStr = formatAddress(org?.address);

  // Compute subtotal from items if not provided directly
  const computedSubtotal = invoice.items.reduce((acc, item) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unitPrice) || 0;
    return acc + (qty * price);
  }, 0);

  const grandTotalNum = Number(invoice.grandTotal) || 0;
  const amountPaidNum = Number(invoice.amountPaid) || 0;
  const balanceDue = Math.max(0, grandTotalNum - amountPaidNum);

  const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">Paid</span>;
      case 'partially_paid':
        return <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">Partially Paid</span>;
      case 'overdue':
        return <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">Overdue</span>;
      case 'voided':
        return <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-300">Voided</span>;
      case 'draft':
        return <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300">Draft</span>;
      default:
        return <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">Unpaid</span>;
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
      <div className="no-print flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
        <button 
          onClick={() => navigate('/invoices')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-semibold text-sm cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back to Invoices</span>
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

      {/* PAYMENT RECORD TABLE — Screen only, light theme */}
      {invoice.payments && invoice.payments.length > 0 && (
        <div className="no-print border border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2">
              <CreditCard size={16} className="text-blue-600" />
              <span className="text-sm font-bold text-slate-900">Payment Transactions</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {invoice.payments.length} record{invoice.payments.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="text-xs text-slate-600">
              Collected: <strong className="text-emerald-600">{formatINR(invoice.amountPaid)}</strong> of {formatINR(invoice.grandTotal)}
            </div>
          </div>

          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-5">Date</th>
                <th className="py-2.5 px-5">Method</th>
                <th className="py-2.5 px-5">Reference</th>
                <th className="py-2.5 px-5">Notes</th>
                <th className="py-2.5 px-5 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
              {invoice.payments.map((pmt) => (
                <tr key={pmt.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-5 whitespace-nowrap text-slate-600 font-medium">
                    {new Date(pmt.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="py-2.5 px-5 capitalize">
                    <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-[11px] border border-emerald-200">
                      {pmt.paymentMethod?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-5 font-mono text-[11px] text-slate-500">
                    {pmt.transactionReference || '—'}
                  </td>
                  <td className="py-2.5 px-5 text-slate-500 text-[11px]">
                    {pmt.notes || '—'}
                  </td>
                  <td className="py-2.5 px-5 text-right font-bold text-emerald-600">
                    +{formatINR(pmt.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CLEAN A4 INVOICE SHEET */}
      <div className="a4-sheet">

        {/* ─── 1. TOP HEADER: BRANDING & INVOICE META ─── */}
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

          {/* Invoice Meta Right */}
          <div className="text-right shrink-0">
            <div className="mb-1">
              {getStatusBadge(invoice.status)}
            </div>
            <div className="text-lg font-extrabold text-slate-900 mt-1 tracking-tight">
              #{invoice.invoiceNumber}
            </div>
            <div className="text-xs text-slate-600 mt-1.5 space-y-0.5 font-medium">
              <div><strong>Issue Date:</strong> {issueDateText}</div>
              <div><strong>Due Date:</strong> {dueDateText}</div>
              {invoice.quotation?.quotationNumber && (
                <div className="text-slate-500"><strong>Ref Quotation:</strong> #{invoice.quotation.quotationNumber}</div>
              )}
            </div>
          </div>
        </div>

        {/* ─── 2. BILLED TO & INVOICE DETAILS ─── */}
        <div className="grid grid-cols-2 gap-6 py-5 border-b border-slate-200 text-xs">
          {/* Client Info */}
          <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Billed To
            </span>
            <div className="text-sm font-bold text-slate-900">
              {invoice.customer?.company || invoice.customer?.name || 'Valued Client'}
            </div>
            {invoice.customer?.company && invoice.customer?.name && (
              <div className="text-slate-700 font-medium mt-0.5">
                Attn: {invoice.customer.name}
              </div>
            )}
            {contactPerson && contactPerson !== invoice.customer?.name && (
              <div className="text-slate-600 mt-0.5">
                Contact: {contactPerson}
              </div>
            )}
            {invoice.customer?.email && (
              <div className="text-slate-600 mt-0.5">
                Email: {invoice.customer.email}
              </div>
            )}
            {invoice.customer?.phone && (
              <div className="text-slate-600 mt-0.5">
                Phone: {invoice.customer.phone}
              </div>
            )}
            {billingAddress && (
              <div className="text-slate-500 mt-1 leading-relaxed">
                Address: {billingAddress}
              </div>
            )}
          </div>

          {/* Invoice Summary */}
          <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Invoice Summary
            </span>
            <div className="text-sm font-bold text-slate-900">
              {invoice.quotation?.projectName || 'Commercial Invoice'}
            </div>
            {invoice.quotation?.department?.name && (
              <div className="text-slate-700 font-medium mt-0.5">
                Department: {invoice.quotation.department.name}
              </div>
            )}
            <div className="text-slate-600 mt-0.5">
              Currency: <strong className="text-slate-800">INR (₹)</strong>
            </div>
            <div className="text-slate-600 mt-0.5">
              Payment Terms: <strong className="text-slate-800">{invoice.paymentTerms || 'Due on Receipt'}</strong>
            </div>
            <div className="text-slate-600 mt-0.5">
              Status: <span className="capitalize font-semibold text-slate-800">{invoice.status.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        {/* ─── 3. ITEM DETAILS TABLE ─── */}
        <div className="py-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
            Invoice Line Items
          </h2>

          <table className="w-full border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-300 text-slate-700 font-bold text-[11px]">
                <th className="py-2 px-3 text-center w-10 border-r border-slate-300">#</th>
                <th className="py-2 px-3 text-left border-r border-slate-300">Item / Description</th>
                <th className="py-2 px-3 text-center w-16 border-r border-slate-300">Qty</th>
                <th className="py-2 px-3 text-right w-28 border-r border-slate-300">Unit Price (₹)</th>
                {(Number(invoice.discountTotal) > 0 || Number(invoice.taxTotal) > 0) && (
                  <th className="py-2 px-3 text-center w-20 border-r border-slate-300">Tax/Disc</th>
                )}
                <th className="py-2 px-3 text-right w-32">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {invoice.items && invoice.items.length > 0 ? (
                invoice.items.map((item, itemIdx) => {
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
                      {(Number(invoice.discountTotal) > 0 || Number(invoice.taxTotal) > 0) && (
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
                    No items in this invoice.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ─── 4. FINANCIAL TOTALS & AMOUNT IN WORDS ─── */}
        <div className="py-4 border-t border-slate-200 print-avoid-break">
          <div className="flex justify-between items-start gap-6">
            {/* Amount In Words */}
            <div className="flex-1 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Amount in Words (INR)
              </span>
              <p className="font-semibold text-slate-800 italic bg-slate-50 p-2.5 rounded border border-slate-200/80">
                {numberToWords(grandTotalNum)}
              </p>

              {/* Status Note */}
              <div className="mt-3 text-[11px] text-slate-500">
                {balanceDue === 0 ? (
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <CheckCircle2 size={14} />
                    <span>This invoice has been settled in full. Thank you for your business!</span>
                  </div>
                ) : (
                  <div>
                    Payment due on or before <strong>{dueDateText}</strong>.
                  </div>
                )}
              </div>
            </div>

            {/* Financial Summary Box */}
            <div className="w-72 shrink-0 text-xs">
              <div className="space-y-1.5 border border-slate-200 rounded p-3 bg-slate-50/60">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800">
                    {formatINR(computedSubtotal)}
                  </span>
                </div>

                {Number(invoice.discountTotal) > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>Discount:</span>
                    <span className="font-semibold">
                      - {formatINR(invoice.discountTotal)}
                    </span>
                  </div>
                )}

                {Number(invoice.taxTotal) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Estimated Tax / GST:</span>
                    <span className="font-semibold text-slate-800">
                      + {formatINR(invoice.taxTotal)}
                    </span>
                  </div>
                )}

                <div className="border-t border-slate-300 pt-2 mt-2 flex justify-between items-center text-sm font-extrabold text-slate-900">
                  <span>Total Amount:</span>
                  <span className="text-blue-700">
                    {formatINR(invoice.grandTotal)}
                  </span>
                </div>

                {amountPaidNum > 0 && (
                  <>
                    <div className="flex justify-between text-emerald-700 pt-1">
                      <span>Amount Paid:</span>
                      <span className="font-semibold">
                        {formatINR(invoice.amountPaid)}
                      </span>
                    </div>

                    <div className="border-t border-slate-200 pt-1.5 flex justify-between items-center text-xs font-bold text-slate-900">
                      <span>Balance Due:</span>
                      <span className={balanceDue > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                        {formatINR(balanceDue)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── 5. PAYMENT METHODS & BANK DETAILS ─── */}
        <div className="py-4 border-t border-slate-200 text-xs print-avoid-break">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Payment Directions &amp; Instructions
          </h2>
          <div className="bg-slate-50 p-3 rounded border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
            {invoice.paymentTerms ? (
              <p className="whitespace-pre-line">{invoice.paymentTerms}</p>
            ) : (
              <p>
                Please process the settlement using your designated online bank transfer or NEFT/RTGS/UPI channel. Once executed, kindly quote Invoice <strong>#{invoice.invoiceNumber}</strong> in the transaction memo for swift reconciliation.
              </p>
            )}
          </div>
        </div>

        {/* ─── 6. AUTHORIZATION SIGNATURES ─── */}
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
            <div className="text-[11px] text-slate-500 mt-1">Date: {issueDateText}</div>
          </div>

          {/* Client Handover / Acknowledgement */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Client Acknowledgement
            </span>
            <div className="font-bold text-slate-900">{invoice.customer?.company || invoice.customer?.name || 'Client Representative'}</div>
            <div className="h-14 border-b border-slate-300 flex items-end pb-1">
              <span className="text-[11px] text-slate-400 italic">Signature &amp; Received Date</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Acknowledgment of goods/services receipt.</div>
          </div>
        </div>

      </div>
    </div>
  );
}
