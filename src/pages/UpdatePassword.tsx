import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, Loader2, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function UpdatePassword() {
  const { updatePassword, user, loading } = useAuth();
  const { push } = useToast();
  const nav = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Supabase exchanges the recovery token in the URL for a session on load.
  // Wait for auth to settle; if no session appears, prompt them to use the link from their email.
  const hasSession = !!user;

  useEffect(() => {
    if (!loading && !user) {
      // The recovery link may not have produced a session yet (e.g. opened in a different browser).
      push('info', 'Please open the recovery link from the same browser where you requested it, or request a new link.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      push('error', 'Please enter a new password.');
      return;
    }
    if (password.length < 6) {
      push('error', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      push('error', 'Passwords do not match.');
      return;
    }
    setSubmitting(true);
    const { error } = await updatePassword(password);
    setSubmitting(false);
    if (error) {
      push('error', error);
    } else {
      push('success', 'Password updated! Redirecting to your dashboard…');
      nav('/dashboard', { replace: true });
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 items-center justify-center shadow-lg shadow-emerald-500/20 mb-3">
            <ShoppingBag className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Set new password</h1>
          <p className="text-sm text-slate-500 mt-1">Choose a strong password for your vendor account</p>
        </div>

        <form onSubmit={submit} className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 space-y-4 shadow-sm">
          <Field icon={<Lock className="h-4 w-4" />} label="New password">
            <input
              type="password"
              required
              autoFocus
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald-400 focus:outline-none text-sm transition"
            />
          </Field>
          <Field icon={<Lock className="h-4 w-4" />} label="Confirm password">
            <input
              type="password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald-400 focus:outline-none text-sm transition"
            />
          </Field>

          {!hasSession && !loading && (
            <p className="text-xs text-amber-600 bg-amber-50 ring-1 ring-amber-200 rounded-lg p-2.5">
              We couldn't detect a valid reset session. Make sure you opened the link from the email we sent, in this browser.
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !hasSession}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed transition shadow-md shadow-emerald-500/20"
          >
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating…</> : <>Update password <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>
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
