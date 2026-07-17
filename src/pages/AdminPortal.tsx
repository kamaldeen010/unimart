import { useCallback, useEffect, useState } from 'react';
import { Users, Wallet, Package, Clock, Check, X, Loader2, ImageIcon } from 'lucide-react';
import { supabase, TOPUP_AMOUNT } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { formatNaira, formatDate, toStr } from '../lib/format';
import type { Transaction, VendorWithProfile } from '../types';

export default function AdminPortal() {
  const { push } = useToast();
  const [vendors, setVendors] = useState<VendorWithProfile[]>([]);
  const [pending, setPending] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [v, p] = await Promise.all([
      supabase.from('profiles').select('user_id, email, full_name, store_name, phone, role, wallet_balance, created_at').order('created_at', { ascending: false }),
      supabase.from('transactions').select('id, user_id, type, amount, status, paystack_ref, receipt_url, admin_note, created_at').eq('status', 'pending').order('created_at', { ascending: false }),
    ]);
    setVendors((v.data ?? []) as VendorWithProfile[]);
    setPending((p.data ?? []) as Transaction[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalRevenue = vendors.reduce((sum, v) => sum + (Number(v.wallet_balance ?? 0)), 0);
  const activeVendors = vendors.filter((v) => v.role !== 'admin').length;

  const resolve = async (tx: Transaction, approve: boolean) => {
    setActioning(tx.id);
    try {
      if (approve) {
        const { error } = await supabase.rpc('credit_wallet', {
          p_user: tx.user_id,
          p_amount: TOPUP_AMOUNT,
          p_type: 'manual_topup',
          p_status: 'success',
          p_ref: '',
          p_receipt: tx.receipt_url || '',
          p_note: 'Approved by admin',
        });
        if (error) throw error;
        push('success', `Approved. Vendor credited ${formatNaira(TOPUP_AMOUNT)}.`);
      } else {
        const { error } = await supabase.from('transactions').update({ status: 'failed', admin_note: 'Declined by admin' }).eq('id', tx.id);
        if (error) throw error;
        push('info', 'Transfer declined.');
      }
      await load();
    } catch (err: any) {
      push('error', err.message || 'Action failed.');
    } finally {
      setActioning(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-slate-900">Admin Portal</h1>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric icon={<Users className="h-4 w-4" />} label="Active vendors" value={String(activeVendors)} tone="emerald" />
        <Metric icon={<Wallet className="h-4 w-4" />} label="Wallets total" value={formatNaira(totalRevenue)} tone="slate" />
        <Metric icon={<Package className="h-4 w-4" />} label="Listings" value="—" tone="sky" />
        <Metric icon={<Clock className="h-4 w-4" />} label="Pending approvals" value={String(pending.length)} tone="amber" />
      </div>

      {/* Pending approvals */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Manual transfer approvals</h2>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-white ring-1 ring-slate-200 animate-pulse" />)}</div>
        ) : pending.length === 0 ? (
          <div className="rounded-2xl bg-white ring-1 ring-slate-200 py-10 text-center text-sm text-slate-500">No pending transfers. All caught up.</div>
        ) : (
          <div className="space-y-2.5">
            {pending.map((tx) => (
              <div key={tx.id} className="rounded-xl bg-white ring-1 ring-slate-200 p-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
                <a href={tx.receipt_url || '#'} target="_blank" rel="noopener noreferrer" className="h-16 w-16 rounded-lg bg-slate-100 overflow-hidden shrink-0 ring-1 ring-slate-200">
                  {tx.receipt_url ? <img src={tx.receipt_url} alt="receipt" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon className="h-6 w-6" /></div>}
                </a>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{formatNaira(tx.amount)}</p>
                  <p className="text-xs text-slate-500 truncate">User: {tx.user_id}</p>
                  <p className="text-xs text-slate-400">{formatDate(tx.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => resolve(tx, true)} disabled={actioning === tx.id} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 disabled:opacity-60 transition">
                    {actioning === tx.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve
                  </button>
                  <button onClick={() => resolve(tx, false)} disabled={actioning === tx.id} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white ring-1 ring-rose-200 text-rose-600 text-sm font-semibold hover:bg-rose-50 disabled:opacity-60 transition">
                    <X className="h-4 w-4" /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Vendors */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Vendors</h2>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-white ring-1 ring-slate-200 animate-pulse" />)}</div>
        ) : vendors.length === 0 ? (
          <div className="rounded-2xl bg-white ring-1 ring-slate-200 py-10 text-center text-sm text-slate-500">No vendors yet.</div>
        ) : (
          <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-3.5 py-2.5 font-medium">Vendor</th>
                  <th className="text-left px-3.5 py-2.5 font-medium hidden sm:table-cell">Email</th>
                  <th className="text-left px-3.5 py-2.5 font-medium">Phone</th>
                  <th className="text-right px-3.5 py-2.5 font-medium">Wallet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendors.map((v) => (
                  <tr key={v.user_id} className="hover:bg-slate-50/50">
                    <td className="px-3.5 py-2.5">
                      <p className="font-medium text-slate-800">{toStr(v.store_name) || toStr(v.full_name) || '—'}</p>
                      <p className="text-xs text-slate-400 sm:hidden">{toStr(v.email)}</p>
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-600 hidden sm:table-cell">{toStr(v.email)}</td>
                    <td className="px-3.5 py-2.5 text-slate-600">{toStr(v.phone) || '—'}</td>
                    <td className="px-3.5 py-2.5 text-right font-bold text-emerald-600">{formatNaira(v.wallet_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'emerald' | 'slate' | 'sky' | 'amber' }) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700',
    slate: 'bg-slate-100 text-slate-700',
    sky: 'bg-sky-100 text-sky-700',
    amber: 'bg-amber-100 text-amber-700',
  };
  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-4">
      <div className={'inline-flex h-8 w-8 rounded-lg items-center justify-center ' + tones[tone]}>{icon}</div>
      <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
