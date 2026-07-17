import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, Mail, ArrowRight, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const OTP_LEN = 6;
const RESEND_SECONDS = 59;

export default function Login() {
  const { sendOtp, verifyOtp } = useAuth();
  const { push } = useToast();
  const nav = useNavigate();
  const loc = useLocation() as any;
  const from = loc.state?.from || '/dashboard';

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState<string[]>(Array(OTP_LEN).fill(''));
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend countdown
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      push('error', 'Please enter a valid email address.');
      return;
    }
    setSending(true);
    const { error } = await sendOtp(email.trim());
    setSending(false);
    if (error) {
      push('error', error);
    } else {
      setStep(2);
      setResendIn(RESEND_SECONDS);
      push('success', 'OTP sent! Check your email for the 6-digit code.');
      setTimeout(() => inputs.current[0]?.focus(), 100);
    }
  };

  const resend = async () => {
    if (resendIn > 0) return;
    setSending(true);
    const { error } = await sendOtp(email.trim());
    setSending(false);
    if (error) push('error', error);
    else {
      setResendIn(RESEND_SECONDS);
      push('info', 'A new OTP has been sent.');
    }
  };

  const onDigitChange = (i: number, val: string) => {
    const clean = val.replace(/[^0-9]/g, '');
    if (!clean) {
      const next = [...digits];
      next[i] = '';
      setDigits(next);
      return;
    }
    // Handle paste of multiple digits
    if (clean.length > 1) {
      const arr = clean.slice(0, OTP_LEN).split('');
      const next = [...digits];
      for (let j = 0; j < arr.length && i + j < OTP_LEN; j++) next[i + j] = arr[j];
      setDigits(next);
      const focusIdx = Math.min(i + arr.length, OTP_LEN - 1);
      inputs.current[focusIdx]?.focus();
      if (next.every((d) => d) && next.join('').length === OTP_LEN) submit(next.join(''));
      return;
    }
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (i < OTP_LEN - 1) inputs.current[i + 1]?.focus();
    if (next.every((d) => d) && next.join('').length === OTP_LEN) submit(next.join(''));
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const submit = async (code?: string) => {
    const token = code ?? digits.join('');
    if (token.length !== OTP_LEN) {
      push('error', 'Please enter all 6 digits.');
      return;
    }
    setVerifying(true);
    const { error, isNew } = await verifyOtp(email.trim(), token);
    setVerifying(false);
    if (error) {
      push('error', error);
      setDigits(Array(OTP_LEN).fill(''));
      inputs.current[0]?.focus();
    } else {
      push('success', 'Login successful! Welcome to Unimart.');
      nav(isNew ? '/complete-profile' : from, { replace: true });
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 items-center justify-center shadow-lg shadow-emerald-500/20 mb-3">
            <ShoppingBag className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {step === 1 ? 'Vendor sign in' : 'Enter your code'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {step === 1
              ? 'Sign in to your Unimart vendor account'
              : `We sent a 6-digit code to ${email}`}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={sendCode} className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 space-y-4 shadow-sm">
            <label className="block">
              <span className="block text-xs font-medium text-slate-500 mb-1.5">University email</span>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@campus.edu"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald-400 focus:outline-none text-sm transition"
                />
              </div>
            </label>
            <button
              type="submit"
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 disabled:opacity-60 transition shadow-md shadow-emerald-500/20"
            >
              {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending code…</> : <>Send login code <ArrowRight className="h-4 w-4" /></>}
            </button>
            <p className="text-center text-xs text-slate-400">
              New to Unimart? Enter your email and we'll create your vendor account automatically.
            </p>
          </form>
        ) : (
          <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 space-y-5 shadow-sm">
            <div className="flex justify-center gap-2 sm:gap-2.5">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { inputs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => onDigitChange(i, e.target.value)}
                  onKeyDown={(e) => onKey(i, e)}
                  disabled={verifying}
                  className="h-14 w-11 sm:h-16 sm:w-12 rounded-xl ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald-400 focus:outline-none text-center text-xl font-bold text-slate-900 transition"
                />
              ))}
            </div>

            <button
              onClick={() => submit()}
              disabled={verifying}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 disabled:opacity-60 transition shadow-md shadow-emerald-500/20"
            >
              {verifying ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</> : <>Verify & continue <ArrowRight className="h-4 w-4" /></>}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button onClick={() => setStep(1)} className="flex items-center gap-1 text-slate-500 hover:text-slate-700">
                <ArrowLeft className="h-4 w-4" /> Change email
              </button>
              {resendIn > 0 ? (
                <span className="text-slate-400 text-xs">Resend OTP in {resendIn}s</span>
              ) : (
                <button onClick={resend} disabled={sending} className="flex items-center gap-1 text-emerald-600 font-medium hover:underline disabled:opacity-50">
                  <RefreshCw className="h-3.5 w-3.5" /> Resend code
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
