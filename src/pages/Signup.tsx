import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Mail, Lock, User, Store, Phone, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Signup() {
  const { signUp } = useAuth();
  const { push } = useToast();
  const nav = useNavigate();

  const [form, setForm] = useState({ fullName: '', storeName: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signUp(form.email.trim(), form.password, form.fullName.trim(), form.storeName.trim(), form.phone.trim());
    setLoading(false);
    if (error) {
      push('error', error);
    } else {
      push('success', 'Account created! Welcome to CampusMall.');
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
          <h1 className="text-2xl font-bold text-slate-900">Become a vendor</h1>
          <p className="text-sm text-slate-500 mt-1">Start selling to students on your campus</p>
        </div>

        <form onSubmit={submit} className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 space-y-3.5 shadow-sm">
          <Field icon={<User className="h-4 w-4" />} label="Full name">
            <input required value={form.fullName} onChange={set('fullName')} placeholder="Ada Okonkwo" className="inp pl-9" />
          </Field>
          <Field icon={<Store className="h-4 w-4" />} label="Store name">
            <input required value={form.storeName} onChange={set('storeName')} placeholder="Ada's Tech Hub" className="inp pl-9" />
          </Field>
          <Field icon={<Mail className="h-4 w-4" />} label="Email">
            <input type="email" required value={form.email} onChange={set('email')} placeholder="you@campus.edu" className="inp pl-9" />
          </Field>
          <Field icon={<Phone className="h-4 w-4" />} label="WhatsApp phone">
            <input required value={form.phone} onChange={set('phone')} placeholder="08012345678" className="inp pl-9" />
          </Field>
          <Field icon={<Lock className="h-4 w-4" />} label="Password">
            <input type="password" required minLength={6} value={form.password} onChange={set('password')} placeholder="At least 6 characters" className="inp pl-9" />
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 disabled:opacity-60 transition shadow-md shadow-emerald-500/20"
          >
            {loading ? 'Creating account…' : <>Create account <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-600 font-semibold hover:underline">Sign in</Link>
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
