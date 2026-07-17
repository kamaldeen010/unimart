import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, ImageIcon, ShieldCheck, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { buildWhatsAppLink, formatNaira, formatDate, toStr } from '../lib/format';
import type { Product } from '../types';

type Detail = Product & { vendor?: { store_name?: string; phone?: string; full_name?: string; email?: string } };

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      if (!id) {
        setError('Invalid product link.');
        setLoading(false);
        return;
      }
      const { data, error: e } = await supabase
        .from('products')
        .select(`
          id, owner_id, title, price, category, image_url, description, specs, created_at,
          vendor:profiles!products_owner_id_fkey(store_name, phone, full_name, email)
        `)
        .eq('id', id)
        .maybeSingle();

      if (e) {
        setError('Could not load this product. Please try again.');
        setLoading(false);
        return;
      }
      if (!data) {
        setError('This product no longer exists.');
        setLoading(false);
        return;
      }
      const r: any = data;
      setProduct({
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
      });
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-5 w-24 bg-slate-200 rounded" />
        <div className="grid md:grid-cols-2 gap-6">
          <div className="aspect-square bg-slate-200 rounded-2xl" />
          <div className="space-y-3">
            <div className="h-6 bg-slate-200 rounded w-3/4" />
            <div className="h-8 bg-slate-100 rounded w-1/3" />
            <div className="h-24 bg-slate-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="rounded-2xl bg-white ring-1 ring-slate-200 py-16 text-center max-w-md mx-auto">
        <p className="text-slate-600 text-sm">{error || 'Product not found.'}</p>
        <Link to="/" className="inline-flex mt-4 items-center gap-1.5 text-emerald-600 font-medium text-sm hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to marketplace
        </Link>
      </div>
    );
  }

  const { title = 'Untitled', price = 0, category = 'Other', image_url = '', description = '', specs = {}, created_at = '' } = product;
  const vendor = product.vendor || {};
  const vendorName = vendor.store_name || vendor.full_name || 'Vendor';
  const vendorPhone = vendor.phone || '';
  const waLink = buildWhatsAppLink(vendorPhone, vendorName, title, price);

  return (
    <div className="space-y-5">
      <Link to="/" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-medium transition">
        <ArrowLeft className="h-4 w-4" /> Marketplace
      </Link>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Image */}
        <div className="rounded-2xl overflow-hidden bg-slate-100 ring-1 ring-slate-200 aspect-square">
          {image_url ? (
            <img src={image_url} alt={toStr(title)} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
              <ImageIcon className="h-16 w-16" />
              <span className="text-xs mt-2">No image</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col gap-4">
          <div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold ring-1 ring-emerald-200">
              <Tag className="h-3 w-3" /> {toStr(category)}
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">{toStr(title)}</h1>
            <p className="mt-2 text-3xl font-bold text-emerald-600">{formatNaira(price)}</p>
            {created_at && <p className="mt-1 text-xs text-slate-400">Posted {formatDate(created_at)}</p>}
          </div>

          {/* Vendor */}
          <div className="rounded-xl bg-white ring-1 ring-slate-200 p-3.5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-950 flex items-center justify-center text-white font-bold text-sm">
              {toStr(vendorName).charAt(0).toUpperCase() || 'V'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{toStr(vendorName)}</p>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Verified vendor
              </p>
            </div>
          </div>

          {/* Description */}
          {description && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-1.5">Description</h2>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{toStr(description)}</p>
            </div>
          )}

          {/* Specs */}
          {Object.keys(specs || {}).length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-2">Specifications</h2>
              <dl className="rounded-xl bg-white ring-1 ring-slate-200 divide-y divide-slate-100 overflow-hidden">
                {Object.entries(specs || {}).map(([k, v]) => (
                  <div key={k} className="flex justify-between px-3.5 py-2.5 text-sm">
                    <dt className="text-slate-500">{toStr(k)}</dt>
                    <dd className="text-slate-800 font-medium text-right">{toStr(v as unknown)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* WhatsApp CTA */}
          {waLink ? (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#25D366] text-white font-semibold hover:bg-[#1ebe5d] transition shadow-md shadow-emerald-500/10"
            >
              <MessageCircle className="h-5 w-5" />
              Chat on WhatsApp
            </a>
          ) : (
            <div className="mt-2 w-full py-3.5 rounded-xl bg-slate-100 text-slate-400 text-center text-sm font-medium">
              Vendor contact unavailable
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
