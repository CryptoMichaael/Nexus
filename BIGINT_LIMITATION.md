# 🚨 CRITICAL: BIGINT PRECISION LIMITATION

## Issue
PostgreSQL BIGINT maximum value is **2^63-1 = 9,223,372,036,854,775,807** (~9.2 × 10^18).

With 18-decimal precision (1 USDT = 10^18 atomic units):
- **Maximum storable value: ~9.2 USDT**
- **Minimum deposit requirement ($100): EXCEEDS BIGINT MAX**

## Current Workaround
- Migration uses **1 USDT** minimum deposit instead of $100
- System will function but rank requirements are artificially low

## Production Fix Required
**Before mainnet deployment**, migrate all `*_atomic` columns from `BIGINT` to `NUMERIC`:

### Migration Script (006_fix_bigint_to_numeric.sql)
```sql
BEGIN;

-- Deposits
ALTER TABLE deposits 
  ALTER COLUMN amount_atomic TYPE NUMERIC USING amount_atomic::NUMERIC;

-- Ledger
ALTER TABLE ledger 
  ALTER COLUMN amount_atomic TYPE NUMERIC USING amount_atomic::NUMERIC;

-- User Balances
ALTER TABLE user_balances 
  ALTER COLUMN total_deposited_atomic TYPE NUMERIC USING total_deposited_atomic::NUMERIC,
  ALTER COLUMN total_roi_earned_atomic TYPE NUMERIC USING total_roi_earned_atomic::NUMERIC,
  ALTER COLUMN total_mlm_earned_atomic TYPE NUMERIC USING total_mlm_earned_atomic::NUMERIC,
  ALTER COLUMN claimable_balance_atomic TYPE NUMERIC USING claimable_balance_atomic::NUMERIC,
  ALTER COLUMN total_withdrawn_atomic TYPE NUMERIC USING total_withdrawn_atomic::NUMERIC;

-- ROI Ledger
ALTER TABLE roi_ledger 
  ALTER COLUMN principal_atomic TYPE NUMERIC USING principal_atomic::NUMERIC,
  ALTER COLUMN max_roi_atomic TYPE NUMERIC USING max_roi_atomic::NUMERIC,
  ALTER COLUMN accumulated_roi_atomic TYPE NUMERIC USING accumulated_roi_atomic::NUMERIC;

-- MLM Commissions
ALTER TABLE mlm_commissions 
  ALTER COLUMN deposit_amount_atomic TYPE NUMERIC USING deposit_amount_atomic::NUMERIC,
  ALTER COLUMN commission_amount_atomic TYPE NUMERIC USING commission_amount_atomic::NUMERIC;

-- Withdrawals
ALTER TABLE withdrawals 
  ALTER COLUMN amount_atomic TYPE NUMERIC USING amount_atomic::NUMERIC;

-- Weekly Rank Pools
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

-- Weekly Rank Rewards
ALTER TABLE weekly_rank_rewards 
  ALTER COLUMN individual_share_atomic TYPE NUMERIC USING individual_share_atomic::NUMERIC;

-- Reward Config
ALTER TABLE reward_config 
  ALTER COLUMN min_deposit_atomic TYPE NUMERIC USING min_deposit_atomic::NUMERIC;

-- Update min deposit to $100 (now safe with NUMERIC)
UPDATE reward_config 
SET min_deposit_atomic = 100000000000000000000 -- 100 * 10^18
WHERE config_type = 'rank' AND rank_level = 1;

COMMIT;
```

### TypeScript Changes
Update `bigintMath.ts`:
```typescript
// Change all BIGINT return types to NUMERIC
// PostgreSQL driver returns NUMERIC as string automatically
export function toAtomic(usdtAmount: string): string {
  // Return string instead of bigint
}

export function fromAtomic(atomic: string | bigint): string {
  const atomicStr = typeof atomic === 'bigint' ? atomic.toString() : atomic
  // ...
}
```

## Impact
- ✅ **Testnet**: Works with $1 minimum (for testing)
- ❌ **Production**: MUST apply NUMERIC migration before accepting real deposits

## Testing Checklist
- [ ] Apply 006_fix_bigint_to_numeric.sql migration
- [ ] Test deposit of $100 USDT
- [ ] Test deposit of $1,000 USDT
- [ ] Verify rank qualification with $100 minimum
- [ ] Test weekly pool calculation with large ecosystem volume

## Alternative Solution
Use **6-decimal precision** (actual USDT decimals on BSC):
- 1 USDT = 10^6 atomic units = 1,000,000
- $100 = 100 million (fits in BIGINT)
- Maximum value: ~9.2 trillion USDT ✅

This would require:
1. Change `USDT_DECIMALS = 6n` in bigintMath.ts
2. Update all existing atomic values (divide by 10^12)
3. Keep BIGINT columns

**Recommendation:** Use NUMERIC for flexibility and precision consistency with blockchain standards.
