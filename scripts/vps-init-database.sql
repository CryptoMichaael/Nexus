-- ========================================
-- NEXUS REWARDS - DATABASE INITIALIZATION
-- Run this on production VPS after PostgreSQL setup
-- ========================================

-- Connect to database
\c nexus_production;

BEGIN;

-- ========================================
-- EXTENSIONS
-- ========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- USERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address text NOT NULL UNIQUE,
  sponsor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  current_rank INT DEFAULT 0,
  rank_updated_at timestamptz,
  role text NOT NULL DEFAULT 'USER',
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_sponsor ON users(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_rank ON users(current_rank) WHERE current_rank > 0;

-- ========================================
-- DEPOSITS TABLE (WITH SECURITY FIXES)
-- ========================================
CREATE TABLE IF NOT EXISTS deposits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id),
  tx_hash text NOT NULL UNIQUE, -- ✅ UNIQUE prevents double-spend
  token text NOT NULL,
  amount numeric(38,18) NOT NULL,
  amount_atomic BIGINT, -- ✅ BigInt for precision
  from_address text,
  to_address text,
  block_number BIGINT,
  status text NOT NULL DEFAULT 'PENDING',
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  error text
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_deposits_tx_hash ON deposits(tx_hash);
CREATE INDEX IF NOT EXISTS idx_deposits_status_created ON deposits(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deposits_user_created ON deposits(user_id, created_at DESC);

-- ========================================
-- ROI LEDGER (7-LEVEL MLM TRACKING)
-- ========================================
CREATE TABLE IF NOT EXISTS roi_ledger (
  id BIGSERIAL PRIMARY KEY,
  deposit_id uuid REFERENCES deposits(id) NOT NULL,
  user_id uuid REFERENCES users(id) NOT NULL,
  wallet_address text NOT NULL,
  
  principal_atomic BIGINT NOT NULL,
  max_roi_atomic BIGINT NOT NULL,
  accumulated_roi_atomic BIGINT DEFAULT 0 NOT NULL,
  
  daily_rate_bps INT NOT NULL, -- Basis points (30 = 0.3%)
  status text DEFAULT 'active' NOT NULL, -- 'active' | 'completed' | 'stopped'
  
  start_date DATE DEFAULT CURRENT_DATE NOT NULL,
  last_calculated_date DATE,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roi_ledger_user ON roi_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_roi_ledger_status ON roi_ledger(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_roi_ledger_deposit ON roi_ledger(deposit_id);

-- ========================================
-- MLM COMMISSIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS mlm_commissions (
  id BIGSERIAL PRIMARY KEY,
  wallet_address text NOT NULL,
  referred_wallet text NOT NULL,
  
  level INT NOT NULL CHECK (level BETWEEN 1 AND 7),
  deposit_amount_atomic BIGINT NOT NULL,
  commission_rate_bps INT NOT NULL,
  commission_amount_atomic BIGINT NOT NULL,
  
  deposit_id uuid REFERENCES deposits(id),
  status text DEFAULT 'credited' NOT NULL,
  credited_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mlm_wallet_created ON mlm_commissions(wallet_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mlm_referred_wallet ON mlm_commissions(referred_wallet);

-- ========================================
-- REWARD CONFIG (SINGLE POINT OF LOGIC)
-- ========================================
CREATE TABLE IF NOT EXISTS reward_config (
  id SERIAL PRIMARY KEY,
  config_type text NOT NULL, -- 'roi' | 'mlm_level' | 'rank'
  level INT, -- For MLM levels (1-7)
  rank_level INT, -- For rank requirements (1-7)
  
  -- ROI Configuration
  daily_rate_bps INT, -- Basis points (0.3% = 30 bps)
  standard_cap_percent INT, -- 200% for non-ranked
  ranked_cap_percent INT, -- 300% for ranked users
  
  -- MLM Configuration
  commission_rate_bps INT, -- Commission per level (bps)
  
  -- Rank Requirements
  rank_name text, -- L1, L2, ..., L7
  required_directs INT, -- Number of direct referrals needed
  required_direct_rank INT, -- Required rank of directs
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Unique constraints
  UNIQUE (config_type, level),
  UNIQUE (config_type, rank_level)
);

-- ✅ Insert default ROI config (0.3% daily, 200%/300% caps)
INSERT INTO reward_config (config_type, daily_rate_bps, standard_cap_percent, ranked_cap_percent)
VALUES ('roi', 30, 200, 300)
ON CONFLICT DO NOTHING;

-- ✅ Insert MLM level commissions (1% to 0.05%)
INSERT INTO reward_config (config_type, level, commission_rate_bps) VALUES
('mlm_level', 1, 100), -- Level 1: 1.0%
('mlm_level', 2, 50),  -- Level 2: 0.5%
('mlm_level', 3, 30),  -- Level 3: 0.3%
('mlm_level', 4, 20),  -- Level 4: 0.2%
('mlm_level', 5, 15),  -- Level 5: 0.15%
('mlm_level', 6, 10),  -- Level 6: 0.1%
('mlm_level', 7, 5)    -- Level 7: 0.05%
ON CONFLICT DO NOTHING;

-- ✅ Insert rank requirements
INSERT INTO reward_config (config_type, rank_level, rank_name, required_directs, required_direct_rank) VALUES
('rank', 1, 'L1', 5, NULL),  -- 5 direct users
('rank', 2, 'L2', 3, 1),     -- 3 L1 directs
('rank', 3, 'L3', 4, 2),     -- 4 L2 directs
('rank', 4, 'L4', 5, 3),     -- 5 L3 directs
('rank', 5, 'L5', 5, 4),     -- 5 L4 directs
('rank', 6, 'L6', 6, 5),     -- 6 L5 directs
('rank', 7, 'L7', 6, 6)      -- 6 L6 directs
ON CONFLICT DO NOTHING;

-- ========================================
-- LEDGER (TRANSACTION HISTORY)
-- ========================================
CREATE TABLE IF NOT EXISTS ledger (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id),
  type text NOT NULL, -- 'DEPOSIT' | 'ROI' | 'MLM_COMMISSION' | 'WITHDRAWAL'
  token text NOT NULL,
  amount numeric(38,18) NOT NULL,
  amount_atomic BIGINT,
  status text NOT NULL DEFAULT 'COMPLETED',
  ref_type text,
  ref_id uuid,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_user_created ON ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON ledger(type);

-- ========================================
-- USER BALANCES (CONSOLIDATED)
-- ========================================
CREATE TABLE IF NOT EXISTS user_balances (
  id BIGSERIAL PRIMARY KEY,
  user_id uuid REFERENCES users(id) NOT NULL UNIQUE,
  wallet_address text NOT NULL UNIQUE,
  
  -- Atomic unit balances (BIGINT)
  total_deposited_atomic BIGINT DEFAULT 0 NOT NULL,
  total_roi_earned_atomic BIGINT DEFAULT 0 NOT NULL,
  total_mlm_earned_atomic BIGINT DEFAULT 0 NOT NULL,
  claimable_balance_atomic BIGINT DEFAULT 0 NOT NULL,
  total_withdrawn_atomic BIGINT DEFAULT 0 NOT NULL,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_balances_wallet ON user_balances(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON user_balances(user_id);

-- ========================================
-- WITHDRAWALS
-- ========================================
CREATE TABLE IF NOT EXISTS withdrawals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id),
  token text NOT NULL,
  amount numeric(38,18) NOT NULL,
  amount_atomic BIGINT,
  to_address text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  tx_hash text,
  error text,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_status_created ON withdrawals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);

-- ========================================
-- AUTH NONCES (WALLET LOGIN)
-- ========================================
CREATE TABLE IF NOT EXISTS auth_nonces (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address text NOT NULL,
  nonce text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nonces_wallet_created ON auth_nonces(wallet_address, created_at DESC);

COMMIT;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================
\echo '✅ Verifying table creation...'
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

\echo ''
\echo '✅ Verifying reward_config data...'
SELECT config_type, level, commission_rate_bps, daily_rate_bps FROM reward_config ORDER BY config_type, level;

\echo ''
\echo '✅ Database initialization complete!'
\echo 'Next: Run migration 004_mlm_tree_function.sql'
