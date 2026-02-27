-- 001_init.sql: create core schema
BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address text NOT NULL UNIQUE,
  sponsor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'USER',
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_sponsor ON users(sponsor_id);

CREATE TABLE IF NOT EXISTS auth_nonces (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address text NOT NULL,
  nonce text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nonces_wallet_created ON auth_nonces(wallet_address, created_at DESC);

CREATE TABLE IF NOT EXISTS deposits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id),
  tx_hash text NOT NULL UNIQUE,
  token text NOT NULL,
  amount numeric(38,18) NOT NULL,
  from_address text,
  to_address text,
  status text NOT NULL DEFAULT 'PENDING',
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  error text
);

CREATE TABLE IF NOT EXISTS ledger (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id),
  type text NOT NULL,
  token text NOT NULL,
  amount numeric(38,18) NOT NULL,
  status text NOT NULL DEFAULT 'COMPLETED',
  ref_type text,
  ref_id uuid,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_user_created ON ledger(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS balances (
  user_id uuid PRIMARY KEY REFERENCES users(id),
  token text NOT NULL,
  available numeric(38,18) NOT NULL DEFAULT 0,
  locked numeric(38,18) NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id),
  token text NOT NULL,
  amount numeric(38,18) NOT NULL,
  to_address text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  tx_hash text,
  error text,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_status_created ON withdrawals(status, created_at DESC);

CREATE TABLE IF NOT EXISTS reward_config (
  level int PRIMARY KEY,
  percent_bps int NOT NULL,
  active boolean NOT NULL DEFAULT true
);

COMMIT;
