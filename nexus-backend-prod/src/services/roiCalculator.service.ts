/**
 * ✅ ROI CALCULATOR SERVICE
 * Database-driven daily ROI calculations
 */

import { Pool, PoolClient } from 'pg';
import { logger } from '../config/logger';
import { fromAtomic, dbToBigInt } from '../utils/bigintMath';

export class ROICalculatorService {
  constructor(private pool: Pool) {}

  /**
   * Calculate daily ROI for all active deposits
   * Uses PostgreSQL function for batch processing
   */
  async calculateDailyROI(): Promise<{
    processedCount: number;
    totalROICredited: string;
  }> {
    const client: PoolClient = await this.pool.connect();

    try {
      await client.query('BEGIN');

      logger.info('Starting daily ROI calculation...');

      // ✅ Call PostgreSQL function that handles all calculations
      const result = await client.query(`
        SELECT * FROM calculate_daily_roi()
      `);

      const row = result.rows[0];
      const processedCount = parseInt(row.processed_count || '0');
      const totalROIAtomic = dbToBigInt(row.total_roi_credited);

      await client.query('COMMIT');

      logger.info({
        processedCount,
        totalROI: fromAtomic(totalROIAtomic)
      }, 'Daily ROI calculation completed');

      return {
        processedCount,
        totalROICredited: fromAtomic(totalROIAtomic)
      };

    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error({ err: error }, 'Daily ROI calculation failed');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get ROI configuration from database
   */
  async getROIConfig(): Promise<{
    dailyRateBps: number;
    standardCapPercent: number;
    rankedCapPercent: number;
  } | null> {
    const result = await this.pool.query(`
      SELECT daily_rate_bps, standard_cap_percent, ranked_cap_percent
      FROM reward_config
      WHERE config_type = 'roi' AND is_active = TRUE
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return null;
    }

    const config = result.rows[0];
    return {
      dailyRateBps: config.daily_rate_bps,
      standardCapPercent: config.standard_cap_percent,
      rankedCapPercent: config.ranked_cap_percent
    };
  }

  /**
   * Get ROI status for a specific user
   */
  async getUserROIStatus(walletAddress: string): Promise<{
    activeDeposits: number;
    totalPrincipal: string;
    totalAccumulatedROI: string;
    totalMaxROI: string;
    deposits: Array<{
      depositId: string;
      principal: string;
      accumulated: string;
      maxROI: string;
      status: string;
      dailyRate: number;
      startDate: string;
      lastCalculated: string | null;
    }>;
  }> {
    const result = await this.pool.query(`
      SELECT 
        id,
        deposit_id,
        principal_atomic,
        accumulated_roi_atomic,
        max_roi_atomic,
        status,
        daily_rate_bps,
        start_date,
        last_calculated_date
      FROM roi_ledger
      WHERE wallet_address = $1
      ORDER BY created_at DESC
    `, [walletAddress.toLowerCase()]);

    const deposits = result.rows.map((row: any) => ({
      depositId: row.deposit_id,
      principal: fromAtomic(dbToBigInt(row.principal_atomic)),
      accumulated: fromAtomic(dbToBigInt(row.accumulated_roi_atomic)),
      maxROI: fromAtomic(dbToBigInt(row.max_roi_atomic)),
      status: row.status,
      dailyRate: row.daily_rate_bps / 100, // Convert bps to percent
      startDate: row.start_date,
      lastCalculated: row.last_calculated_date
    }));

    const activeDeposits = deposits.filter(d => d.status === 'active').length;
    
    const totalPrincipal = deposits.reduce((sum, d) => 
      sum + dbToBigInt(d.principal), 0n
    );
    
    const totalAccumulated = deposits.reduce((sum, d) => 
      sum + dbToBigInt(d.accumulated), 0n
    );
    
    const totalMax = deposits.reduce((sum, d) => 
      sum + dbToBigInt(d.maxROI), 0n
    );

    return {
      activeDeposits,
      totalPrincipal: fromAtomic(totalPrincipal),
      totalAccumulatedROI: fromAtomic(totalAccumulated),
      totalMaxROI: fromAtomic(totalMax),
      deposits
    };
  }
}
