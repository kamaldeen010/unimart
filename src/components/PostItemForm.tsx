import { useRef, useState } from 'react';
import { X, Loader2, Plus, UploadCloud, Image as ImageIcon } from 'lucide-react';
import { supabase, POST_FEE } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatNaira } from '../lib/format';

const CATEGORIES = ['Electronics', 'Fashion', 'Books', 'Food', 'Services', 'Other'];
const CONDITIONS = ['New', 'Like New', 'Good', 'Fair'];

export default function PostItemForm({ balance, onPosted }: { balance: number; onPosted: () => void }) {
  const { profile } = useAuth();
  const { push } = useToast();
  const [form, setForm] = useState({ title: '', price: '', category: 'Electronics', condition: 'New', description: '' });
  const [specRows, setSpecRows] = useState<{ k: string; v: string }[]>([{ k: '', v: '' }]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const canPost = balance >= POST_FEE;
  const insufficient = !canPost;

  const handleFile = (f: File) => {
    if (!f.type.startsWith('image/')) {
      push('error', 'Only image files are allowed. No videos.');
      return;
    }
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
    setUploadProgress(0);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const uploadImage = async (): Promise<string> => {
    if (!imageFile) return '';
    setUploadProgress(20);
    const ext = imageFile.name.split('.').pop() || 'jpg';
    const path = `products/${profile!.user_id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('campusmall').upload(path, imageFile, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    setUploadProgress(90);
    const { data } = supabase.storage.from('campusmall').getPublicUrl(path);
    setUploadProgress(100);
    return data.publicUrl || '';
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPost) {
      push('error', `Insufficient balance! You need at least ${formatNaira(POST_FEE)} in your wallet to post. Please top up your wallet.`);
      return;
    }
    if (!form.title.trim() || !form.price.trim()) {
      push('error', 'Please add a title and price.');
      return;
    }
    if (!imageFile) {
      push('error', 'Please upload a product image.');
      return;
    }
    setSubmitting(true);
    try {
      const imageUrl = await uploadImage();
      const specs: Record<string, string> = { Condition: form.condition };
      for (const r of specRows) {
        if (r.k.trim() && r.v.trim()) specs[r.k.trim()] = r.v.trim();
      }
      const priceNum = Number(form.price.replace(/[^0-9.]/g, ''));
      const { error } = await supabase.from('products').insert({
        owner_id: profile!.user_id,
        title: form.title.trim(),
        price: priceNum,
        category: form.category,
        image_url: imageUrl,
        description: form.description.trim(),
        specs,
      });
      if (error) throw error;
      push('success', 'Item posted successfully! ₦100 deducted from your wallet.');
      onPosted();
    } catch (err: any) {
      push('error', err.message || 'Could not post item.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6 max-w-3xl">
      {insufficient && (
        <div className="flex items-start gap-2.5 p-4 rounded-xl bg-rose-50 ring-1 ring-rose-200 text-rose-700 text-sm">
          <span className="font-semibold">Insufficient balance!</span>
          <span>You need at least <strong>{formatNaira(POST_FEE)}</strong> in your wallet to post. Please top up your wallet.</span>
        </div>
      )}

      {/* General Info */}
      <Section title="General Information" subtitle="Basic details about your item">
        <div className="space-y-4">
          <Field label="Title">
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. iPhone 12 Pro Max" className="inp pl-3" />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Category">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="inp pl-3">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Condition">
              <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="inp pl-3">
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Description">
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Describe condition, specs, location, what's included…" className="inp pl-3 resize-none" />
          </Field>
        </div>
      </Section>

      {/* Pricing */}
      <Section title="Pricing" subtitle="Set your asking price">
        <Field label="Price (₦)">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">₦</span>
            <input required inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="150000" className="w-full pl-8 pr-3 py-2.5 rounded-xl ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald-400 focus:outline-none text-sm transition" />
          </div>
          <p className="mt-1.5 text-xs text-slate-400">Posting fee of {formatNaira(POST_FEE)} will be deducted on submit.</p>
        </Field>
      </Section>

      {/* Media */}
      <Section title="Media" subtitle="Upload a clear photo — image only, no videos">
        <input ref={fileInput} type="file" accept="image/*" onChange={onFileInput} className="hidden" />

        {imagePreview ? (
          <div className="rounded-2xl ring-1 ring-slate-200 overflow-hidden">
            <div className="relative aspect-video bg-slate-100">
              <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
              {submitting && uploadProgress < 100 && (
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-200">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
              <button type="button" onClick={() => { setImageFile(null); setImagePreview(''); setUploadProgress(0); }} className="absolute top-2 right-2 h-8 w-8 rounded-full bg-slate-950/70 text-white flex items-center justify-center hover:bg-slate-950 transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3 flex items-center gap-2 text-xs text-slate-500">
              <ImageIcon className="h-3.5 w-3.5" /> {imageFile?.name}
            </div>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInput.current?.click()}
            className={
              'cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ' +
              (dragging ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50')
            }
          >
            <div className="inline-flex h-14 w-14 rounded-full bg-emerald-100 items-center justify-center mb-3">
              <UploadCloud className="h-7 w-7 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Drag & drop your product image here</p>
            <p className="text-xs text-slate-400 mt-1">or click to browse · PNG, JPG, WEBP up to 10MB · No videos</p>
          </div>
        )}
      </Section>

      {/* Custom specs */}
      <Section title="Specifications" subtitle="Add any custom specs (optional)">
        <div className="space-y-2">
          {specRows.map((r, i) => (
            <div key={i} className="flex gap-2">
              <input value={r.k} onChange={(e) => setSpecRows(specRows.map((x, j) => j === i ? { ...x, k: e.target.value } : x))} placeholder="Spec name (e.g. RAM)" className="inp pl-3 flex-1" />
              <input value={r.v} onChange={(e) => setSpecRows(specRows.map((x, j) => j === i ? { ...x, v: e.target.value } : x))} placeholder="Value (e.g. 8GB)" className="inp pl-3 flex-1" />
              {specRows.length > 1 && (
                <button type="button" onClick={() => setSpecRows(specRows.filter((_, j) => j !== i))} className="px-2 text-slate-400 hover:text-rose-500">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => setSpecRows([...specRows, { k: '', v: '' }])} className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1 mt-1">
            <Plus className="h-3 w-3" /> Add spec row
          </button>
        </div>
      </Section>

      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-slate-500">Fee: <span className="font-semibold text-slate-700">{formatNaira(POST_FEE)}</span></p>
        <button
          type="submit"
          disabled={submitting || insufficient}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md shadow-emerald-500/20"
        >
          {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Posting…</> : <><Plus className="h-4 w-4" /> Post item</>}
        </button>
      </div>
    </form>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
