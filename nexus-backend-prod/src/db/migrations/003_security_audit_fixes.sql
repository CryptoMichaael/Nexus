-- 003_security_audit_fixes.sql
-- ✅ CRITICAL SECURITY FIXES
BEGIN;

-- ============================================
-- 1. DOUBLE-SPEND PREVENTION
-- ============================================
-- Ensure tx_hash uniqueness (already exists, adding explicit constraint)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deposits_tx_hash_unique'
  ) THEN
    ALTER TABLE deposits ADD CONSTRAINT deposits_tx_hash_unique UNIQUE (tx_hash);
  END IF;
END $$;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_deposits_tx_hash ON deposits(tx_hash);
CREATE INDEX IF NOT EXISTS idx_deposits_status_created ON deposits(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deposits_user_created ON deposits(user_id, created_at DESC);

-- ============================================
-- 2. BIGINT ATOMIC UNITS MIGRATION
-- ============================================
-- Add new atomic unit columns (BIGINT stores wei/atomic units)
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS amount_atomic BIGINT;
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS block_number BIGINT;

ALTER TABLE ledger ADD COLUMN IF NOT EXISTS amount_atomic BIGINT;

ALTER TABLE balances ADD COLUMN IF NOT EXISTS available_atomic BIGINT DEFAULT 0;
ALTER TABLE balances ADD COLUMN IF NOT EXISTS locked_atomic BIGINT DEFAULT 0;

ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS amount_atomic BIGINT;

-- Migrate existing numeric values to atomic (multiply by 10^18)
-- ⚠️ Run only once! Comment out after migration
-- UPDATE deposits SET amount_atomic = (amount * 1000000000000000000)::BIGINT WHERE amount_atomic IS NULL;
-- UPDATE ledger SET amount_atomic = (amount * 1000000000000000000)::BIGINT WHERE amount_atomic IS NULL;
-- UPDATE balances SET available_atomic = (available * 1000000000000000000)::BIGINT WHERE available_atomic IS NULL;
-- UPDATE balances SET locked_atomic = (locked * 1000000000000000000)::BIGINT WHERE locked_atomic IS NULL;
-- UPDATE withdrawals SET amount_atomic = (amount * 1000000000000000000)::BIGINT WHERE amount_atomic IS NULL;

-- ============================================
-- 3. ROI TRACKING LEDGER
-- ============================================
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

-- ============================================
-- 4. MLM COMMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS mlm_commissions (
  id BIGSERIAL PRIMARY KEY,
  wallet_address text NOT NULL,
  referred_wallet text NOT NULL,
  
  level INT NOT NULL CHECK (level BETWEEN 1 AND 7),
  deposit_amount_atomic BIGINT NOT NULL,
  commission_rate_bps INT NOT NULL,
  commission_amount_atomic BIGINT NOT NULL,
  
  deposit_id uuid REFERENCES deposits(id),
  status text DEFAULT 'pending' NOT NULL,
  credited_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mlm_wallet_created ON mlm_commissions(wallet_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mlm_referred_wallet ON mlm_commissions(referred_wallet);
CREATE INDEX IF NOT EXISTS idx_mlm_status ON mlm_commissions(status) WHERE status = 'pending';

-- ============================================
-- 5. ENHANCED REWARD CONFIG
-- ============================================
DROP TABLE IF EXISTS reward_config CASCADE;

CREATE TABLE reward_config (
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

-- ✅ Insert default ROI config
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

-- ============================================
-- 6. USER RANK TRACKING
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_rank INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rank_updated_at timestamptz;

-- ============================================
-- 7. USER BALANCES CONSOLIDATION
-- ============================================
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

COMMIT;
