import { useCallback, useEffect, useState } from 'react';
import {
  Wallet, Plus, History, Package, Trash2, ArrowDownCircle, ArrowUpCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, POST_FEE } from '../lib/supabase';
import { formatNaira, formatNairaSigned, formatDate, toStr } from '../lib/format';
import type { Product, Transaction } from '../types';
import PostItemForm from '../components/PostItemForm';
import FundWalletModal from '../components/FundWalletModal';

type Tab = 'overview' | 'post' | 'history';

export default function VendorDashboard() {
  const { profile, refreshProfile } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showFund, setShowFund] = useState(false);

  const loadProducts = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('products')
      .select('id, owner_id, title, price, category, image_url, description, specs, created_at')
      .eq('owner_id', profile.user_id)
      .order('created_at', { ascending: false });
    setProducts((data ?? []) as Product[]);
  }, [profile]);

  const loadTxns = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, status, paystack_ref, receipt_url, admin_note, created_at')
      .eq('user_id', profile.user_id)
      .order('created_at', { ascending: false });
    setTxns((data ?? []) as Transaction[]);
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoadingData(true);
      await Promise.all([loadProducts(), loadTxns()]);
      setLoadingData(false);
    })();
  }, [profile, loadProducts, loadTxns]);

  const balance = typeof profile?.wallet_balance === 'number' ? profile.wallet_balance : Number(profile?.wallet_balance ?? 0);

  const deleteProduct = async (id: string) => {
    if (!confirm('Remove this listing? This cannot be undone.')) return;
    const { error } = await supabase.from('products').delete().eq('id', id).eq('owner_id', profile!.user_id);
    if (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    } else {
      loadProducts();
    }
  };

  return (
    <div className="space-y-5">
      {/* Wallet card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 to-slate-800 p-5 sm:p-6 shadow-lg">
        <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-10 -left-6 h-32 w-32 rounded-full bg-emerald-600/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" /> Wallet balance
            </p>
            <p className="mt-1 text-3xl sm:text-4xl font-bold text-white tracking-tight">{formatNaira(balance)}</p>
            <p className="mt-1 text-xs text-slate-400">Posting fee: {formatNaira(POST_FEE)} per item</p>
          </div>
          <button
            onClick={() => setShowFund(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition shadow-md shadow-emerald-500/20"
          >
            <Plus className="h-4 w-4" /> Fund wallet
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white ring-1 ring-slate-200">
        <TabBtn active={tab === 'overview'} onClick={() => setTab('overview')} icon={<Package className="h-4 w-4" />} label="My Listings" />
        <TabBtn active={tab === 'post'} onClick={() => setTab('post')} icon={<Plus className="h-4 w-4" />} label="Post Item" />
        <TabBtn active={tab === 'history'} onClick={() => setTab('history')} icon={<History className="h-4 w-4" />} label="History" />
      </div>

      {tab === 'overview' && (
        <Overview products={products} loading={loadingData} onDelete={deleteProduct} onPost={() => setTab('post')} />
      )}
      {tab === 'post' && (
        <PostItemForm
          balance={balance}
          onPosted={() => {
            refreshProfile();
            loadProducts();
            loadTxns();
            setTab('overview');
          }}
        />
      )}
      {tab === 'history' && <HistoryView txns={txns} loading={loadingData} />}

      {showFund && (
        <FundWalletModal
          onClose={() => setShowFund(false)}
          onSuccess={() => {
            refreshProfile();
            loadTxns();
            setShowFund(false);
          }}
        />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={
        'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ' +
        (active ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100')
      }
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/* ---------------- Overview ---------------- */

function Overview({ products, loading, onDelete, onPost }: { products: Product[]; loading: boolean; onDelete: (id: string) => void; onPost: () => void }) {
  if (loading) {
    return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-square rounded-2xl bg-white ring-1 ring-slate-200 animate-pulse" />)}</div>;
  }
  if (products.length === 0) {
    return (
      <div className="rounded-2xl bg-white ring-1 ring-slate-200 py-14 text-center">
        <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">You haven't posted any items yet.</p>
        <button onClick={onPost} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition">
          <Plus className="h-4 w-4" /> Post your first item
        </button>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {products.map((p) => (
        <div key={p.id} className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden group">
          <div className="aspect-square bg-slate-100 overflow-hidden">
            {p.image_url ? <img src={p.image_url} alt={toStr(p.title)} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Package className="h-8 w-8" /></div>}
          </div>
          <div className="p-3">
            <h3 className="text-sm font-semibold text-slate-800 line-clamp-2">{toStr(p.title)}</h3>
            <p className="text-emerald-600 font-bold mt-1">{formatNaira(p.price)}</p>
            <button onClick={() => onDelete(p.id)} className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs text-rose-600 hover:bg-rose-50 transition">
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Recent Transactions Ledger ---------------- */

function HistoryView({ txns, loading }: { txns: Transaction[]; loading: boolean }) {
  if (loading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-white ring-1 ring-slate-200 animate-pulse" />)}</div>;
  if (txns.length === 0) return <div className="rounded-2xl bg-white ring-1 ring-slate-200 py-14 text-center text-sm text-slate-500">No transactions yet. Fund your wallet to get started.</div>;
  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-700">Recent Transactions</h2>
      </div>
      <div className="divide-y divide-slate-100">
        {txns.map((t) => {
          const credit = (t.amount ?? 0) >= 0;
          const label = t.type === 'post_fee' ? 'Posting fee' : t.type === 'topup' ? 'Paystack funding' : 'Manual top-up';
          return (
            <div key={t.id} className="flex items-center gap-3 p-3.5">
              <div className={'h-9 w-9 rounded-full flex items-center justify-center shrink-0 ' + (credit ? 'bg-emerald-100' : 'bg-rose-100')}>
                {credit ? <ArrowDownCircle className="h-5 w-5 text-emerald-600" /> : <ArrowUpCircle className="h-5 w-5 text-rose-500" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 truncate">{label}</p>
                <p className="text-xs text-slate-400">{formatDate(t.created_at)} · <span className={credit ? 'text-emerald-600' : 'text-rose-500'}>{t.status}</span></p>
              </div>
              <span className={'text-sm font-bold ' + (credit ? 'text-emerald-600' : 'text-rose-500')}>
                {formatNairaSigned(t.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
