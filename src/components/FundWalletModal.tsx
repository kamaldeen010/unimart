import { useEffect, useState } from 'react';
import { X, Loader2, CreditCard, AlertCircle, Wallet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatNaira, toNum } from '../lib/format';

const MIN_AMOUNT = 100;

declare global {
  interface Window { PaystackPop: any }
}

export default function FundWalletModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { profile } = useAuth();
  const { push } = useToast();
  const [amount, setAmount] = useState('');
  const [paying, setPaying] = useState(false);

  // Load Paystack inline script once
  useEffect(() => {
    if (document.getElementById('paystack-inline')) return;
    const s = document.createElement('script');
    s.src = 'https://js.paystack.co/v1/inline.js';
    s.id = 'paystack-inline';
    s.async = true;
    document.body.appendChild(s);
  }, []);

  const amountNum = toNum(amount.replace(/[^0-9.]/g, ''));
  const belowMin = amount.trim() !== '' && amountNum < MIN_AMOUNT;
  const canPay = amountNum >= MIN_AMOUNT && !paying;

  const pay = () => {
    if (paying) return; // double-click / network protection
    if (amountNum < MIN_AMOUNT) {
      push('error', `Minimum deposit is ${formatNaira(MIN_AMOUNT)}.`);
      return;
    }
    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string;
    if (!publicKey) {
      push('error', 'Paystack is not configured. Add VITE_PAYSTACK_PUBLIC_KEY to your env.');
      return;
    }
    if (!window.PaystackPop) {
      push('error', 'Payment SDK still loading. Please try again in a moment.');
      return;
    }

    setPaying(true);
    const ref = 'UM-' + Date.now() + '-' + Math.floor(Math.random() * 100000);

    try {
      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: profile?.email || 'vendor@unimart.app',
        amount: amountNum * 100, // kobo
        currency: 'NGN',
        ref,
        channels: ['card', 'bank_transfer', 'ussd'],
        callback: async () => {
          try {
            const { error } = await supabase.rpc('credit_wallet', {
              p_user: profile!.user_id,
              p_amount: amountNum,
              p_type: 'topup',
              p_status: 'success',
              p_ref: ref,
              p_receipt: '',
              p_note: 'Paystack',
            });
            if (error) throw error;
            push('success', `Wallet funded with ${formatNaira(amountNum)}!`);
            onSuccess();
          } catch (err: any) {
            push('error', err.message || 'Payment verification failed. Contact support.');
            setPaying(false);
          }
        },
        onClose: () => {
          push('info', 'Payment window closed.');
          setPaying(false);
        },
      });
      handler.openIframe();
    } catch (err: any) {
      push('error', 'Could not start payment. Please try again.');
      setPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-emerald-500" /> Fund wallet
          </h3>
          <button onClick={onClose} disabled={paying} className="text-slate-400 hover:text-slate-600 disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Amount (₦)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">₦</span>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Enter any amount"
                disabled={paying}
                className="w-full pl-8 pr-3 py-3 rounded-xl ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald-400 focus:outline-none text-lg font-semibold text-slate-900 transition"
              />
            </div>
            {belowMin && (
              <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> Minimum deposit is {formatNaira(MIN_AMOUNT)}.
              </p>
            )}
            <p className="mt-1.5 text-xs text-slate-400">Type any custom amount. Minimum {formatNaira(MIN_AMOUNT)}.</p>
          </div>

          {/* Quick amounts */}
          <div className="grid grid-cols-3 gap-2">
            {[500, 1000, 2000].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setAmount(String(q))}
                disabled={paying}
                className="py-2 rounded-lg ring-1 ring-slate-200 text-sm font-medium text-slate-600 hover:ring-emerald-300 hover:bg-emerald-50/30 transition disabled:opacity-50"
              >
                {formatNaira(q)}
              </button>
            ))}
          </div>

          <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3 text-xs text-slate-500 flex items-start gap-2">
            <CreditCard className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
            <span>Secure payment via Paystack. Supports cards, bank transfer, and USSD. Your wallet is credited instantly on success.</span>
          </div>

          <button
            onClick={pay}
            disabled={!canPay}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md shadow-emerald-500/20"
          >
            {paying ? <><Loader2 className="h-5 w-5 animate-spin" /> Processing payment…</> : <>Fund {amountNum > 0 ? formatNaira(amountNum) : 'wallet'}</>}
          </button>
          <p className="text-center text-xs text-slate-400">You can close this window after payment completes.</p>
        </div>
      </div>
    </div>
  );
}
