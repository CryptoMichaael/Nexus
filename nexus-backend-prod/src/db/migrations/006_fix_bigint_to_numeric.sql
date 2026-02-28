-- 006_fix_bigint_to_numeric.sql
-- ✅ CRITICAL FIX: Migrate BIGINT to NUMERIC for financial precision
-- BIGINT max (2^63-1 ≈ 9.2×10^18) cannot store $100+ with 18 decimals
-- NUMERIC supports arbitrary precision

BEGIN;

-- ============================================
-- 0. DROP MATERIALIZED VIEW TEMPORARILY
-- ============================================
DROP MATERIALIZED VIEW IF EXISTS user_direct_referrals CASCADE;

-- ============================================
-- 1. MIGRATE DEPOSITS TABLE
-- ============================================
ALTER TABLE deposits 
  ALTER COLUMN amount_atomic TYPE NUMERIC USING amount_atomic::NUMERIC;

ALTER TABLE deposits 
  ALTER COLUMN block_number TYPE BIGINT USING block_number::BIGINT;

-- ============================================
-- 2. MIGRATE LEDGER TABLE
-- ============================================
ALTER TABLE ledger 
  ALTER COLUMN amount_atomic TYPE NUMERIC USING amount_atomic::NUMERIC;

-- ============================================
-- 3. MIGRATE USER BALANCES TABLE
-- ============================================
ALTER TABLE user_balances 
  ALTER COLUMN total_deposited_atomic TYPE NUMERIC USING total_deposited_atomic::NUMERIC,
  ALTER COLUMN total_roi_earned_atomic TYPE NUMERIC USING total_roi_earned_atomic::NUMERIC,
  ALTER COLUMN total_mlm_earned_atomic TYPE NUMERIC USING total_mlm_earned_atomic::NUMERIC,
  ALTER COLUMN claimable_balance_atomic TYPE NUMERIC USING claimable_balance_atomic::NUMERIC,
  ALTER COLUMN total_withdrawn_atomic TYPE NUMERIC USING total_withdrawn_atomic::NUMERIC;

-- ============================================
-- 4. MIGRATE ROI LEDGER TABLE
-- ============================================
ALTER TABLE roi_ledger 
  ALTER COLUMN principal_atomic TYPE NUMERIC USING principal_atomic::NUMERIC,
  ALTER COLUMN max_roi_atomic TYPE NUMERIC USING max_roi_atomic::NUMERIC,
  ALTER COLUMN accumulated_roi_atomic TYPE NUMERIC USING accumulated_roi_atomic::NUMERIC;

-- ============================================
-- 5. MIGRATE MLM COMMISSIONS TABLE
-- ============================================
ALTER TABLE mlm_commissions 
  ALTER COLUMN deposit_amount_atomic TYPE NUMERIC USING deposit_amount_atomic::NUMERIC,
  ALTER COLUMN commission_amount_atomic TYPE NUMERIC USING commission_amount_atomic::NUMERIC;

-- ============================================
-- 6. MIGRATE WITHDRAWALS TABLE
-- ============================================
ALTER TABLE withdrawals 
  ALTER COLUMN amount_atomic TYPE NUMERIC USING amount_atomic::NUMERIC;

-- Add withdrawal address restriction
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS deposit_address text;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS admin_override_address text;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS admin_approved_by uuid REFERENCES users(id);

-- ============================================
-- 7. MIGRATE WEEKLY RANK POOLS TABLE
-- ============================================
ALTER TABLE weekly_rank_pools 
  ALTER COLUMN total_ecosystem_deposits_atomic TYPE NUMERIC USING total_ecosystem_deposits_atomic::NUMERIC,
  ALTER COLUMN pool_size_atomic TYPE NUMERIC USING pool_size_atomic::NUMERIC,
  ALTER COLUMN l1_share_atomic TYPE NUMERIC USING l1_share_atomic::NUMERIC,
  ALTER COLUMN l2_share_atomic TYPE NUMERIC USING l2_share_atomic::NUMERIC,
  ALTER COLUMN l3_share_atomic TYPE NUMERIC USING l3_share_atomic::NUMERIC,
  ALTER COLUMN l4_share_atomic TYPE NUMERIC USING l4_share_atomic::NUMERIC,
  ALTER COLUMN l5_share_atomic TYPE NUMERIC USING l5_share_atomic::NUMERIC,
  ALTER COLUMN l6_share_atomic TYPE NUMERIC USING l6_share_atomic::NUMERIC,
  ALTER COLUMN l7_share_atomic TYPE NUMERIC USING l7_share_atomic::NUMERIC;

