/*
# CampusMall marketplace schema

Multi-vendor campus marketplace with prepaid wallet (₦100 per post),
two-way top-up (Paystack + manual bank transfer), and admin approvals.

1. New Tables
- `profiles` — extends auth.users with role (vendor|admin), wallet_balance,
  phone, store_name. user_id defaults to auth.uid() so inserts succeed.
- `products` — vendor listings (image-only). owner_id -> profiles.user_id.
  Deducts ₦100 on insert via trigger; blocks if wallet_balance < 100.
- `transactions` — wallet ledger. type (post_fee|topup|manual_topup),
  amount (positive for credit, negative for debit), status (pending|success|failed),
  paystack_ref, receipt_url, admin_note.

2. Security (RLS)
- profiles: owner can read/update own row; admins read all; admins can update
  wallet_balance when approving manual transfers.
- products: public read (anon+authenticated) so marketplace browse works while
  logged out; only owner can insert/update/delete own.
- transactions: owner read own; admin read all; owner insert own; admin update.

3. Wallet atomicity
- `spend_wallet(p_amount)` trigger function runs BEFORE each product insert.
  It locks the profile row, checks balance >= amount, and atomically decrements.
  Raises exception if insufficient (frontend gate + DB gate = double protection).
- `credit_wallet(p_user, p_amount)` helper for admin approvals / paystack.

4. Important notes
- All policies use auth.uid(); no current_user.
- profiles.user_id has DEFAULT auth.uid() so client inserts without user_id work.
- products.owner_id has DEFAULT auth.uid() for the same reason.
- No DROP/DELETE of columns; idempotent with IF NOT EXISTS / DROP POLICY IF EXISTS.
*/

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text DEFAULT '',
  store_name text DEFAULT '',
  phone text DEFAULT '',
  role text NOT NULL DEFAULT 'vendor' CHECK (role IN ('vendor','admin')),
  wallet_balance numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
CREATE POLICY "profiles_select_own_or_admin"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'
));

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON profiles;
CREATE POLICY "profiles_update_own_or_admin"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'
))
WITH CHECK (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'
));

-- ============================================================
-- PRODUCTS (image-only listings)
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(user_id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled',
  price numeric(12,2) NOT NULL DEFAULT 0,
  category text DEFAULT 'Other',
  image_url text DEFAULT '',
  description text DEFAULT '',
  specs jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Public read so logged-out users can browse the marketplace
DROP POLICY IF EXISTS "products_select_public" ON products;
CREATE POLICY "products_select_public"
ON products FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "products_insert_own" ON products;
CREATE POLICY "products_insert_own"
ON products FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "products_update_own" ON products;
CREATE POLICY "products_update_own"
ON products FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "products_delete_own" ON products;
CREATE POLICY "products_delete_own"
ON products FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_products_owner ON products(owner_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at DESC);

-- ============================================================
-- TRANSACTIONS (wallet ledger)
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(user_id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('post_fee','topup','manual_topup')),
  amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('pending','success','failed')),
  paystack_ref text DEFAULT '',
  receipt_url text DEFAULT '',
  admin_note text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tx_select_own_or_admin" ON transactions;
CREATE POLICY "tx_select_own_or_admin"
ON transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'
));

DROP POLICY IF EXISTS "tx_insert_own" ON transactions;
CREATE POLICY "tx_insert_own"
ON transactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tx_update_admin" ON transactions;
CREATE POLICY "tx_update_admin"
ON transactions FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'
));

CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status);

-- ============================================================
-- WALLET HELPER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION spend_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance numeric(12,2);
  fee numeric(12,2) := 100;
BEGIN
  SELECT wallet_balance INTO current_balance
  FROM profiles
  WHERE user_id = NEW.owner_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendor profile not found. Cannot post product.';
  END IF;

  IF current_balance < fee THEN
    RAISE EXCEPTION 'Insufficient balance! You need at least ₦100 in your wallet to post. Please top up your wallet.';
  END IF;

  UPDATE profiles
  SET wallet_balance = wallet_balance - fee
  WHERE user_id = NEW.owner_id;

  INSERT INTO transactions (user_id, type, amount, status)
  VALUES (NEW.owner_id, 'post_fee', -fee, 'success');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_spend_wallet ON products;
CREATE TRIGGER trg_spend_wallet
BEFORE INSERT ON products
FOR EACH ROW
EXECUTE FUNCTION spend_wallet();

CREATE OR REPLACE FUNCTION credit_wallet(p_user uuid, p_amount numeric, p_type text, p_status text, p_ref text, p_receipt text, p_note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_status = 'success' THEN
    UPDATE profiles SET wallet_balance = wallet_balance + p_amount WHERE user_id = p_user;
  END IF;
  INSERT INTO transactions (user_id, type, amount, status, paystack_ref, receipt_url, admin_note)
  VALUES (p_user, p_type, p_amount, p_status, COALESCE(p_ref,''), COALESCE(p_receipt,''), COALESCE(p_note,''));
END;
$$;

-- ============================================================
-- SEED: Admin account placeholder (email-based, no real user)
-- Admins sign up normally; to promote a user to admin, run:
--   UPDATE profiles SET role='admin' WHERE email='you@example.com';
-- ============================================================

-- Storage bucket for product images + receipts (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('campusmall', 'campusmall', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "storage_public_read" ON storage.objects;
CREATE POLICY "storage_public_read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'campusmall');

DROP POLICY IF EXISTS "storage_auth_insert" ON storage.objects;
CREATE POLICY "storage_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'campusmall');

DROP POLICY IF EXISTS "storage_auth_update_own" ON storage.objects;
CREATE POLICY "storage_auth_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'campusmall' AND owner = auth.uid())
WITH CHECK (bucket_id = 'campusmall');

DROP POLICY IF EXISTS "storage_auth_delete_own" ON storage.objects;
CREATE POLICY "storage_auth_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'campusmall' AND owner = auth.uid());