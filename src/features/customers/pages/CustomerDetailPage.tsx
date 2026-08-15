import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/shared/lib/axios';
import {
  Loader2,
  ArrowLeft,
  Calendar,
  PlusCircle,
  Mail,
  Phone,
  Rocket,
  Edit2,
  FileText,
  Trash2,
  DollarSign,
  AlertTriangle,
  Folder,
  Save,
  MessageSquare,
  User,
  Activity,
  Send,
  CheckCircle2,
  ArrowRight,
  Clock,
  Mic,
  Sparkles
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal from '@/shared/components/ui/Modal';
import CustomerPortalTab from '../components/CustomerPortalTab';
import CustomerDocumentsTab from '../components/CustomerDocumentsTab';

interface Address {
  type: 'billing' | 'shipping';
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface Customer {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  gstNumber: string | null;
  panNumber: string | null;
  notes: string | null;
  status: 'active' | 'completed' | 'discarded';
  notesList: any[];
  followupsList: any[];
  addresses: Address[];
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
  updatedAt?: string;
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'portal'>('overview');

  // Modal forms
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isFollowupOpen, setIsFollowupOpen] = useState(false);

  // Edit Customer states
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [statusVal, setStatusVal] = useState<'active' | 'completed' | 'discarded'>('active');
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [billingStreet, setBillingStreet] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingState, setBillingState] = useState('');
  const [billingZip, setBillingZip] = useState('');
  const [billingCountry, setBillingCountry] = useState('India');
  const [departmentId, setDepartmentId] = useState('');

  // Internal Notes states
  const [newNote, setNewNote] = useState('');
  const [noteCreator, setNoteCreator] = useState('');

  // Follow-up states
  const [followupEvent, setFollowupEvent] = useState('');
  const [followupType, setFollowupType] = useState('Inbound');
  const [followupNotes, setFollowupNotes] = useState('');

  // Voice + AI enhance states for event notes
  const [isRecording, setIsRecording] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Fetch departments
  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await api.get('/v1/departments');
      return data.data;
    },
  });

  // Start/stop voice recording and transcribe via backend
  const handleMicClick = async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', blob, 'recording.webm');
        try {
          const { data } = await api.post('/v1/ai/transcribe', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          const transcript: string = data.data.transcript || '';
          setFollowupNotes((prev) => (prev ? prev + ' ' + transcript : transcript));
          toast.success('Voice transcribed!');
        } catch {
          toast.error('Transcription failed. Please try again.');
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast('Recording… tap mic again to stop', { icon: '🎙️' });
    } catch {
      toast.error('Microphone access denied.');
    }
  };

  // Enhance event notes text with AI via backend
  const handleEnhanceNotes = async () => {
    if (!followupNotes.trim()) {
      toast.error('Please write or dictate some notes first.');
      return;
    }
    setIsEnhancing(true);
    try {
      const { data } = await api.post('/v1/ai/enhance-text', {
        text: followupNotes,
        context: followupEvent ? `Follow-up event: ${followupEvent}` : undefined,
      });
      setFollowupNotes(data.data.enhanced);
      toast.success('Notes enhanced by AI!');
    } catch {
      toast.error('AI enhancement failed.');
    } finally {
      setIsEnhancing(false);
    }
  };

  // Fetch customer details
  const { data: customer, isLoading: loadingCustomer } = useQuery<Customer>({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { data } = await api.get(`/v1/customers/${id}`);
      return data.data;
    },
    enabled: !!id,
  });

  // Fetch quotations for timeline
  const { data: quotations = [] } = useQuery<any[]>({
    queryKey: ['quotations'],
    queryFn: async () => {
      const { data } = await api.get('/v1/quotations');
      return data.data;
    },
  });

  // Fetch invoices for timeline & balance
  const { data: invoices = [] } = useQuery<any[]>({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data } = await api.get('/v1/invoices');
      return data.data;
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.put(`/v1/customers/${id}`, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer updated successfully');
      setIsEditOpen(false);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || 'Failed to update customer';
      toast.error(msg);
    },
  });

  if (loadingCustomer || !customer) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Filter transactions
  const customerQuotations = quotations.filter((q) => q.customer?.id === id);
  const customerInvoices = invoices.filter((inv) => inv.customer?.id === id);

  // Outstanding Balance
  const outstandingBalance = customerInvoices.reduce((sum, inv) => {
    if (inv.status !== 'paid' && inv.status !== 'voided') {
      return sum + (Number(inv.grandTotal || 0) - Number(inv.amountPaid || 0));
    }
    return sum;
  }, 0);

  // Determine Overdue Invoices
  const hasOverdueInvoices = customerInvoices.some(
    (inv) =>
      inv.status === 'overdue' ||
      (inv.status === 'unpaid' && new Date(inv.dueDate) < new Date())
  );

  // Dynamic Status Resolve
  let resolvedLabel = 'Active';
  let resolvedClass = 'bg-green-100 text-green-700';

  if (customer.status === 'completed') {
    resolvedLabel = 'Completed';
    resolvedClass = 'bg-blue-100 text-blue-700';
  } else if (customer.status === 'discarded') {
    resolvedLabel = 'Discarded';
    resolvedClass = 'bg-outline-variant/40 text-secondary';
  } else if (hasOverdueInvoices) {
    resolvedLabel = 'Overdue';
    resolvedClass = 'bg-error-container text-error';
  }

  // Build Chronological Timeline Events
  const timelineEvents: {
    type: string;
    title: string;
    description: string;
    date: string;
    time: string;
    icon: any;
    colorClass: string;
  }[] = [];

  // 1. Customer Status Transitions
  if (customer.status === 'completed') {
    const compDate = new Date(customer.updatedAt || new Date());
    timelineEvents.push({
      type: 'completed',
      title: 'Client Project Completed',
      description: 'Account successfully marked as completed',
      date: compDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      time: compDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      icon: CheckCircle2,
      colorClass: 'bg-blue-600 text-white shadow-sm',
    });
  } else if (customer.status === 'discarded') {
    const discDate = new Date(customer.updatedAt || new Date());
    timelineEvents.push({
      type: 'discarded',
      title: 'Client Account Discarded',
      description: 'Account marked as discarded or inactive',
      date: discDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      time: discDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      icon: AlertTriangle,
      colorClass: 'bg-outline-variant/40 text-secondary shadow-sm',
    });
  }

  // 2. Quotation Milestone Events
  customerQuotations.forEach((q) => {
    const createdDate = new Date(q.createdAt);
    timelineEvents.push({
      type: 'create',
      title: 'Quotation Generated',
      description: `${q.quotationNumber}: ${q.projectName || 'Project Proposal'}`,
      date: createdDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      time: createdDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      icon: Send,
      colorClass: 'bg-primary-fixed text-primary',
    });

    if (q.status === 'sent') {
      const sentDate = new Date(q.updatedAt);
      timelineEvents.push({
        type: 'sent',
        title: 'Quotation Sent',
        description: `Quotation ${q.quotationNumber} dispatched to client`,
        date: sentDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        time: sentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        icon: Mail,
        colorClass: 'bg-purple-100 text-purple-700',
      });
    } else if (q.status === 'accepted') {
      const acceptedDate = new Date(q.updatedAt);
      timelineEvents.push({
        type: 'accepted',
        title: 'Quotation Accepted',
        description: `Quotation ${q.quotationNumber} accepted by client`,
        date: acceptedDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        time: acceptedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        icon: CheckCircle2,
        colorClass: 'bg-teal-100 text-teal-700',
      });
    } else if (q.status === 'approved') {
      const approvedDate = new Date(q.updatedAt);
      timelineEvents.push({
        type: 'approved',
        title: 'Quotation Approved',
        description: `Project Q-${q.quotationNumber.split('-')[1]} signed off successfully`,
        date: approvedDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        time: approvedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        icon: CheckCircle2,
        colorClass: 'bg-primary text-white shadow-sm',
      });
    } else if (q.status === 'rejected') {
      const rejectedDate = new Date(q.updatedAt);
      timelineEvents.push({
        type: 'rejected',
        title: 'Quotation Declined',
        description: `Proposal ${q.quotationNumber} was declined by client`,
        date: rejectedDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        time: rejectedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        icon: AlertTriangle,
        colorClass: 'bg-red-100 text-red-700',
      });
    } else if (q.status === 'expired') {
      const expiredDate = new Date(q.updatedAt);
      timelineEvents.push({
        type: 'expired',
        title: 'Quotation Expired',
        description: `Proposal ${q.quotationNumber} expired without signoff`,
        date: expiredDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        time: expiredDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        icon: Clock,
        colorClass: 'bg-outline-variant/40 text-secondary',
      });
    }
  });

  // 3. Invoice & Payments Milestone Events
  customerInvoices.forEach((inv) => {
    const invDate = new Date(inv.createdAt);
    timelineEvents.push({
      type: 'invoice',
      title: 'Invoice Dispatched',
      description: `${inv.invoiceNumber} sent for payment of ₹${Number(inv.grandTotal).toLocaleString('en-IN')}`,
      date: invDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      time: invDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      icon: FileText,
      colorClass: 'bg-amber-100 text-amber-700',
    });

    if (inv.payments && inv.payments.length > 0) {
      // Sort payments for this invoice chronologically (oldest first to find "first payment")
      const sortedPayments = [...inv.payments].sort((a: any, b: any) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
      
      sortedPayments.forEach((pmt: any, idx: number) => {
        const pmtDate = new Date(pmt.paymentDate);
        const isFirst = idx === 0;
        timelineEvents.push({
          type: 'pay',
          title: isFirst ? 'First Installment Received' : 'Payment Clearance Received',
          description: `Received ₹${Number(pmt.amount).toLocaleString('en-IN')} via ${pmt.paymentMethod.replace('_', ' ')} (${pmt.notes || 'No description'})`,
          date: pmtDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          time: pmtDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          icon: DollarSign,
          colorClass: 'bg-emerald-100 text-emerald-700',
        });
      });
    }

    if (inv.status === 'paid') {
      const paidDate = new Date(inv.updatedAt);
      timelineEvents.push({
        type: 'pay',
        title: 'Invoice Fully Settled',
        description: `Cleared total balance of ₹${Number(inv.grandTotal).toLocaleString('en-IN')} for ${inv.invoiceNumber}`,
        date: paidDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        time: paidDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        icon: CheckCircle2,
        colorClass: 'bg-green-600 text-white shadow-sm',
      });
    }
  });

  // Sort timeline chronologically (latest first)
  timelineEvents.sort((a, b) => new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime());

  // Edit Handlers
  const handleOpenEdit = () => {
    setName(customer.name);
    setCompany(customer.company || '');
    setEmail(customer.email || '');
    setPhone(customer.phone || '');
    setStatusVal(customer.status || 'active');
    setGstNumber(customer.gstNumber || '');
    setPanNumber(customer.panNumber || '');
    setNotes(customer.notes || '');
    setDepartmentId(customer.departmentId || '');

    const billing = customer.addresses.find((a) => a.type === 'billing');
    if (billing) {
      setBillingStreet(billing.street);
      setBillingCity(billing.city);
      setBillingState(billing.state);
      setBillingZip(billing.zipCode);
      setBillingCountry(billing.country);
    } else {
      setBillingStreet('');
      setBillingCity('');
      setBillingState('');
      setBillingZip('');
      setBillingCountry('India');
    }

    setIsEditOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const addresses = [];
    if (billingStreet || billingCity) {
      addresses.push({
        type: 'billing' as const,
        street: billingStreet,
        city: billingCity,
        state: billingState,
        zipCode: billingZip,
        country: billingCountry,
      });
    }

    updateMutation.mutate({
      name,
      company: company || '',
      email: email || '',
      phone: phone || '',
      status: statusVal,
      gstNumber: gstNumber || '',
      panNumber: panNumber || '',
      notes: notes || '',
      departmentId: departmentId || null,
      addresses,
    });
  };

  // Notes Action
  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const notesList = [...(customer.notesList || [])];
    notesList.unshift({
      id: crypto.randomUUID(),
      creator: noteCreator.trim() || 'System Account',
      content: newNote.trim(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    });

    updateMutation.mutate({
      name: customer.name,
      notesList,
    });
    setNewNote('');
    setNoteCreator('');
  };

  // Followup Action
  const handleAddFollowup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followupEvent.trim()) return;
    const followupsList = [...(customer.followupsList || [])];
    followupsList.unshift({
      id: crypto.randomUUID(),
      event: followupEvent.trim(),
      type: followupType,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      notes: followupNotes.trim() || '—',
    });

    updateMutation.mutate({
      name: customer.name,
      followupsList,
    });
    setFollowupEvent('');
    setFollowupNotes('');
    setIsFollowupOpen(false);
  };

  return (
    <div className="flex-1 min-h-screen bg-surface-bright pb-10">
      <div className="max-w-[1280px] mx-auto p-lg space-y-lg">
        
        {/* Back Link */}
        <div className="flex items-center gap-xs">
          <Link to="/customers" className="text-secondary hover:text-primary flex items-center gap-1.5 text-body-sm font-semibold transition-colors">
            <ArrowLeft size={16} /> Back to Customer Registry
          </Link>
        </div>

        {/* Client Header Section */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start gap-lg">
            <div className="flex gap-lg items-start">
              <div className="w-20 h-20 bg-primary-fixed rounded-xl flex items-center justify-center text-primary shrink-0">
                <Rocket size={40} className="stroke-[1.5]" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-sm flex-wrap">
                  <h2 className="font-page-title text-[32px] text-on-surface leading-tight">
                    {customer.company || customer.name}
                  </h2>
                  <span className={`status-pill ${resolvedClass} px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase`}>
                    {resolvedLabel}
                  </span>
                </div>
                <p className="font-section-heading text-[18px] text-secondary flex items-center gap-2 flex-wrap">
                  <span>{customer.company ? `Representative: ${customer.name}` : 'Private Client'}</span>
                  {customer.department && (
                    <span className="text-[11px] bg-primary/5 text-primary px-2.5 py-0.5 rounded-full border border-primary/20 font-bold uppercase tracking-wider">
                      {customer.department.name}
                    </span>
                  )}
                </p>
                <p className="font-body-md text-on-surface-variant max-w-2xl leading-relaxed">
                  {customer.notes || 'No description or account notes provided for this customer profile.'}
                </p>
              </div>
            </div>
            <div className="flex gap-sm">
              <button
                onClick={handleOpenEdit}
                className="px-md py-sm border border-outline-variant rounded-lg font-body-sm font-semibold text-secondary hover:bg-surface-container transition-all flex items-center gap-1.5"
              >
                <Edit2 size={14} /> Edit Profile
              </button>
              <Link
                to={`/invoices/new?customer=${customer.id}`}
                className="px-md py-sm bg-primary text-white rounded-lg font-body-sm font-semibold shadow-sm hover:bg-primary/95 active:scale-[0.98] transition-all flex items-center gap-1.5"
              >
                Generate Invoice
              </Link>
            </div>
          </div>

          {/* Customer Module Navigation Tabs */}
          <div className="mt-6 border-b border-outline-variant">
            <nav className="flex gap-8 -mb-px overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-3 font-label-md text-[14px] transition-colors whitespace-nowrap border-b-2 font-bold ${
                  activeTab === 'overview'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-secondary hover:text-on-surface'
                }`}
              >
                Overview & Billing
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`pb-3 font-label-md text-[14px] transition-colors whitespace-nowrap border-b-2 font-bold ${
                  activeTab === 'documents'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-secondary hover:text-on-surface'
                }`}
              >
                Documents & Client Files
              </button>
              <button
                onClick={() => setActiveTab('portal')}
                className={`pb-3 font-label-md text-[14px] transition-colors whitespace-nowrap border-b-2 font-bold ${
                  activeTab === 'portal'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-secondary hover:text-on-surface'
                }`}
              >
                Portal Settings & Client Workspace
              </button>
            </nav>
          </div>
        </section>

        {activeTab === 'portal' ? (
          <CustomerPortalTab
            customerId={customer.id}
            customerName={customer.name}
            customerCompany={customer.company}
          />
        ) : activeTab === 'documents' ? (
          <CustomerDocumentsTab
            customerId={customer.id}
            customerName={customer.name}
          />
        ) : (
          <>
            {/* Stats Overview Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-lg">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm">
            <p className="font-label-uppercase text-secondary mb-1">Outstanding Balance</p>
            <div className="flex items-end justify-between">
              <h3 className="font-page-title text-[28px] text-on-surface">
                ₹{outstandingBalance.toLocaleString('en-IN')}
              </h3>
              {outstandingBalance > 0 && (
                <span className="bg-error-container text-on-error-container px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1">
                  <AlertTriangle size={12} /> Balance Overdue
                </span>
              )}
            </div>
          </div>
          <div className="bg-primary-container/5 border border-dashed border-primary/30 rounded-xl p-md flex items-center justify-between">
            <div className="flex items-center gap-md">
              <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center text-on-primary">
                <FileText size={20} />
              </div>
              <div>
                <p className="font-body-sm font-bold text-on-surface">Active Quotations</p>
                <p className="text-[11px] text-secondary">{customerQuotations.length} project estimates total</p>
              </div>
            </div>
            <Link
              to={`/quotations/new?customer=${customer.id}`}
              className="px-md py-1.5 bg-primary text-white rounded-lg font-body-sm font-semibold text-[12px] hover:bg-primary/95"
            >
              Add Quote
            </Link>
          </div>
        </section>

        {/* Main Dashboard Layout: Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
          {/* Left Column: Timeline & Tracker */}
          <div className="lg:col-span-8 space-y-lg">
            
            {/* Activity Timeline */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
              <div className="flex items-center justify-between mb-lg">
                <h3 className="font-section-heading text-[20px] text-on-surface">Billing & Quotation Timeline</h3>
              </div>
              
              {timelineEvents.length === 0 ? (
                <div className="text-center py-8 text-secondary font-body-sm">
                  No billing history or quotations generated for this account yet.
                </div>
              ) : (
                <div className="relative space-y-8 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-outline-variant">
                  {timelineEvents.map((ev, index) => {
                    const IconComponent = ev.icon;
                    return (
                      <div key={index} className="relative pl-12">
                        <div className={`absolute left-0 top-0 w-10 h-10 rounded-full border-4 border-surface flex items-center justify-center z-10 ${ev.colorClass}`}>
                          <IconComponent size={16} />
                        </div>
                        <div className="bg-surface-container-low rounded-lg p-md flex justify-between items-center">
                          <div>
                            <h4 className="font-body-md font-bold text-on-surface">{ev.title}</h4>
                            <p className="text-body-sm text-on-surface-variant">{ev.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-data-mono text-body-sm font-bold">{ev.date}</p>
                            <p className="text-[11px] text-secondary">{ev.time}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Follow-up & Event Tracker */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
              <div className="flex items-center justify-between mb-lg">
                <h3 className="font-section-heading text-[20px] text-on-surface">Follow-up & Event Tracker</h3>
                <button
                  onClick={() => setIsFollowupOpen(true)}
                  className="text-primary font-body-sm font-semibold flex items-center gap-1 hover:underline"
                >
                  <PlusCircle size={16} /> Log New Event
                </button>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="border-b border-outline-variant">
                    <tr className="text-secondary font-label-uppercase text-[11px] uppercase tracking-wider font-bold">
                      <th className="py-2 px-2">Event</th>
                      <th className="py-2 px-2">Date</th>
                      <th className="py-2 px-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/60">
                    {(!customer.followupsList || customer.followupsList.length === 0) ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-secondary text-body-sm">
                          No follow-up events logged yet.
                        </td>
                      </tr>
                    ) : (
                      customer.followupsList.map((f: any) => (
                        <tr key={f.id} className="hover:bg-surface-container-low transition-colors">
                          <td className="py-3 px-2 font-body-sm font-bold text-on-surface">{f.event}</td>
                          <td className="py-3 px-2 font-data-mono text-[12px]">{f.date}</td>
                          <td className="py-3 px-2 text-body-sm text-on-surface-variant">{f.notes}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Right Column: Notes & Contact details */}
          <div className="lg:col-span-4 space-y-lg">
            
            {/* Internal Notes */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm h-fit">
              <h3 className="font-section-heading text-[18px] text-on-surface mb-md">Internal Account Notes</h3>
              <div className="space-y-md">
                <div className="space-y-3">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-md text-body-sm focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none"
                    placeholder="Add a team note..."
                    rows={4}
                  />
                  <div>
                    <label className="font-label-uppercase text-secondary text-[11px] mb-1 block">Your Name</label>
                    <input
                      type="text"
                      value={noteCreator}
                      onChange={(e) => setNoteCreator(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-1.5 text-body-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                      placeholder="e.g. Marcus Thorne"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddNote}
                  className="w-full py-2.5 bg-on-surface text-surface rounded-lg font-body-sm font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-1.5"
                >
                  <Save size={16} /> Save Note
                </button>
                
                <div className="pt-lg border-t border-outline-variant space-y-md custom-scrollbar overflow-y-auto max-h-[300px]">
                  {(!customer.notesList || customer.notesList.length === 0) ? (
                    <p className="text-secondary text-[12px] text-center">No internal team notes created yet.</p>
                  ) : (
                    customer.notesList.map((n: any) => (
                      <div key={n.id} className="space-y-1 border-b border-outline-variant pb-md last:border-b-0 last:pb-0">
                        <div className="flex justify-between items-center">
                          <span className="font-label-uppercase text-primary text-[11px]">Creator: {n.creator}</span>
                          <span className="text-[11px] text-secondary font-data-mono">{n.date}</span>
                        </div>
                        <p className="text-body-sm text-on-surface-variant leading-relaxed">{n.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            {/* Primary Contact details */}
            <section className="bg-primary-container text-on-primary-container rounded-xl p-lg shadow-md relative overflow-hidden">
              <h3 className="font-label-uppercase text-on-primary-container/70 mb-md tracking-widest">Primary Contact</h3>
              <div className="flex items-center gap-md mb-lg relative z-10">
                <div className="w-12 h-12 rounded-full bg-on-primary-container/10 border-2 border-on-primary-container/20 flex items-center justify-center text-white text-lg font-bold">
                  {customer.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-section-heading text-[18px] font-bold">{customer.name}</h4>
                  <p className="text-body-sm opacity-90">{customer.company || 'Private Client'}</p>
                </div>
              </div>
              <div className="space-y-3 relative z-10">
                {customer.email && (
                  <a className="flex items-center gap-md text-body-sm hover:underline" href={`mailto:${customer.email}`}>
                    <Mail size={16} /> {customer.email}
                  </a>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-md text-body-sm">
                    <Phone size={16} /> {customer.phone}
                  </div>
                )}
                {customer.gstNumber && (
                  <div className="text-[12px] opacity-80 pt-2 border-t border-on-primary-container/10">
                    <span className="font-semibold block uppercase text-[10px] tracking-wider">GSTIN</span>
                    {customer.gstNumber}
                  </div>
                )}
                {customer.panNumber && (
                  <div className="text-[12px] opacity-80">
                    <span className="font-semibold block uppercase text-[10px] tracking-wider">PAN</span>
                    {customer.panNumber}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
        </>
      )}

      </div>

      {/* Edit Customer Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Customer Details"
        size="xl"
      >
        <form onSubmit={handleSaveEdit} className="space-y-6 max-h-[75vh] overflow-y-auto px-1 custom-scrollbar">
          <div className="bg-surface-container-low/20 border border-outline-variant/60 rounded-xl p-4 space-y-4">
            <h4 className="text-[12px] font-bold uppercase tracking-wider text-primary">Customer Profile</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary">
                  Contact Person Name <span className="text-error font-bold">*</span>
                </label>
                <input
                  className="w-full bg-white border border-outline-variant rounded-xl py-2.5 px-4 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none h-11"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary">
                  Company Name
                </label>
                <input
                  className="w-full bg-white border border-outline-variant rounded-xl py-2.5 px-4 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none h-11"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary">
                  Email Address
                </label>
                <input
                  className="w-full bg-white border border-outline-variant rounded-xl py-2.5 px-4 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none h-11"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary">
                  Phone Number
                </label>
                <input
                  className="w-full bg-white border border-outline-variant rounded-xl py-2.5 px-4 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none h-11"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary">
                  Status
                </label>
                <select
                  className="w-full bg-white border border-outline-variant rounded-xl py-2.5 px-4 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none h-11"
                  value={statusVal}
                  onChange={(e) => setStatusVal(e.target.value as any)}
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="discarded">Discarded</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary">
                  Department
                </label>
                <select
                  className="w-full bg-white border border-outline-variant rounded-xl py-2.5 px-4 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none h-11"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                >
                  <option value="">Select Department...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low/20 border border-outline-variant/60 rounded-xl p-4 space-y-4">
            <h4 className="text-[12px] font-bold uppercase tracking-wider text-primary">Taxation Identifiers</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary">
                  GSTIN
                </label>
                <input
                  className="w-full bg-white border border-outline-variant rounded-xl py-2.5 px-4 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none h-11"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  maxLength={15}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary">
                  PAN
                </label>
                <input
                  className="w-full bg-white border border-outline-variant rounded-xl py-2.5 px-4 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none h-11"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value)}
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low/20 border border-outline-variant/60 rounded-xl p-4 space-y-4">
            <h4 className="text-[12px] font-bold uppercase tracking-wider text-primary">Billing Address</h4>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary">
                  Street Line
                </label>
                <input
                  className="w-full bg-white border border-outline-variant rounded-xl py-2.5 px-4 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none h-11"
                  value={billingStreet}
                  onChange={(e) => setBillingStreet(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary">
                    City
                  </label>
                  <input
                    className="w-full bg-white border border-outline-variant rounded-xl py-2.5 px-4 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none h-11"
                    value={billingCity}
                    onChange={(e) => setBillingCity(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary">
                    State
                  </label>
                  <input
                    className="w-full bg-white border border-outline-variant rounded-xl py-2.5 px-4 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none h-11"
                    value={billingState}
                    onChange={(e) => setBillingState(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary">
                    Zip/PIN Code
                  </label>
                  <input
                    className="w-full bg-white border border-outline-variant rounded-xl py-2.5 px-4 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none h-11"
                    value={billingZip}
                    onChange={(e) => setBillingZip(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary">
              Notes / Remarks
            </label>
            <textarea
              className="w-full rounded-xl border border-outline-variant bg-white px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-outline-variant pt-4 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-lg py-2 border border-outline-variant rounded-xl font-bold hover:bg-surface-container-low transition-all h-11 text-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-lg py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary/95 transition-all shadow-md active:scale-95 h-11 flex items-center justify-center gap-2"
            >
              {updateMutation.isPending && (
                <Loader2 size={16} className="animate-spin" />
              )}
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Log Follow-up Event Modal */}
      <Modal
        isOpen={isFollowupOpen}
        onClose={() => setIsFollowupOpen(false)}
        title="Log Follow-up Event"
        size="md"
      >
        <form onSubmit={handleAddFollowup} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary">
              Event Description <span className="text-error font-bold">*</span>
            </label>
            <input
              className="w-full bg-white border border-outline-variant rounded-xl py-2 px-4 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none h-11"
              placeholder="e.g. Technical Feasibility Call"
              value={followupEvent}
              onChange={(e) => setFollowupEvent(e.target.value)}
              required
            />
          </div>



          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary">
                Event Notes
              </label>
              <div className="flex items-center gap-1">
                {/* Mic button */}
                <button
                  type="button"
                  onClick={handleMicClick}
                  title={isRecording ? 'Stop recording' : 'Record voice note'}
                  className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-all ${
                    isRecording
                      ? 'bg-red-500 border-red-500 text-white animate-pulse'
                      : 'border-outline-variant text-secondary hover:text-primary hover:border-primary'
                  }`}
                >
                  <Mic size={13} />
                </button>
                {/* Enhance with AI button */}
                <button
                  type="button"
                  onClick={handleEnhanceNotes}
                  disabled={isEnhancing}
                  title="Enhance notes with AI"
                  className="flex items-center gap-1 px-2 h-7 rounded-lg border border-outline-variant text-secondary hover:text-primary hover:border-primary transition-all text-[10px] font-bold disabled:opacity-50"
                >
                  {isEnhancing ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <Sparkles size={11} />
                  )}
                  <span>AI</span>
                </button>
              </div>
            </div>
            <textarea
              className="w-full rounded-xl border border-outline-variant bg-white px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
              placeholder="Provide a brief summary of the event..."
              rows={3}
              value={followupNotes}
              onChange={(e) => setFollowupNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-outline-variant pt-4">
            <button
              type="button"
              onClick={() => setIsFollowupOpen(false)}
              className="px-lg py-2 border border-outline-variant rounded-xl font-bold hover:bg-surface-container-low transition-all h-11 text-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-lg py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary/95 transition-all shadow-md active:scale-95 h-11 flex items-center justify-center gap-2"
            >
              {updateMutation.isPending && (
                <Loader2 size={16} className="animate-spin" />
              )}
              Log Event
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
