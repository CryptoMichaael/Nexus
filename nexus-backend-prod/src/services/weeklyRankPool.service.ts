/**
 * Weekly Rank Pool Calculator Worker
 * Runs every Sunday at 00:00 UTC to distribute weekly pool rewards
 * 
 * Pool: 0.3% of total ecosystem deposits
 * Distribution: L1: 35%, L2: 25%, L3: 16%, L4: 10%, L5: 7%, L6: 4%, L7: 3%
 */

import { Pool } from 'pg'
import { logger } from '../config/logger'
import { fromAtomic, toAtomic } from '../utils/bigintMath'

export interface WeeklyPoolCalculation {
  poolId: bigint
  weekStartDate: string
  weekEndDate: string
  totalDeposits: bigint
  poolSize: bigint
  distributions: {
    [key: string]: {
      shareAtomic: bigint
      holders: number
      perUserAtomic: bigint
    }
  }
}

export class WeeklyRankPoolService {
  constructor(private pool: Pool) {}

  /**
   * Calculate and distribute weekly rank pool
   * Should be called every Sunday at 00:00 UTC
   */
  async calculateAndDistributePool(): Promise<WeeklyPoolCalculation | null> {
    const client = await this.pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Get current week dates (Monday to Sunday)
      const now = new Date()
      const weekStart = this.getWeekStart(now)
      const weekEnd = this.getWeekEnd(weekStart)
      
      logger.info({
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString()
      }, 'Calculating weekly rank pool')
      
      // Check if pool already calculated for this week
      const existingPool = await client.query(
        'SELECT id FROM weekly_rank_pools WHERE week_start_date = $1',
        [weekStart.toISOString().split('T')[0]]
      )
      
      if (existingPool.rows.length > 0) {
        logger.warn({ weekStart }, 'Weekly pool already calculated for this week')
        return null
      }
      
      // Get total ecosystem deposits
      const depositsResult = await client.query(
        'SELECT COALESCE(SUM(total_deposited_atomic), 0) as total FROM user_balances'
      )
      const totalDepositsAtomic = BigInt(depositsResult.rows[0].total)
      
      // Calculate pool: 0.3% of total deposits (30 basis points)
      const poolSizeAtomic = (totalDepositsAtomic * BigInt(30)) / BigInt(10000)
      
      logger.info({
        totalDeposits: fromAtomic(totalDepositsAtomic),
        poolSize: fromAtomic(poolSizeAtomic)
      }, 'Pool calculated')
      
      // Get rank holders count
      const holdersResult = await client.query(
        `SELECT 
          current_rank,
          COUNT(*) as holder_count
        FROM users
        WHERE current_rank > 0
        GROUP BY current_rank`
      )
      
      const holdersByRank: { [key: number]: number } = {}
      holdersResult.rows.forEach(row => {
        holdersByRank[row.current_rank] = parseInt(row.holder_count)
      })
      
      // Get pool share percentages
      const sharesResult = await client.query(
        `SELECT rank_level, pool_share_percent
         FROM reward_config
         WHERE config_type = 'rank'
         ORDER BY rank_level ASC`
      )
      
      // Calculate distribution per rank
      const distributions: WeeklyPoolCalculation['distributions'] = {}
      
      for (const shareRow of sharesResult.rows) {
        const rankLevel = shareRow.rank_level
        const sharePercent = parseFloat(shareRow.pool_share_percent)
        const holders = holdersByRank[rankLevel] || 0
        
        // Calculate this rank's share of pool
        const shareAtomic = (poolSizeAtomic * BigInt(Math.floor(sharePercent * 100))) / BigInt(10000)
        
        // Calculate per-user amount (divide equally among holders)
        const perUserAtomic = holders > 0 ? shareAtomic / BigInt(holders) : BigInt(0)
        
        distributions[`L${rankLevel}`] = {
          shareAtomic,
          holders,
          perUserAtomic
        }
        
        logger.info({
          rank: `L${rankLevel}`,
          sharePercent,
          holders,
          shareAmount: fromAtomic(shareAtomic),
          perUser: fromAtomic(perUserAtomic)
        }, 'Rank distribution calculated')
      }
      
      // Create pool record
      const poolResult = await client.query(
        `INSERT INTO weekly_rank_pools (
          week_start_date, week_end_date,
          total_ecosystem_deposits_atomic, pool_size_atomic,
          l1_share_atomic, l2_share_atomic, l3_share_atomic, l4_share_atomic,
          l5_share_atomic, l6_share_atomic, l7_share_atomic,
          l1_holders, l2_holders, l3_holders, l4_holders,
          l5_holders, l6_holders, l7_holders,
          status, calculated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16, $17, $18, 'calculated', now()
        ) RETURNING id`,
        [
          weekStart.toISOString().split('T')[0],
          weekEnd.toISOString().split('T')[0],
          totalDepositsAtomic.toString(),
          poolSizeAtomic.toString(),
          distributions.L1.shareAtomic.toString(),
          distributions.L2.shareAtomic.toString(),
          distributions.L3.shareAtomic.toString(),
          distributions.L4.shareAtomic.toString(),
          distributions.L5.shareAtomic.toString(),
          distributions.L6.shareAtomic.toString(),
          distributions.L7.shareAtomic.toString(),
          distributions.L1.holders,
          distributions.L2.holders,
          distributions.L3.holders,
          distributions.L4.holders,
          distributions.L5.holders,
          distributions.L6.holders,
          distributions.L7.holders
        ]
      )
      
      const poolId = BigInt(poolResult.rows[0].id)
      
      // Create individual reward records for each ranked user
      let totalRewardsCreated = 0
      
      for (let rankLevel = 1; rankLevel <= 7; rankLevel++) {
        const dist = distributions[`L${rankLevel}`]
        
        if (dist.holders === 0 || dist.perUserAtomic === BigInt(0)) {
          continue
        }
        
        // Get all users at this rank
        const usersResult = await client.query(
          `SELECT id, wallet_address FROM users WHERE current_rank = $1`,
          [rankLevel]
        )
        
        // Create reward record for each user
        for (const user of usersResult.rows) {
          await client.query(
            `INSERT INTO weekly_rank_rewards (
              pool_id, user_id, wallet_address,
              rank_level, rank_name,
              total_rank_holders, individual_share_atomic,
              status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
            [
              poolId.toString(),
              user.id,
              user.wallet_address,
              rankLevel,
              `L${rankLevel}`,
              dist.holders,
              dist.perUserAtomic.toString()
            ]
          )
          
          totalRewardsCreated++
        }
      }
      
      logger.info({
        poolId: poolId.toString(),
        totalRewardsCreated,
        poolSize: fromAtomic(poolSizeAtomic)
      }, 'Weekly pool rewards created')
      
      await client.query('COMMIT')
      
      return {
        poolId,
        weekStartDate: weekStart.toISOString().split('T')[0],
        weekEndDate: weekEnd.toISOString().split('T')[0],
        totalDeposits: totalDepositsAtomic,
        poolSize: poolSizeAtomic,
        distributions
      }
    } catch (err) {
      await client.query('ROLLBACK')
      logger.error({ err }, 'Failed to calculate weekly pool')
      throw err
    } finally {
      client.release()
    }
  }

  /**
   * Credit pending weekly rewards to users
   * This moves rewards from 'pending' to user balances
   */
  async creditPendingRewards(poolId?: bigint): Promise<number> {
    const client = await this.pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Get pending rewards (optionally filter by pool_id)
      const query = poolId
        ? 'SELECT * FROM weekly_rank_rewards WHERE status = $1 AND pool_id = $2'
        : 'SELECT * FROM weekly_rank_rewards WHERE status = $1'
      
      const params = poolId ? ['pending', poolId.toString()] : ['pending']
      
      const rewardsResult = await client.query(query, params)
      
      let credited = 0
      
      for (const reward of rewardsResult.rows) {
        // Create ledger entry
        const ledgerResult = await client.query(
          `INSERT INTO ledger (
            user_id, type, token, amount_atomic, status,
            ref_type, ref_id, meta
          ) VALUES ($1, 'WEEKLY_RANK', 'USDT', $2, 'COMPLETED', 'weekly_rank_reward', $3, $4)
          RETURNING id`,
          [
            reward.user_id,
            reward.individual_share_atomic,
            reward.id,
            JSON.stringify({
              poolId: reward.pool_id,
              rankLevel: reward.rank_level,
              rankName: reward.rank_name
            })
          ]
        )
        
        const ledgerId = ledgerResult.rows[0].id
        
        // Update user balance
        await client.query(
          `INSERT INTO user_balances (
            user_id, wallet_address, claimable_balance_atomic
          ) VALUES ($1, $2, $3)
          ON CONFLICT (user_id) DO UPDATE
          SET claimable_balance_atomic = user_balances.claimable_balance_atomic + $3,
              updated_at = now()`,
          [reward.user_id, reward.wallet_address, reward.individual_share_atomic]
        )
        
        // Mark reward as credited
        await client.query(
          `UPDATE weekly_rank_rewards
           SET status = 'credited', credited_at = now(), ledger_id = $1
           WHERE id = $2`,
          [ledgerId, reward.id]
        )
        
        credited++
      }
      
      // Update pool status if all rewards credited
      if (poolId) {
        await client.query(
          `UPDATE weekly_rank_pools
           SET status = 'distributed', distributed_at = now()
           WHERE id = $1`,
          [poolId.toString()]
        )
      }
      
      await client.query('COMMIT')
      
      logger.info({ credited, poolId: poolId?.toString() }, 'Weekly rewards credited')
      
      return credited
    } catch (err) {
      await client.query('ROLLBACK')
      logger.error({ err, poolId }, 'Failed to credit weekly rewards')
      throw err
    } finally {
      client.release()
    }
  }

  /**
   * Get week start (Monday 00:00:00 UTC)
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date)
    const day = d.getUTCDay()
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
    d.setUTCDate(diff)
    d.setUTCHours(0, 0, 0, 0)
    return d
  }

  /**
   * Get week end (Sunday 23:59:59 UTC)
   */
  private getWeekEnd(weekStart: Date): Date {
    const d = new Date(weekStart)
    d.setUTCDate(d.getUTCDate() + 6)
    d.setUTCHours(23, 59, 59, 999)
    return d
  }

  /**
   * Get pool history (for admin dashboard)
   */
  async getPoolHistory(limit: number = 10) {
    const client = await this.pool.connect()
    
    try {
      const result = await client.query(
        `SELECT 
          id, week_start_date, week_end_date,
          total_ecosystem_deposits_atomic, pool_size_atomic,
          l1_holders, l2_holders, l3_holders, l4_holders,
          l5_holders, l6_holders, l7_holders,
          status, calculated_at, distributed_at
        FROM weekly_rank_pools
        ORDER BY week_start_date DESC
        LIMIT $1`,
        [limit]
      )
      
      return result.rows
    } catch (err) {
      logger.error({ err }, 'Failed to get pool history')
      throw err
    } finally {
      client.release()
    }
  }
}
