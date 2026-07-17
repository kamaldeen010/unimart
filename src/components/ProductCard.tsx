import { Link } from 'react-router-dom';
import { MessageCircle, ImageIcon } from 'lucide-react';
import { buildWhatsAppLink, classNames, formatNaira, toStr } from '../lib/format';
import type { Product } from '../types';

type Props = { product: Product; vendor?: { store_name?: string; phone?: string; full_name?: string } };

export default function ProductCard({ product, vendor }: Props) {
  if (!product) return null;

  const { id = '', title = 'Untitled', price = 0, category = 'Other', image_url = '', specs = {} } = product;
  const vendorName = vendor?.store_name || vendor?.full_name || 'Vendor';
  const vendorPhone = vendor?.phone || '';
  const waLink = buildWhatsAppLink(vendorPhone, vendorName, title, price);

  return (
    <div className="group rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden hover:ring-emerald-300 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 flex flex-col">
      <Link to={`/product/${id}`} className="block relative aspect-square overflow-hidden bg-slate-100">
        {image_url ? (
          <img
            src={image_url}
            alt={toStr(title)}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
            <ImageIcon className="h-10 w-10" />
          </div>
        )}
        <span className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-slate-950/85 backdrop-blur text-white text-[11px] font-semibold tracking-wide">
          {toStr(category)}
        </span>
      </Link>

      <div className="p-3 flex flex-col gap-2 flex-1">
        <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">{toStr(title)}</h3>

        {Object.keys(specs || {}).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {Object.entries(specs || {})
              .slice(0, 2)
              .map(([k, v]) => (
                <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                  {toStr(k)}: {toStr(v as unknown)}
                </span>
              ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="text-base font-bold text-emerald-600">{formatNaira(price)}</span>
          {waLink ? (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={classNames(
                'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-xs font-semibold',
                'bg-[#25D366] hover:bg-[#1ebe5d] transition shadow-sm'
              )}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Chat
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
