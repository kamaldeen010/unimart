import { useRef, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ShoppingBag, Mail, Lock, ArrowRight, Loader2, KeyRound, ArrowLeft, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

type Mode = 'signin' | 'signup' | 'forgot';
type ForgotStep = 'request' | 'verify' | 'setPassword';

const OTP_LEN = 6;

export default function Login() {
  const { signIn, signUp, resetPassword, verifyRecoveryOtp, updatePassword } = useAuth();
  const { push } = useToast();
  const nav = useNavigate();
  const loc = useLocation() as any;
  const from = loc.state?.from || '/dashboard';

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot-password inline flow
  const [forgotStep, setForgotStep] = useState<ForgotStep>('request');
  const [digits, setDigits] = useState<string[]>(Array(OTP_LEN).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const otpInputs = useRef<(HTMLInputElement | null)[]>([]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Forgot-password flow: only the email is required — bypass password validation entirely.
    if (mode === 'forgot') {
      if (!email.trim()) {
        push('error', 'Please enter your email.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        push('error', 'Please enter a valid email address.');
        return;
      }
      setLoading(true);
      const { error } = await resetPassword(email.trim());
      setLoading(false);
      if (error) push('error', error);
      else {
        setForgotStep('verify');
        push('success', 'Reset code sent! Check your email for the 6-digit code.');
        setTimeout(() => otpInputs.current[0]?.focus(), 100);
      }
      return;
    }
    if (!email.trim() || !password.trim()) {
      push('error', 'Please fill in all fields.');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      push('error', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { error } = mode === 'signin'
      ? await signIn(email.trim(), password)
      : await signUp(email.trim(), password);
    setLoading(false);
    if (error) {
      push('error', error);
    } else {
      push('success', mode === 'signin' ? 'Welcome back to Unimart!' : 'Account created! Welcome to Unimart.');
      nav(from, { replace: true });
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
    if (clean.length > 1) {
      const arr = clean.slice(0, OTP_LEN).split('');
      const next = [...digits];
      for (let j = 0; j < arr.length && i + j < OTP_LEN; j++) next[i + j] = arr[j];
      setDigits(next);
      const focusIdx = Math.min(i + arr.length, OTP_LEN - 1);
      otpInputs.current[focusIdx]?.focus();
      return;
    }
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (i < OTP_LEN - 1) otpInputs.current[i + 1]?.focus();
  };

  const onDigitKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) otpInputs.current[i - 1]?.focus();
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = digits.join('');
    if (token.length !== OTP_LEN) {
      push('error', 'Please enter all 6 digits.');
      return;
    }
    setLoading(true);
    const { error } = await verifyRecoveryOtp(email.trim(), token);
    setLoading(false);
    if (error) {
      push('error', error);
      setDigits(Array(OTP_LEN).fill(''));
      otpInputs.current[0]?.focus();
    } else {
      setForgotStep('setPassword');
      push('success', 'Code verified! Set your new password.');
    }
  };

  const saveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      push('error', 'Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      push('error', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { error } = await updatePassword(newPassword);
    setLoading(false);
    if (error) {
      push('error', error);
    } else {
      push('success', 'Password updated! Taking you to your dashboard…');
      nav('/dashboard', { replace: true });
    }
  };

  const backToSignIn = () => {
    setMode('signin');
    setForgotStep('request');
    setDigits(Array(OTP_LEN).fill(''));
    setNewPassword('');
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 items-center justify-center shadow-lg shadow-emerald-500/20 mb-3">
            <ShoppingBag className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {mode === 'signin' && 'Vendor sign in'}
            {mode === 'signup' && 'Become a vendor'}
            {mode === 'forgot' && forgotStep === 'request' && 'Reset password'}
            {mode === 'forgot' && forgotStep === 'verify' && 'Verify reset code'}
            {mode === 'forgot' && forgotStep === 'setPassword' && 'Set new password'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {mode === 'signin' && 'Sign in to your Unimart vendor account'}
            {mode === 'signup' && 'Create your Unimart vendor account'}
            {mode === 'forgot' && forgotStep === 'request' && "Enter your email and we'll send a 6-digit reset code"}
            {mode === 'forgot' && forgotStep === 'verify' && `We sent a 6-digit code to ${email}`}
            {mode === 'forgot' && forgotStep === 'setPassword' && 'Choose a strong password for your account'}
          </p>
        </div>

        {/* ---------- Forgot: Verify code ---------- */}
        {mode === 'forgot' && forgotStep === 'verify' && (
          <form onSubmit={verifyCode} className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 space-y-5 shadow-sm">
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 px-3 py-2 text-sm text-emerald-700">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">Code sent to <strong>{email}</strong></span>
            </div>
            <div className="flex justify-center gap-2 sm:gap-2.5">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { otpInputs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => onDigitChange(i, e.target.value)}
                  onKeyDown={(e) => onDigitKey(i, e)}
                  disabled={loading}
                  className="h-14 w-11 sm:h-16 sm:w-12 rounded-xl ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald-400 focus:outline-none text-center text-xl font-bold text-slate-900 transition"
                />
              ))}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 disabled:opacity-60 transition shadow-md shadow-emerald-500/20"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</> : <>Verify code <ArrowRight className="h-4 w-4" /></>}
            </button>
            <button type="button" onClick={() => setForgotStep('request')} className="w-full flex items-center justify-center gap-1 text-sm text-slate-500 hover:text-slate-700">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          </form>
        )}

        {/* ---------- Forgot: Set new password ---------- */}
        {mode === 'forgot' && forgotStep === 'setPassword' && (
          <form onSubmit={saveNewPassword} className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 px-3 py-2 text-sm text-emerald-700">
              <ShieldCheck className="h-4 w-4 shrink-0" /> Identity verified — set your new password
            </div>
            <Field icon={<Lock className="h-4 w-4" />} label="New password">
              <input
                type="password"
                required
                autoFocus
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald-400 focus:outline-none text-sm transition"
              />
            </Field>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 disabled:opacity-60 transition shadow-md shadow-emerald-500/20"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <>Save & sign in <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
        )}

        {/* ---------- Sign in / Sign up / Forgot request ---------- */}
        {!(mode === 'forgot' && (forgotStep === 'verify' || forgotStep === 'setPassword')) && (
          <form onSubmit={submit} className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 space-y-4 shadow-sm">
            <Field icon={<Mail className="h-4 w-4" />} label="Email">
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@campus.edu"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald-400 focus:outline-none text-sm transition"
              />
            </Field>

            {mode !== 'forgot' && (
              <div>
                <Field icon={<Lock className="h-4 w-4" />} label="Password">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald-400 focus:outline-none text-sm transition"
                  />
                </Field>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setForgotStep('request'); setDigits(Array(OTP_LEN).fill('')); }}
                    className="mt-2 text-xs text-emerald-600 font-medium hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 disabled:opacity-60 transition shadow-md shadow-emerald-500/20"
            >
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Please wait…</>
                : <>
                  {mode === 'signin' && <>Sign in <ArrowRight className="h-4 w-4" /></>}
                  {mode === 'signup' && <>Create account <ArrowRight className="h-4 w-4" /></>}
                  {mode === 'forgot' && <>Send reset code <ArrowRight className="h-4 w-4" /></>}
                </>}
            </button>
          </form>
        )}

        <div className="text-center text-sm text-slate-500 mt-5 space-x-1">
          {mode === 'signin' && (
            <>
              <span>New to Unimart?</span>
              <button onClick={() => setMode('signup')} className="text-emerald-600 font-semibold hover:underline">
                Create an account
              </button>
            </>
          )}
          {mode === 'signup' && (
            <>
              <span>Already have an account?</span>
              <button onClick={() => setMode('signin')} className="text-emerald-600 font-semibold hover:underline">
                Sign in
              </button>
            </>
          )}
          {mode === 'forgot' && (
            <button onClick={backToSignIn} className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700">
              <KeyRound className="h-3.5 w-3.5" /> Back to sign in
            </button>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          <Link to="/" className="hover:text-slate-600">← Back to marketplace</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1.5">{label}</span>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
        {children}
      </div>
    </label>
  );
}
