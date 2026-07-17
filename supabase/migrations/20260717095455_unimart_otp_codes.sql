/*
# Unimart OTP codes table + profile schema tweaks

1. New Tables
- `otp_codes` — stores hashed 6-digit login codes with expiry + attempt cap.
  RLS enabled with NO anon policies (locked). Only the service role (edge
  functions `send-otp` / `verify-otp`) can read/write via the service role key.

2. Security
- otp_codes locked down (no client access). Codes are SHA-256 hashed with a
  pepper, expire after 5 minutes, max 5 verification attempts, single-use.
- profiles/products/transactions policies unchanged from prior migration.

3. Notes
- This table is an implementation detail of the Email OTP login flow. The
  frontend never touches it directly — all access goes through edge functions.
*/

CREATE TABLE IF NOT EXISTS otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed boolean NOT NULL DEFAULT false,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- Intentionally NO policies: table is inaccessible to anon/authenticated.
-- All reads/writes happen through edge functions using the service role key.

CREATE INDEX IF NOT EXISTS idx_otp_email_created ON otp_codes(email, created_at DESC);