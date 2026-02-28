/**
 * RANK UPGRADE CHECKER WORKER
 * Runs hourly to check all users for rank eligibility
 * Implements 300% cap unlock on rank achievement
 */

import { Pool, PoolClient } from 'pg';
import { pool } from '../db/pool';
import { logger } from '../config/logger';

interface User {
  id: string;
  wallet_address: string;
  current_rank: number;
}

interface RankConfig {
  rank_level: number;
  rank_name: string;
  required_directs: number;
  required_direct_rank: number | null;
  min_deposit_atomic: string;
}

export class RankCheckerWorker {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Main rank checking logic - Run hourly via cron
   * Calculates ranks using PostgreSQL recursive CTEs for performance
   */
  async checkAndUpgradeRanks(): Promise<void> {
    logger.info('🏆 Starting rank upgrade check...');

    const client = await this.pool.connect();
    
    try {
      // Get all users who might be eligible for upgrade
      const usersToCheck = await client.query<User>(`
        SELECT id, wallet_address, current_rank
        FROM users
        WHERE current_rank < 7 -- Max rank is L7
        ORDER BY current_rank ASC
      `);

      logger.info(`Checking ${usersToCheck.rows.length} users for rank upgrades`);

      let upgradedCount = 0;

      for (const user of usersToCheck.rows) {
        const upgraded = await this.checkUserRankEligibility(client, user);
        if (upgraded) upgradedCount++;
      }

      logger.info(`✅ Rank check complete. ${upgradedCount} users upgraded.`);

    } catch (error) {
      logger.error({ error }, '❌ Rank check failed');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if user qualifies for next rank
   * Uses optimized SQL to count qualified directs
   */
  private async checkUserRankEligibility(
    client: PoolClient,
    user: User
  ): Promise<boolean> {
    
    const nextRank = user.current_rank + 1;

    // Get rank requirements from config table
    const rankConfigResult = await client.query<RankConfig>(`
      SELECT 
        rank_level,
        rank_name,
        required_directs,
        required_direct_rank,
        min_deposit_atomic
      FROM reward_config
      WHERE config_type = 'rank' 
        AND rank_level = $1
    `, [nextRank]);

    if (rankConfigResult.rows.length === 0) {
      return false; // No higher rank available
    }

    const config = rankConfigResult.rows[0];

    // Count qualified direct referrals
    const directsCountResult = await client.query(`
      SELECT COUNT(*) as count
      FROM users d
      INNER JOIN user_balances ub ON ub.user_id = d.id
      WHERE d.sponsor_id = $1
        AND ub.total_deposited_atomic >= $2
        ${config.required_direct_rank !== null 
          ? `AND d.current_rank >= ${config.required_direct_rank}` 
          : ''
        }
    `, [user.id, config.min_deposit_atomic]);

    const qualifiedDirects = parseInt(directsCountResult.rows[0].count);

    // Check if user meets requirements
    if (qualifiedDirects >= config.required_directs) {
      await this.upgradeUserRank(client, user, nextRank, config, qualifiedDirects);
      return true;
    }

    return false;
  }

  /**
   * Upgrade user to next rank and unlock 300% cap
   */
  private async upgradeUserRank(
    client: PoolClient,
    user: User,
    newRank: number,
    config: RankConfig,
    qualifiedDirects: number
  ): Promise<void> {
    
    await client.query('BEGIN');
    
    try {
      // Update user rank
      await client.query(`
        UPDATE users
        SET 
          current_rank = $1,
          updated_at = NOW()
        WHERE id = $2
      `, [newRank, user.id]);

      // ✅ CRITICAL: Unlock 300% ROI cap for all active deposits
      if (user.current_rank === 0 && newRank >= 1) {
        await client.query(`
          UPDATE roi_ledger
          SET 
            max_roi_atomic = principal_atomic * 3,
            updated_at = NOW()
          WHERE user_id = $1 
            AND status = 'active'
        `, [user.id]);

        logger.info(`💎 Unlocked 300% cap for user ${user.wallet_address}`);
      }

      // Log rank achievement
      await client.query(`
        INSERT INTO ledger_entries 
        (user_id, entry_type, amount_atomic, description, source_type, created_at)
        VALUES ($1, 'info', 0, $2, 'rank_achievement', NOW())
      `, [
        user.id,
        `Achieved ${config.rank_name} with ${qualifiedDirects} qualified directs`,
      ]);

      await client.query('COMMIT');
      
      logger.info(
        `✅ User ${user.wallet_address} upgraded to ${config.rank_name} ` +
        `(${qualifiedDirects}/${config.required_directs} directs)`
      );

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({ error, userId: user.id }, '❌ Failed to upgrade user');
      throw error;
    }
  }
}

/**
 * Cron job entry point
 * Schedule with: 0 * * * * (every hour)
 */
export async function runRankChecker(): Promise<void> {
  logger.info('🚀 Rank Checker Worker started');
  
  const worker = new RankCheckerWorker(pool);
  
  try {
    await worker.checkAndUpgradeRanks();
    logger.info('✅ Rank Checker Worker completed successfully');
  } catch (error) {
    logger.error({ error }, '❌ Rank Checker Worker failed');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runRankChecker().then(() => {
    process.exit(0);
  });
}
