import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ProductCard from '../components/ProductCard';
import ProductCardSkeleton from '../components/ProductCardSkeleton';
import type { Product } from '../types';

const CATEGORIES = ['All', 'Electronics', 'Fashion', 'Jewelry', 'Books'];

type ProductWithVendor = Product & { vendor?: { store_name?: string; phone?: string; full_name?: string } };

export default function Home() {
  const [products, setProducts] = useState<ProductWithVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState<'new' | 'low' | 'high'>('new');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, owner_id, title, price, category, image_url, description, specs, created_at,
          vendor:profiles!products_owner_id_fkey(store_name, phone, full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(60);

      if (error) {
        setProducts([]);
      } else {
        const rows = (data ?? []).map((r: any) => ({
          id: r.id,
          owner_id: r.owner_id,
          title: r.title,
          price: typeof r.price === 'number' ? r.price : Number(r.price ?? 0),
          category: r.category,
          image_url: r.image_url,
          description: r.description,
          specs: r.specs && typeof r.specs === 'object' ? r.specs : {},
          created_at: r.created_at,
          vendor: Array.isArray(r.vendor) ? r.vendor[0] : r.vendor,
        }));
        setProducts(rows);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = products;
    if (category !== 'All') list = list.filter((p) => (p.category || 'Other') === category);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.title || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q)
      );
    }
    if (sort === 'low') list = [...list].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    if (sort === 'high') list = [...list].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    return list;
  }, [products, category, query, sort]);

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-slate-950 px-5 py-7 sm:px-8 sm:py-10">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-emerald-600/10 blur-3xl" />
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Buy & sell on <span className="text-emerald-400">campus</span>
          </h1>
          <p className="mt-1.5 text-sm text-slate-300 max-w-md">
            Electronics, fashion, books and more from student vendors near you. Chat instantly on WhatsApp.
          </p>
        </div>
      </section>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald-400 focus:outline-none text-sm transition"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="px-3 py-2.5 rounded-xl bg-white ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald-400 focus:outline-none text-sm"
          >
            <option value="new">Newest</option>
            <option value="low">Price: Low → High</option>
            <option value="high">Price: High → Low</option>
          </select>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={
              'shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition ' +
              (category === c
                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-emerald-300')
            }
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 py-16 text-center">
          <p className="text-slate-500 text-sm">No products found. Try a different search or category.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-400">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} vendor={p.vendor} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
