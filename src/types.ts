export type Product = {
  id: string;
  owner_id: string;
  title: string;
  price: number;
  category: string;
  image_url: string;
  description: string;
  specs: Record<string, string>;
  created_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  type: 'post_fee' | 'topup' | 'manual_topup';
  amount: number;
  status: 'pending' | 'success' | 'failed';
  paystack_ref: string;
  receipt_url: string;
  admin_note: string;
  created_at: string;
};

export type VendorWithProfile = {
  user_id: string;
  email: string;
  full_name: string;
  store_name: string;
  phone: string;
  role: 'vendor' | 'admin';
  wallet_balance: number;
  created_at: string;
};
