/**
 * Rank System Service
 * Handles MLM rank qualification checking and upgrades
 */

import { Pool } from 'pg'
import { logger } from '../config/logger'

export interface RankProgress {
  currentRank: number
  currentRankName: string
  nextRank: number | null
  nextRankName: string | null
  requiredDirects: number | null
  requiredRankOfDirects: number | null
  currentQualifiedDirects: number
  progressPercent: number
}

export interface RankUpgradeResult {
  newRank: number
  rankName: string
  upgraded: boolean
}

export interface QualifiedDirect {
  userId: string
  walletAddress: string
  currentRank: number
  totalDeposited: string
  isQualified: boolean
}

export class RankService {
  constructor(private pool: Pool) {}

  /**
   * Check and upgrade user rank after deposit
   * Called automatically when a $100+ deposit is processed
   */
  async checkAndUpgradeRank(userId: string): Promise<RankUpgradeResult> {
    const client = await this.pool.connect()
    
    try {
      // Refresh materialized view for latest data
      await client.query('SELECT refresh_user_direct_referrals()')
      
      // Call rank checker function
      const result = await client.query(
        'SELECT * FROM check_and_upgrade_rank($1)',
        [userId]
      )
      
      if (result.rows.length === 0) {
        return { newRank: 0, rankName: 'Unranked', upgraded: false }
      }
      
      const { new_rank, rank_name, upgraded } = result.rows[0]
      
      if (upgraded && new_rank > 0) {
        logger.info({
          userId,
          newRank: new_rank,
          rankName: rank_name
        }, 'User rank upgraded')
      }
      
      return {
        newRank: new_rank,
        rankName: rank_name,
        upgraded
      }
    } catch (err) {
      logger.error({ err, userId }, 'Failed to check/upgrade rank')
      throw err
    } finally {
      client.release()
    }
  }

  /**
   * Get user's current rank progress toward next rank
   */
  async getRankProgress(userId: string): Promise<RankProgress> {
    const client = await this.pool.connect()
    
    try {
      const result = await client.query(
        'SELECT * FROM get_rank_progress($1)',
        [userId]
      )
      
      if (result.rows.length === 0) {
        return {
          currentRank: 0,
          currentRankName: 'Unranked',
          nextRank: 1,
          nextRankName: 'L1',
          requiredDirects: 5,
          requiredRankOfDirects: null,
          currentQualifiedDirects: 0,
          progressPercent: 0
        }
      }
      
      const row = result.rows[0]
      
      return {
        currentRank: row.current_rank,
        currentRankName: row.current_rank_name,
        nextRank: row.next_rank,
        nextRankName: row.next_rank_name,
        requiredDirects: row.required_directs,
        requiredRankOfDirects: row.required_rank_of_directs,
        currentQualifiedDirects: row.current_qualified_directs,
        progressPercent: parseFloat(row.progress_percent)
      }
    } catch (err) {
      logger.error({ err, userId }, 'Failed to get rank progress')
      throw err
    } finally {
      client.release()
    }
  }

  /**
   * Get detailed list of direct referrals with qualification status
   */
  async getQualifiedDirects(userId: string): Promise<QualifiedDirect[]> {
    const client = await this.pool.connect()
    
    try {
      // Get min deposit requirement
      const configResult = await client.query(
        `SELECT min_deposit_atomic FROM reward_config 
         WHERE config_type = 'rank' AND rank_level = 1`
      )
      const minDepositAtomic = configResult.rows[0]?.min_deposit_atomic || '100000000000000000000'
      
      // Get user's next rank requirement
      const userResult = await client.query(
        'SELECT current_rank FROM users WHERE id = $1',
        [userId]
      )
      const currentRank = userResult.rows[0]?.current_rank || 0
      const nextRank = currentRank + 1
      
      // Get required rank of directs for next level
      const reqResult = await client.query(
        `SELECT required_direct_rank FROM reward_config 
         WHERE config_type = 'rank' AND rank_level = $1`,
        [nextRank]
      )
      const requiredDirectRank = reqResult.rows[0]?.required_direct_rank
      
      // Get all direct referrals
      const result = await client.query(
        `SELECT 
          d.id as user_id,
          d.wallet_address,
          d.current_rank,
          COALESCE(ub.total_deposited_atomic, 0) as total_deposited_atomic
        FROM users u
        JOIN users d ON d.sponsor_id = u.id
        LEFT JOIN user_balances ub ON ub.user_id = d.id
        WHERE u.id = $1
        ORDER BY d.created_at DESC`,
        [userId]
      )
      
      return result.rows.map(row => ({
        userId: row.user_id,
        walletAddress: row.wallet_address,
        currentRank: row.current_rank || 0,
        totalDeposited: row.total_deposited_atomic,
        isQualified: requiredDirectRank === null
          ? BigInt(row.total_deposited_atomic) >= BigInt(minDepositAtomic)
          : row.current_rank >= requiredDirectRank
      }))
    } catch (err) {
      logger.error({ err, userId }, 'Failed to get qualified directs')
      throw err
    } finally {
      client.release()
    }
  }

  /**
   * Get rank requirements for all levels
   */
  async getAllRankRequirements() {
    const client = await this.pool.connect()
    
    try {
      const result = await client.query(
        `SELECT 
          rank_level,
          rank_name,
          required_directs,
          required_direct_rank,
          pool_share_percent,
          min_deposit_atomic
        FROM reward_config
        WHERE config_type = 'rank'
        ORDER BY rank_level ASC`
      )
      
      return result.rows
    } catch (err) {
      logger.error({ err }, 'Failed to get rank requirements')
      throw err
    } finally {
      client.release()
    }
  }

  /**
   * Manual rank upgrade (Admin only)
   */
  async manualUpgradeRank(userId: string, targetRank: number, adminId: string): Promise<boolean> {
    const client = await this.pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Validate target rank
      if (targetRank < 0 || targetRank > 7) {
        throw new Error('Invalid rank level')
      }
      
      // Update user rank
      await client.query(
        `UPDATE users 
         SET current_rank = $1, 
             reward_cap = CASE WHEN $1 > 0 THEN 300 ELSE 200 END,
             rank_updated_at = now()
         WHERE id = $2`,
        [targetRank, userId]
      )
      
      // Update ROI ledgers if upgrading to ranked
      if (targetRank > 0) {
        await client.query(
          `UPDATE roi_ledger
           SET max_roi_atomic = (principal_atomic * 3),
               reward_cap_percent = 300,
               is_rank_boosted = TRUE
           WHERE user_id = $1 AND status = 'active'`,
          [userId]
        )
      }
      
      // Log admin action
      logger.warn({
        adminId,
        userId,
        targetRank,
        action: 'MANUAL_RANK_UPGRADE'
      }, 'Admin manually upgraded user rank')
      
      await client.query('COMMIT')
      return true
    } catch (err) {
      await client.query('ROLLBACK')
      logger.error({ err, userId, targetRank, adminId }, 'Failed to manually upgrade rank')
      throw err
    } finally {
      client.release()
    }
  }

  /**
   * Get rank statistics (for admin dashboard)
   */
  async getRankStatistics() {
    const client = await this.pool.connect()
    
    try {
      const result = await client.query(
        `SELECT 
          current_rank,
          COUNT(*) as user_count,
          SUM(CASE WHEN reward_cap = 300 THEN 1 ELSE 0 END) as ranked_count
        FROM users
        GROUP BY current_rank
        ORDER BY current_rank DESC`
      )
      
      return result.rows
    } catch (err) {
      logger.error({ err }, 'Failed to get rank statistics')
      throw err
    } finally {
      client.release()
    }
  }
}
