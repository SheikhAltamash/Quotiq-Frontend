import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/shared/lib/axios';
import Button from '@/shared/components/ui/Button';
import {
  Save,
  ArrowLeft,
  Loader2,
  User,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  FileText,
  DollarSign
} from 'lucide-react';
import { toast } from 'react-hot-toast';

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
}

const compileTemplate = (inputs: {
  candidateName: string;
  jobTitle: string;
  jobType: string;
  workplaceType: string;
  salaryPerMonth: number;
  joiningDate: string;
  department: string;
  orgName?: string;
}) => {
  const companyName = inputs.orgName || 'our organization';
  const dateStr = inputs.joiningDate
    ? new Date(inputs.joiningDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '[Joining Date]';
  const salaryStr = Number(inputs.salaryPerMonth || 0).toLocaleString('en-IN');
  const typeLabel = inputs.jobType === 'internship' ? 'Internship' : inputs.jobType === 'freelance' ? 'Freelance contract' : 'Full-Time position';
  const workplaceLabel = inputs.workplaceType === 'remote' ? 'Remote' : inputs.workplaceType === 'hybrid' ? 'Hybrid' : 'Onsite';

  if (inputs.department === 'technical') {
    return `Dear ${inputs.candidateName || '[Candidate Name]'},

We are thrilled to offer you the position of ${inputs.jobTitle || '[Job Title]'} in the Technical Division at ${companyName}.

This offer is for a ${typeLabel} with a ${workplaceLabel} working arrangement. We are confident that your technical skills, problem-solving abilities, and expertise will be of immense value to our engineering department.

Key terms of your engagement:
1. Position & Scope: You will be joining as a ${inputs.jobTitle || '[Job Title]'}, reporting to the Technical Lead / Engineering Manager. Your core duties will include system architecture, feature implementation, code quality, and collaborative development.
2. Compensation: You will receive a monthly remuneration of ₹${salaryStr} (INR), subject to applicable statutory deductions.
3. Commencement: Your scheduled joining date will be ${dateStr}.
4. Workspace: Your assignment is designated as ${workplaceLabel}.

Please review the details and confirm your acceptance. We look forward to welcoming you to the team.

Sincerely,
Authorized Signatory
${companyName}`;
  } else {
    return `Dear ${inputs.candidateName || '[Candidate Name]'},

We are pleased to extend our official offer for the position of ${inputs.jobTitle || '[Job Title]'} at ${companyName}.

This offer outlines the terms of your ${typeLabel} with a ${workplaceLabel} mode of engagement. We believe that your creativity, communication skills, and initiative will contribute significantly to our goals.

Key terms of your engagement:
1. Position & Scope: You will be joining as a ${inputs.jobTitle || '[Job Title]'}, contributing to campaign planning, content strategy, user engagement, and project execution.
2. Compensation: You will receive a monthly compensation of ₹${salaryStr} (INR), payable in regular monthly cycles.
3. Commencement: Your scheduled joining date will be ${dateStr}.
4. Workspace: Your role is designated as ${workplaceLabel}.

Please review this letter and confirm your acceptance. We are excited about your future contributions to our team.

Sincerely,
Authorized Signatory
${companyName}`;
  }
};

export default function OfferBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  // Form states
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [candidateAddress, setCandidateAddress] = useState('');
  
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState<'technical' | 'social_media'>('technical');
  const [jobType, setJobType] = useState<'full_time' | 'internship' | 'freelance'>('full_time');
  const [workplaceType, setWorkplaceType] = useState<'remote' | 'onsite' | 'hybrid'>('onsite');
  const [salaryPerMonth, setSalaryPerMonth] = useState('0');
  const [joiningDate, setJoiningDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0] || '';
  });
  const [status, setStatus] = useState<'draft' | 'sent' | 'accepted' | 'declined'>('draft');
  const [notes, setNotes] = useState('');
  const [letterContent, setLetterContent] = useState('');
  
  // Keep track of manual content editing
  const [isEditedManually, setIsEditedManually] = useState(false);

  // Fetch Org Details
  const { data: org } = useQuery<Organization>({
    queryKey: ['organization'],
    queryFn: async () => {
      const { data } = await api.get('/v1/organization');
      return data.data;
    },
  });

  // Fetch existing offer letter details if editing
  const { data: existingOffer, isLoading: isOfferLoading } = useQuery({
    queryKey: ['offers', id],
    queryFn: async () => {
      const { data } = await api.get(`/v1/offers/${id}`);
      return data.data;
    },
    enabled: isEdit,
  });

  // Populate data for edit mode
  useEffect(() => {
    if (existingOffer && isEdit) {
      setCandidateName(existingOffer.candidateName || '');
      setCandidateEmail(existingOffer.candidateEmail || '');
      setCandidatePhone(existingOffer.candidatePhone || '');
      setCandidateAddress(existingOffer.candidateAddress || '');
      setJobTitle(existingOffer.jobTitle || '');
      setDepartment(existingOffer.department || 'technical');
      setJobType(existingOffer.jobType || 'full_time');
      setWorkplaceType(existingOffer.workplaceType || 'onsite');
      setSalaryPerMonth(existingOffer.salaryPerMonth || '0');
      setJoiningDate(existingOffer.joiningDate ? existingOffer.joiningDate.split('T')[0] : '');
      setStatus(existingOffer.status || 'draft');
      setNotes(existingOffer.notes || '');
      setLetterContent(existingOffer.letterContent || '');
      setIsEditedManually(true); // Don't overwrite what was saved in DB
    }
  }, [existingOffer, isEdit]);

  // Compile template dynamically if not manually edited yet
  useEffect(() => {
    if (!isEditedManually) {
      const content = compileTemplate({
        candidateName,
        jobTitle,
        jobType,
        workplaceType,
        salaryPerMonth: Number(salaryPerMonth) || 0,
        joiningDate,
        department,
        orgName: org?.name,
      });
      setLetterContent(content);
    }
  }, [candidateName, jobTitle, jobType, workplaceType, salaryPerMonth, joiningDate, department, isEditedManually, org?.name]);

  // Mutation for creating/updating
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (isEdit) {
        const { data } = await api.put(`/v1/offers/${id}`, payload);
        return data.data;
      } else {
        const { data } = await api.post('/v1/offers', payload);
        return data.data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      toast.success(isEdit ? 'Offer letter updated successfully' : 'Offer letter drafted successfully');
      if (data?.id) {
        navigate(`/offers/${data.id}`);
      } else {
        navigate('/offers');
      }
    },
    onError: (err: any) => {
      const apiError = err.response?.data?.error;
      if (apiError?.details) {
        const errorMsg = Object.entries(apiError.details)
          .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
          .join(' | ');
        toast.error(`Validation Failed: ${errorMsg}`);
      } else {
        toast.error(apiError?.message || 'Failed to save offer letter');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName.trim()) {
      toast.error('Candidate name is required');
      return;
    }
    if (!candidateEmail.trim()) {
      toast.error('Candidate email is required');
      return;
    }
    if (!candidateAddress.trim()) {
      toast.error('Candidate address is required');
      return;
    }
    if (!jobTitle.trim()) {
      toast.error('Job Title is required');
      return;
    }
    if (!letterContent.trim()) {
      toast.error('Offer letter body text is required');
      return;
    }

    const payload = {
      candidateName,
      candidateEmail,
      candidatePhone: candidatePhone || null,
      candidateAddress,
      jobTitle,
      department,
      jobType,
      workplaceType,
      salaryPerMonth: Number(salaryPerMonth) || 0,
      joiningDate: new Date(joiningDate).toISOString(),
      status,
      notes: notes || null,
      letterContent,
    };

    saveMutation.mutate(payload);
  };

  if (isEdit && isOfferLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Back Button */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-xs">
          <button
            onClick={() => navigate('/offers')}
            className="text-secondary hover:text-primary flex items-center gap-1.5 text-body-sm font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} /> Back to Offer Letters
          </button>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Save size={14} />}
          onClick={handleSubmit}
          isLoading={saveMutation.isPending}
          className="h-10"
        >
          {isEdit ? 'Save Changes' : 'Draft Offer Letter'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Fields */}
        <div className="lg:col-span-5 space-y-6">
          {/* Candidate Details Card */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2 bg-primary/5 text-primary rounded-lg">
                <User size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-on-surface">Candidate Details</h3>
                <p className="text-[10px] text-on-surface-variant">Provide name, contact credentials, and residency address</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Candidate Name</label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  required
                  placeholder="e.g. John Doe"
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-on-surface"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <Mail size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={candidateEmail}
                      onChange={(e) => setCandidateEmail(e.target.value)}
                      required
                      placeholder="john.doe@email.com"
                      className="w-full h-10 pl-9 pr-3 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-on-surface"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                  <div className="relative">
                    <Phone size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      value={candidatePhone}
                      onChange={(e) => setCandidatePhone(e.target.value)}
                      placeholder="+91 99999 88888"
                      className="w-full h-10 pl-9 pr-3 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-on-surface"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Full Address</label>
                <div className="relative">
                  <MapPin size={12} className="absolute left-3 top-3 text-slate-400" />
                  <textarea
                    rows={2}
                    value={candidateAddress}
                    onChange={(e) => setCandidateAddress(e.target.value)}
                    required
                    placeholder="Candidate residential address details..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-on-surface resize-none"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Job Details Card */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2 bg-primary/5 text-primary rounded-lg">
                <Briefcase size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-on-surface">Position Parameters</h3>
                <p className="text-[10px] text-on-surface-variant">Define role title, department, workplace type, and compensation</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Job Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  required
                  placeholder="e.g. Associate React Developer"
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-on-surface"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as any)}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-on-surface cursor-pointer"
                  >
                    <option value="technical">Technical</option>
                    <option value="social_media">Social Media</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Role Type</label>
                  <select
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value as any)}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-on-surface cursor-pointer"
                  >
                    <option value="full_time">Full-Time</option>
                    <option value="internship">Internship</option>
                    <option value="freelance">Freelance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Workplace Mode</label>
                  <select
                    value={workplaceType}
                    onChange={(e) => setWorkplaceType(e.target.value as any)}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-on-surface cursor-pointer"
                  >
                    <option value="onsite">Onsite</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Joining Date</label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    required
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-on-surface cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Salary Per Month (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                    <input
                      type="number"
                      value={salaryPerMonth}
                      onChange={(e) => setSalaryPerMonth(e.target.value)}
                      required
                      placeholder="0.00"
                      className="w-full h-10 pl-7 pr-3 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-on-surface font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Offer Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-on-surface cursor-pointer"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="accepted">Accepted</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Dynamic Editor */}
        <div className="lg:col-span-7 space-y-6">
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 flex flex-col h-[600px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/5 text-primary rounded-lg">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-on-surface">Offer Letter Matter</h3>
                  <p className="text-[10px] text-on-surface-variant">Customize and review compiled offer document body text</p>
                </div>
              </div>
              {isEditedManually && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Revert all your custom edits and reset to default compiled template?')) {
                      setIsEditedManually(false);
                    }
                  }}
                  className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                >
                  Reset Template
                </button>
              )}
            </div>

            <div className="flex-1 min-h-0 relative">
              <textarea
                value={letterContent}
                onChange={(e) => {
                  setLetterContent(e.target.value);
                  setIsEditedManually(true);
                }}
                className="w-full h-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-slate-800 font-mono leading-relaxed resize-none overflow-y-auto"
                placeholder="Compiled letter body goes here..."
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
