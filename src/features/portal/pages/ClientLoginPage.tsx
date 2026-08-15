import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/shared/lib/axios';
import { ShieldCheck, Key, Mail, Lock, Sparkles, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ClientLoginPage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'activate'>('login');
  const [email, setEmail] = useState('');
  const [clientCode, setClientCode] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { data } = await api.post('/v1/portal/auth/login', {
        email: email.trim(),
        password,
        clientCode: clientCode ? clientCode.trim() : undefined,
      });

      localStorage.setItem('clientToken', data.token);
      localStorage.setItem('clientInfo', JSON.stringify(data.data));
      toast.success(`Welcome back, ${data.data.firstName || data.data.customerName || 'Client'}!`);
      navigate('/portal/workspace');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { data } = await api.post('/v1/portal/auth/activate', {
        email: email.trim(),
        clientCode: clientCode.trim(),
        password,
        firstName,
        lastName,
      });

      localStorage.setItem('clientToken', data.token);
      localStorage.setItem('clientInfo', JSON.stringify(data.data));
      toast.success('Account activated successfully! Redirecting to workspace...');
      navigate('/portal/workspace');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || 'Activation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 min-h-screen w-screen bg-[#FAF8FF] overflow-y-auto flex flex-col justify-center items-center p-4 sm:p-6 z-50 font-sans">
      <div className="w-full max-w-[480px] bg-white border border-[#E1E2ED] rounded-2xl p-6 sm:p-8 shadow-xl space-y-6 shrink-0 my-auto">
        
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-[#2563EB] rounded-2xl flex items-center justify-center text-white mx-auto shadow-md shrink-0">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#191B23] tracking-tight">Client Workspace Portal</h1>
            <p className="text-xs sm:text-sm text-[#434655] mt-1 leading-relaxed">
              Secure digital repository for quotations, invoices, contracts, and project files.
            </p>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex bg-[#F3F3FE] p-1 rounded-xl border border-[#E1E2ED]">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all text-center ${
              mode === 'login'
                ? 'bg-white text-[#2563EB] shadow-sm font-bold'
                : 'text-[#737686] hover:text-[#191B23]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('activate')}
            className={`flex-1 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all text-center ${
              mode === 'activate'
                ? 'bg-white text-[#2563EB] shadow-sm font-bold'
                : 'text-[#737686] hover:text-[#191B23]'
            }`}
          >
            Account Activation
          </button>
        </div>

        {mode === 'login' ? (
          /* Login Form */
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[#191B23] uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail size={18} className="absolute left-3.5 text-[#737686] pointer-events-none shrink-0" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@company.com"
                  className="w-full h-11 pl-10 pr-4 bg-[#F3F3FE] border border-[#E1E2ED] rounded-xl text-sm text-[#191B23] focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#191B23] uppercase tracking-wider mb-1.5">
                Unique Client Code (Optional / Verification)
              </label>
              <div className="relative flex items-center">
                <Key size={18} className="absolute left-3.5 text-[#737686] pointer-events-none shrink-0" />
                <input
                  type="text"
                  value={clientCode}
                  onChange={(e) => setClientCode(e.target.value)}
                  placeholder="e.g. CLI-8K2XFQ91"
                  className="w-full h-11 pl-10 pr-4 bg-[#F3F3FE] border border-[#E1E2ED] rounded-xl text-sm text-[#191B23] focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all outline-none font-mono uppercase tracking-wider"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#191B23] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock size={18} className="absolute left-3.5 text-[#737686] pointer-events-none shrink-0" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-4 bg-[#F3F3FE] border border-[#E1E2ED] rounded-xl text-sm text-[#191B23] focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#2563EB] text-white rounded-xl font-semibold text-sm hover:bg-[#1D4ED8] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <>Sign In to Workspace <ArrowRight size={16} /></>}
            </button>
          </form>
        ) : (
          /* First-time Activation Form */
          <form onSubmit={handleActivate} className="space-y-4">
            <div className="p-3 bg-[#EEEOFF] border border-[#2563EB]/20 rounded-xl text-xs text-[#2563EB] flex items-center gap-2.5">
              <Sparkles size={18} className="shrink-0" />
              <span className="leading-tight">Enter your assigned <b>Unique Client Code</b> to set up your password and activate your portal workspace.</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#191B23] uppercase tracking-wider mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  className="w-full h-10 px-3 bg-[#F3F3FE] border border-[#E1E2ED] rounded-xl text-sm text-[#191B23] focus:bg-white focus:border-[#2563EB] outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#191B23] uppercase tracking-wider mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  className="w-full h-10 px-3 bg-[#F3F3FE] border border-[#E1E2ED] rounded-xl text-sm text-[#191B23] focus:bg-white focus:border-[#2563EB] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#191B23] uppercase tracking-wider mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@company.com"
                className="w-full h-10 px-3 bg-[#F3F3FE] border border-[#E1E2ED] rounded-xl text-sm text-[#191B23] focus:bg-white focus:border-[#2563EB] outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#191B23] uppercase tracking-wider mb-1">Unique Client Code</label>
              <input
                type="text"
                required
                value={clientCode}
                onChange={(e) => setClientCode(e.target.value)}
                placeholder="CLI-8K2XFQ91"
                className="w-full h-10 px-3 bg-[#F3F3FE] border border-[#E1E2ED] rounded-xl text-sm text-[#191B23] font-mono uppercase tracking-wider focus:bg-white focus:border-[#2563EB] outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#191B23] uppercase tracking-wider mb-1">Set Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full h-10 px-3 bg-[#F3F3FE] border border-[#E1E2ED] rounded-xl text-sm text-[#191B23] focus:bg-white focus:border-[#2563EB] outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#2563EB] text-white rounded-xl font-semibold text-sm hover:bg-[#1D4ED8] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <>Activate Workspace Account <CheckCircle2 size={16} /></>}
            </button>
          </form>
        )}

        {/* Footer info */}
        <div className="text-center pt-2 text-xs text-[#737686]">
          Protected by Quotiq Enterprise Security & Wasabi Cloud Vault.
        </div>
      </div>
    </div>
  );
}
