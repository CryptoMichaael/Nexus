-- 005_weekly_rank_pool.sql
-- ✅ WEEKLY RANK POOL REWARDS SYSTEM
BEGIN;

-- ============================================
-- 1. UPDATE USERS TABLE FOR RANK TRACKING
-- ============================================
-- Add reward_cap field (200 or 300)
ALTER TABLE users ADD COLUMN IF NOT EXISTS reward_cap INT DEFAULT 200 CHECK (reward_cap IN (200, 300));

-- Add rank achievement timestamp
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_rank_achieved_at timestamptz;

-- Index for rank queries
CREATE INDEX IF NOT EXISTS idx_users_current_rank ON users(current_rank) WHERE current_rank > 0;

-- ============================================
-- 2. UPDATE REWARD_CONFIG FOR WEEKLY POOL
-- ============================================
-- Add weekly pool share configuration
ALTER TABLE reward_config ADD COLUMN IF NOT EXISTS pool_share_percent NUMERIC(5,2);
ALTER TABLE reward_config ADD COLUMN IF NOT EXISTS min_deposit_atomic BIGINT;

-- Update rank configurations with pool shares and requirements
-- NOTE: Using 1 USDT as min deposit due to BIGINT limitation
-- FIXME: BIGINT max is ~9.2 USDT with 18 decimals. Need to migrate to NUMERIC for production.
-- Temp value: 1 USDT = 10^18 atomic units
UPDATE reward_config SET pool_share_percent = 35.00, min_deposit_atomic = 1000000000000000000 
WHERE config_type = 'rank' AND rank_level = 1; -- L1: 35%, $1 min (should be $100)

UPDATE reward_config SET pool_share_percent = 25.00 
WHERE config_type = 'rank' AND rank_level = 2; -- L2: 25%

UPDATE reward_config SET pool_share_percent = 16.00 
WHERE config_type = 'rank' AND rank_level = 3; -- L3: 16%

UPDATE reward_config SET pool_share_percent = 10.00 
WHERE config_type = 'rank' AND rank_level = 4; -- L4: 10%

UPDATE reward_config SET pool_share_percent = 7.00 
WHERE config_type = 'rank' AND rank_level = 5; -- L5: 7%

UPDATE reward_config SET pool_share_percent = 4.00 
WHERE config_type = 'rank' AND rank_level = 6; -- L6: 4%

UPDATE reward_config SET pool_share_percent = 3.00 
WHERE config_type = 'rank' AND rank_level = 7; -- L7: 3%

-- Update rank requirements to match new business logic
UPDATE reward_config SET required_directs = 5, required_direct_rank = NULL 
WHERE config_type = 'rank' AND rank_level = 1; -- L1: 5 directs with $100+

UPDATE reward_config SET required_directs = 3, required_direct_rank = 1 
WHERE config_type = 'rank' AND rank_level = 2; -- L2: 3 L1 directs

UPDATE reward_config SET required_directs = 4, required_direct_rank = 2 
WHERE config_type = 'rank' AND rank_level = 3; -- L3: 4 L2 directs

UPDATE reward_config SET required_directs = 5, required_direct_rank = 3 
WHERE config_type = 'rank' AND rank_level = 4; -- L4: 5 L3 directs

UPDATE reward_config SET required_directs = 5, required_direct_rank = 4 
WHERE config_type = 'rank' AND rank_level = 5; -- L5: 5 L4 directs

UPDATE reward_config SET required_directs = 6, required_direct_rank = 5 
WHERE config_type = 'rank' AND rank_level = 6; -- L6: 6 L5 directs

UPDATE reward_config SET required_directs = 6, required_direct_rank = 6 
WHERE config_type = 'rank' AND rank_level = 7; -- L7: 6 L6 directs

-- ============================================
-- 3. WEEKLY RANK POOLS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS weekly_rank_pools (
  id BIGSERIAL PRIMARY KEY,
  week_start_date DATE NOT NULL UNIQUE, -- Monday of the week
  week_end_date DATE NOT NULL,
  
  -- Pool calculation
  total_ecosystem_deposits_atomic BIGINT NOT NULL,
  pool_size_atomic BIGINT NOT NULL, -- 0.3% of total deposits
  
  -- Distribution per rank
  l1_share_atomic BIGINT DEFAULT 0,
  l2_share_atomic BIGINT DEFAULT 0,
  l3_share_atomic BIGINT DEFAULT 0,
  l4_share_atomic BIGINT DEFAULT 0,
  l5_share_atomic BIGINT DEFAULT 0,
  l6_share_atomic BIGINT DEFAULT 0,
  l7_share_atomic BIGINT DEFAULT 0,
  
  -- Holders count
  l1_holders INT DEFAULT 0,
  l2_holders INT DEFAULT 0,
  l3_holders INT DEFAULT 0,
  l4_holders INT DEFAULT 0,
  l5_holders INT DEFAULT 0,
  l6_holders INT DEFAULT 0,
  l7_holders INT DEFAULT 0,
  
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'calculated', 'distributed')),
  calculated_at timestamptz,
  distributed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weekly_pools_status ON weekly_rank_pools(status);