-- ============================================
-- 8. MIGRATE WEEKLY RANK REWARDS TABLE
-- ============================================
ALTER TABLE weekly_rank_rewards 
  ALTER COLUMN individual_share_atomic TYPE NUMERIC USING individual_share_atomic::NUMERIC;

-- ============================================
-- 9. MIGRATE REWARD CONFIG TABLE
-- ============================================
ALTER TABLE reward_config 
  ALTER COLUMN min_deposit_atomic TYPE NUMERIC USING min_deposit_atomic::NUMERIC;

-- Update min deposit to $100 (now safe with NUMERIC)
-- $100 USDT = 100 * 10^18 = 100000000000000000000
UPDATE reward_config 
SET min_deposit_atomic = 100000000000000000000 
WHERE config_type = 'rank' AND rank_level = 1;

-- ============================================
-- 10. UPDATE BALANCES TABLE
-- ============================================
-- Add default NUMERIC values (compatible with 0)
ALTER TABLE balances 
  ALTER COLUMN available_atomic TYPE NUMERIC USING COALESCE(available_atomic, 0)::NUMERIC,
  ALTER COLUMN locked_atomic TYPE NUMERIC USING COALESCE(locked_atomic, 0)::NUMERIC;

-- ============================================
-- 11. UPDATE ROI CALCULATION FUNCTION
-- ============================================
DROP FUNCTION IF EXISTS calculate_daily_roi();

CREATE OR REPLACE FUNCTION calculate_daily_roi()
RETURNS TABLE(
  processed_count BIGINT,
  total_roi_credited NUMERIC
) AS $$
DECLARE
  v_daily_rate_bps INT;
  v_standard_cap INT;
  v_ranked_cap INT;
  v_count BIGINT;
  v_total NUMERIC;
BEGIN
  -- Get ROI config
  SELECT daily_rate_bps, standard_cap_percent, ranked_cap_percent
  INTO v_daily_rate_bps, v_standard_cap, v_ranked_cap
  FROM reward_config
  WHERE config_type = 'roi' AND is_active = TRUE
  LIMIT 1;

  IF v_daily_rate_bps IS NULL THEN
    RAISE EXCEPTION 'ROI configuration not found';
  END IF;

  -- Batch process all active ROI ledgers
  WITH roi_calculations AS (
    SELECT 
      rl.id AS ledger_id,
      rl.user_id,
      rl.wallet_address,
      rl.principal_atomic,
      (rl.principal_atomic * v_daily_rate_bps / 10000) AS daily_roi_atomic,
      CASE 
        WHEN u.current_rank > 0 THEN (rl.principal_atomic * v_ranked_cap / 100)
        ELSE (rl.principal_atomic * v_standard_cap / 100)
      END AS max_roi_atomic,
      rl.accumulated_roi_atomic
    FROM roi_ledger rl
    INNER JOIN users u ON u.id = rl.user_id
    WHERE rl.status = 'active'
      AND (rl.last_calculated_date IS NULL OR rl.last_calculated_date < CURRENT_DATE)
  ),
  updates AS (
    SELECT 
      ledger_id,
      user_id,
      wallet_address,
      daily_roi_atomic,
      CASE 
        WHEN (accumulated_roi_atomic + daily_roi_atomic) > max_roi_atomic 
        THEN (max_roi_atomic - accumulated_roi_atomic)
        ELSE daily_roi_atomic
      END AS actual_roi_atomic,
      CASE 
        WHEN (accumulated_roi_atomic + daily_roi_atomic) >= max_roi_atomic 
        THEN 'completed'
        ELSE 'active'
      END AS new_status
    FROM roi_calculations
  ),
  ledger_updates AS (
    UPDATE roi_ledger rl
    SET 
      accumulated_roi_atomic = accumulated_roi_atomic + u.actual_roi_atomic,
      status = u.new_status,
      last_calculated_date = CURRENT_DATE,
      updated_at = NOW()
    FROM updates u
    WHERE rl.id = u.ledger_id
    RETURNING rl.id, u.user_id, u.wallet_address, u.actual_roi_atomic
  ),
  balance_updates AS (
    INSERT INTO user_balances (user_id, wallet_address, total_roi_earned_atomic, claimable_balance_atomic)
    SELECT 
      user_id,
      wallet_address,
      SUM(actual_roi_atomic) as total_roi,
      SUM(actual_roi_atomic) as claimable
    FROM ledger_updates
    GROUP BY user_id, wallet_address
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      total_roi_earned_atomic = user_balances.total_roi_earned_atomic + EXCLUDED.total_roi_earned_atomic,
      claimable_balance_atomic = user_balances.claimable_balance_atomic + EXCLUDED.claimable_balance_atomic,
      updated_at = NOW()
    RETURNING user_id, total_roi_earned_atomic
  ),
  ledger_entries AS (
    INSERT INTO ledger (user_id, type, token, amount, amount_atomic, status, ref_type, meta)
    SELECT 
      u.user_id,
      'DAILY_ROI',
      'USDT',
      (u.actual_roi_atomic / 1000000000000000000.0)::NUMERIC(38,18),
      u.actual_roi_atomic,
      'COMPLETED',
      'roi_ledger',
      jsonb_build_object('date', CURRENT_DATE)
    FROM ledger_updates u
  )
  SELECT 
    COUNT(*)::BIGINT,
    COALESCE(SUM(total_roi_earned_atomic), 0)::NUMERIC
  INTO v_count, v_total
  FROM balance_updates;

  RETURN QUERY SELECT v_count, v_total;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 12. UPDATE MLM TREE FUNCTION
