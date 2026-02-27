-- 004_mlm_tree_function.sql
-- ✅ OPTIMIZED MLM TREE WITH RECURSIVE CTE

BEGIN;

-- ============================================
-- MLM Tree Credit Function (Single Query)
-- ============================================
CREATE OR REPLACE FUNCTION credit_mlm_tree(
  p_wallet_address text,
  p_deposit_id uuid,
  p_deposit_amount_atomic BIGINT
) RETURNS TABLE(
  level INT,
  upline_wallet text,
  commission_atomic BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE upline_tree AS (
    -- ✅ Base case: Find direct sponsor
    SELECT 
      u.wallet_address AS upline_wallet,
      u.id AS upline_id,
      1 AS level,
      rc.commission_rate_bps
    FROM users u
    INNER JOIN users referred ON referred.sponsor_id = u.id
    INNER JOIN reward_config rc ON rc.level = 1 AND rc.config_type = 'mlm_level' AND rc.is_active = TRUE
    WHERE referred.wallet_address = p_wallet_address
    
    UNION ALL
    
    -- ✅ Recursive case: Walk up 7 levels
    SELECT 
      u.wallet_address AS upline_wallet,
      u.id AS upline_id,
      ut.level + 1 AS level,
      rc.commission_rate_bps
    FROM upline_tree ut
    INNER JOIN users u ON u.id = (
      SELECT sponsor_id FROM users WHERE id = ut.upline_id
    )
    INNER JOIN reward_config rc ON rc.level = (ut.level + 1) AND rc.config_type = 'mlm_level' AND rc.is_active = TRUE
    WHERE ut.level < 7 -- ✅ Stop at level 7
  ),
  commissions AS (
    SELECT 
      level,
      upline_wallet,
      commission_rate_bps,
      (p_deposit_amount_atomic * commission_rate_bps / 10000) AS commission_atomic
    FROM upline_tree
  )
  -- ✅ Insert all commissions in one atomic operation
  INSERT INTO mlm_commissions (
    wallet_address,
    referred_wallet,
    level,
    deposit_id,
    deposit_amount_atomic,
    commission_rate_bps,
    commission_amount_atomic,
    status,
    created_at
  )
  SELECT 
    upline_wallet,
    p_wallet_address,
    level,
    p_deposit_id,
    p_deposit_amount_atomic,
    commission_rate_bps,
    commission_atomic,
    'credited',
    NOW()
  FROM commissions
  RETURNING level, wallet_address AS upline_wallet, commission_amount_atomic;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Daily ROI Calculation Function
-- ============================================
CREATE OR REPLACE FUNCTION calculate_daily_roi()
RETURNS TABLE(
  processed_count BIGINT,
  total_roi_credited BIGINT
) AS $$
DECLARE
  v_daily_rate_bps INT;
  v_standard_cap INT;
  v_ranked_cap INT;
  v_count BIGINT;
  v_total BIGINT;
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

  -- ✅ Batch process all active ROI ledgers
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
  )
  SELECT 
    COUNT(*)::BIGINT,
    COALESCE(SUM(total_roi_earned_atomic), 0)::BIGINT
  INTO v_count, v_total
  FROM balance_updates;

  RETURN QUERY SELECT v_count, v_total;
END;
$$ LANGUAGE plpgsql;

COMMIT;