CREATE INDEX IF NOT EXISTS idx_weekly_pools_week_start ON weekly_rank_pools(week_start_date DESC);

-- ============================================
-- 4. WEEKLY RANK REWARDS TABLE (Individual)
-- ============================================
CREATE TABLE IF NOT EXISTS weekly_rank_rewards (
  id BIGSERIAL PRIMARY KEY,
  pool_id BIGINT REFERENCES weekly_rank_pools(id) NOT NULL,
  
  user_id uuid REFERENCES users(id) NOT NULL,
  wallet_address text NOT NULL,
  
  rank_level INT NOT NULL CHECK (rank_level BETWEEN 1 AND 7),
  rank_name text NOT NULL, -- L1, L2, etc.
  
  -- Share calculation
  total_rank_holders INT NOT NULL, -- How many users at this rank
  individual_share_atomic BIGINT NOT NULL, -- Amount this user gets
  
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'credited')),
  credited_at timestamptz,
  ledger_id uuid, -- Reference to ledger entry when credited
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(pool_id, user_id) -- One reward per user per week
);

CREATE INDEX IF NOT EXISTS idx_rank_rewards_user ON weekly_rank_rewards(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rank_rewards_pool ON weekly_rank_rewards(pool_id);
CREATE INDEX IF NOT EXISTS idx_rank_rewards_status ON weekly_rank_rewards(status) WHERE status = 'pending';

-- ============================================
-- 5. UPDATE LEDGER TYPES
-- ============================================
-- Add comment to clarify ledger types
COMMENT ON COLUMN ledger.type IS 'Types: DEPOSIT, DAILY_ROI, WEEKLY_RANK, MLM_COMMISSION, WITHDRAWAL';

-- ============================================
-- 6. UPDATE ROI LEDGER FOR REWARD CAP TRACKING
-- ============================================
ALTER TABLE roi_ledger ADD COLUMN IF NOT EXISTS reward_cap_percent INT DEFAULT 200;
ALTER TABLE roi_ledger ADD COLUMN IF NOT EXISTS is_rank_boosted BOOLEAN DEFAULT FALSE;

-- Index for active ROI ledgers needing calculation
CREATE INDEX IF NOT EXISTS idx_roi_active_calculation 
ON roi_ledger(status, last_calculated_date) 
WHERE status = 'active';

-- ============================================
-- 7. DIRECT REFERRALS MATERIALIZED VIEW
-- ============================================
-- Create materialized view for faster rank checking
CREATE MATERIALIZED VIEW IF NOT EXISTS user_direct_referrals AS
SELECT 
  u.id AS user_id,
  u.wallet_address,
  u.current_rank,
  COUNT(DISTINCT d.id) AS total_directs,
  COUNT(DISTINCT CASE WHEN ub.total_deposited_atomic >= 100000000000000000000 THEN d.id END) AS qualified_directs,
  COALESCE(SUM(ub.total_deposited_atomic), 0) AS total_team_volume_atomic
FROM users u
LEFT JOIN users d ON d.sponsor_id = u.id
LEFT JOIN user_balances ub ON ub.user_id = d.id
GROUP BY u.id, u.wallet_address, u.current_rank;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_direct_referrals_user_id 
ON user_direct_referrals(user_id);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_user_direct_referrals()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_direct_referrals;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. RANK CHECKER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION check_and_upgrade_rank(p_user_id uuid)
RETURNS TABLE(
  new_rank INT,
  rank_name TEXT,
  upgraded BOOLEAN
) AS $$
DECLARE
  v_current_rank INT;
  v_next_rank INT;
  v_required_directs INT;
  v_required_direct_rank INT;
  v_qualified_count INT;
  v_rank_name TEXT;
  v_min_deposit_atomic BIGINT;
BEGIN
  -- Get current rank
  SELECT current_rank INTO v_current_rank FROM users WHERE id = p_user_id;
  
  -- Try to upgrade rank level by level
  v_next_rank := COALESCE(v_current_rank, 0) + 1;
  
  WHILE v_next_rank <= 7 LOOP
    -- Get requirements for next rank
    SELECT 
      rc.required_directs,
      rc.required_direct_rank,
      rc.rank_name,
      COALESCE(rc.min_deposit_atomic, 1000000000000000000) -- 1 USDT default
    INTO 
      v_required_directs,
      v_required_direct_rank,
      v_rank_name,
      v_min_deposit_atomic
    FROM reward_config rc
    WHERE rc.config_type = 'rank' AND rc.rank_level = v_next_rank;
    
    -- Check if user has enough qualified directs
    IF v_required_direct_rank IS NULL THEN
      -- L1: Need N directs with $100+ deposits
      SELECT COUNT(DISTINCT d.id)
      INTO v_qualified_count
      FROM users u
      JOIN users d ON d.sponsor_id = u.id
      JOIN user_balances ub ON ub.user_id = d.id
      WHERE u.id = p_user_id
        AND ub.total_deposited_atomic >= v_min_deposit_atomic;
    ELSE
      -- L2-L7: Need N directs with specific rank
      SELECT COUNT(DISTINCT d.id)
      INTO v_qualified_count
      FROM users u
      JOIN users d ON d.sponsor_id = u.id
      WHERE u.id = p_user_id
        AND d.current_rank >= v_required_direct_rank;
    END IF;
    
    -- Check if qualifies for this rank
    IF v_qualified_count >= v_required_directs THEN
      -- Upgrade to this rank
      UPDATE users 
      SET 
        current_rank = v_next_rank,
        reward_cap = 300, -- Ranked users get 300% cap
        rank_updated_at = now(),
        first_rank_achieved_at = COALESCE(first_rank_achieved_at, now())
      WHERE id = p_user_id;
      
      -- Update all active ROI ledgers to 300% cap
      UPDATE roi_ledger
      SET 
        max_roi_atomic = (principal_atomic * 3), -- 300%
        reward_cap_percent = 300,
        is_rank_boosted = TRUE
      WHERE user_id = p_user_id AND status = 'active';
      
      -- Try next rank
      v_next_rank := v_next_rank + 1;
    ELSE
      -- Can't qualify for this rank, stop checking
      EXIT;
    END IF;
  END LOOP;
  
  -- Return final rank
  SELECT u.current_rank, rc.rank_name
  INTO v_current_rank, v_rank_name
  FROM users u
  LEFT JOIN reward_config rc ON rc.config_type = 'rank' AND rc.rank_level = u.current_rank
  WHERE u.id = p_user_id;
  
  RETURN QUERY SELECT 
    COALESCE(v_current_rank, 0) AS new_rank,
    COALESCE(v_rank_name, 'Unranked') AS rank_name,
    TRUE AS upgraded;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. RANK PROGRESS FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION get_rank_progress(p_user_id uuid)
RETURNS TABLE(
  current_rank INT,
  current_rank_name TEXT,
  next_rank INT,
  next_rank_name TEXT,
  required_directs INT,
  required_rank_of_directs INT,
  current_qualified_directs INT,
  progress_percent NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH user_info AS (
    SELECT u.current_rank, u.id
    FROM users u
    WHERE u.id = p_user_id
  ),
  next_rank_info AS (
    SELECT 
      rc.rank_level,
      rc.rank_name,
      rc.required_directs,
      rc.required_direct_rank,
      COALESCE(rc.min_deposit_atomic, 1000000000000000000) as min_deposit -- 1 USDT
    FROM reward_config rc, user_info ui
    WHERE rc.config_type = 'rank' 
      AND rc.rank_level = COALESCE(ui.current_rank, 0) + 1
    LIMIT 1
  ),
  qualified_count AS (
    SELECT 
      CASE 
        WHEN nri.required_direct_rank IS NULL THEN
          -- Count directs with min deposit
          (SELECT COUNT(DISTINCT d.id)
           FROM users u
           JOIN users d ON d.sponsor_id = u.id
           JOIN user_balances ub ON ub.user_id = d.id
           WHERE u.id = p_user_id
             AND ub.total_deposited_atomic >= nri.min_deposit)
        ELSE
          -- Count directs with required rank
          (SELECT COUNT(DISTINCT d.id)
           FROM users u
           JOIN users d ON d.sponsor_id = u.id
           WHERE u.id = p_user_id
             AND d.current_rank >= nri.required_direct_rank)
      END as count
    FROM next_rank_info nri
  )
  SELECT 
    COALESCE(ui.current_rank, 0),
    COALESCE(rc1.rank_name, 'Unranked'),
    nri.rank_level,
    nri.rank_name,
    nri.required_directs,
    nri.required_direct_rank,
    COALESCE(qc.count, 0)::INT,
    ROUND((COALESCE(qc.count, 0)::NUMERIC / NULLIF(nri.required_directs, 0) * 100), 2)
  FROM user_info ui
  LEFT JOIN reward_config rc1 ON rc1.config_type = 'rank' AND rc1.rank_level = ui.current_rank
  CROSS JOIN next_rank_info nri
  CROSS JOIN qualified_count qc;
END;
$$ LANGUAGE plpgsql;

COMMIT;