-- ============================================
DROP FUNCTION IF EXISTS credit_mlm_tree(text, uuid, BIGINT);

CREATE OR REPLACE FUNCTION credit_mlm_tree(
  p_referrer_wallet text,
  p_deposit_id uuid,
  p_deposit_amount_atomic NUMERIC
)
RETURNS TABLE(
  level INT,
  upline_wallet TEXT,
  commission_amount_atomic NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE upline_tree AS (
    -- Base: direct sponsor
    SELECT 
      u.wallet_address,
      u.sponsor_id,
      1 AS lvl
    FROM users u
    WHERE u.wallet_address = p_referrer_wallet
    
    UNION ALL
    
    -- Recursive: climb up to 7 levels
    SELECT 
      u.wallet_address,
      u.sponsor_id,
      ut.lvl + 1
    FROM users u
    INNER JOIN upline_tree ut ON u.id = ut.sponsor_id
    WHERE ut.lvl < 7
  ),
  commissions AS (
    SELECT 
      ut.lvl AS level,
      ut.wallet_address,
      rc.commission_rate_bps,
      (p_deposit_amount_atomic * rc.commission_rate_bps / 10000) AS commission_atomic
    FROM upline_tree ut
    INNER JOIN reward_config rc ON rc.config_type = 'mlm_level' AND rc.level = ut.lvl
    WHERE rc.is_active = TRUE
  ),
  inserted_commissions AS (
    INSERT INTO mlm_commissions (
      wallet_address,
      referred_wallet,
      level,
      deposit_amount_atomic,
      commission_rate_bps,
      commission_amount_atomic,
      deposit_id,
      status
    )
    SELECT 
      c.wallet_address,
      p_referrer_wallet,
      c.level,
      p_deposit_amount_atomic,
      c.commission_rate_bps,
      c.commission_atomic,
      p_deposit_id,
      'credited'
    FROM commissions c
    RETURNING level, wallet_address AS upline_wallet, commission_amount_atomic
  )
  SELECT * FROM inserted_commissions
  ORDER BY level;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 13. RECREATE MATERIALIZED VIEW
-- ============================================
CREATE MATERIALIZED VIEW user_direct_referrals AS
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

CREATE UNIQUE INDEX idx_user_direct_referrals_user_id 
ON user_direct_referrals(user_id);

COMMIT;
