/**
 * ✅ SECURE DEPOSIT PROCESSOR SERVICE
 * - Idempotent processing with ON CONFLICT DO NOTHING
 * - BigInt atomic unit handling
 * - Database-level double-spend prevention
 * - Optimized MLM tree crediting
 */

import { Pool, PoolClient } from 'pg';
import { logger } from '../../config/logger';
import { toAtomic, fromAtomic, dbToBigInt, bigIntToDb } from '../../utils/bigintMath';
import { RankService } from '../rank.service';

const VALID_TOKENS = ['USDT', 'ETH'];
const MIN_DEPOSIT_FOR_RANK = toAtomic('100'); // $100 minimum

export interface DepositData {
  txHash: string;
  walletAddress: string;
  tokenSymbol: string;
  amount: string; // Human-readable amount (e.g., "100.5")
  amountAtomic?: string; // Atomic units (optional, will be calculated)
  fromAddress?: string;
  toAddress?: string;
  blockNumber?: number;
  timestamp?: number;
  chainId?: number;
}

export interface DepositResult {
  success: boolean;
  isNewDeposit: boolean;
  depositId?: string;
  message?: string;
}

export class DepositProcessorService {
  private rankService: RankService;
  
  constructor(private pool: Pool) {
    this.rankService = new RankService(pool);
  }

  /**
   * ✅ SECURE: Idempotent deposit processing with database-level uniqueness
   */
  async processDeposit(depositData: DepositData): Promise<DepositResult> {
    if (!depositData.txHash) {
      throw new Error('txHash is required');
    }

    if (!VALID_TOKENS.includes(depositData.tokenSymbol)) {
      throw new Error(`Unsupported token: ${depositData.tokenSymbol}`);
    }

    // Convert to atomic units
    const amountAtomic = depositData.amountAtomic 
      ? BigInt(depositData.amountAtomic)
      : toAtomic(depositData.amount);

    if (amountAtomic <= 0n) {
      throw new Error('Amount must be greater than zero');
    }

    const client: PoolClient = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // ✅ Try to INSERT with ON CONFLICT DO NOTHING
      const insertResult = await client.query(`
        INSERT INTO deposits (
          user_id,
          tx_hash,
          token,
          amount,
          amount_atomic,
          from_address,
          to_address,
          block_number,
          status,
          created_at
        )
        VALUES (
          (SELECT id FROM users WHERE wallet_address = $1),
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          'CONFIRMED',
          to_timestamp($9)
        )
        ON CONFLICT (tx_hash) DO NOTHING
        RETURNING id, amount_atomic, user_id
      `, [
        depositData.walletAddress.toLowerCase(),
        depositData.txHash,
        depositData.tokenSymbol,
        depositData.amount,
        bigIntToDb(amountAtomic),
        depositData.fromAddress?.toLowerCase(),
        depositData.toAddress?.toLowerCase(),
        depositData.blockNumber || null,
        depositData.timestamp ? depositData.timestamp / 1000 : Date.now() / 1000
      ]);

      if (insertResult.rows.length === 0) {
        // Deposit already exists - idempotent behavior
        await client.query('COMMIT');
        logger.info({ txHash: depositData.txHash }, 'Duplicate deposit ignored (idempotent)');
        return { success: true, isNewDeposit: false, message: 'Deposit already processed' };
      }

      const deposit = insertResult.rows[0];
      const depositId = deposit.id;
      let userId = deposit.user_id;

      // ✅ Create user if doesn't exist
      if (!userId) {
        const userInsert = await client.query(`
          INSERT INTO users (wallet_address, role, status)
          VALUES ($1, 'USER', 'ACTIVE')
          ON CONFLICT (wallet_address) DO UPDATE SET wallet_address = EXCLUDED.wallet_address
          RETURNING id
        `, [depositData.walletAddress.toLowerCase()]);
        
        userId = userInsert.rows[0].id;

        // Update deposit with user_id
        await client.query(`
          UPDATE deposits SET user_id = $1 WHERE id = $2
        `, [userId, depositId]);
      }

      // ✅ Update user balances atomically
      await client.query(`
        INSERT INTO user_balances (user_id, wallet_address, total_deposited_atomic, claimable_balance_atomic)
        VALUES ($1, $2, $3, $3)
        ON CONFLICT (user_id)
        DO UPDATE SET
          total_deposited_atomic = user_balances.total_deposited_atomic + $3,
          claimable_balance_atomic = user_balances.claimable_balance_atomic + $3,
          updated_at = NOW()
      `, [userId, depositData.walletAddress.toLowerCase(), bigIntToDb(amountAtomic)]);

      // ✅ Create ROI ledger entry
      await this.createROILedger(client, userId, depositData.walletAddress, depositId, amountAtomic);

      // ✅ Credit MLM tree using optimized function
      await this.creditMLMTree(client, depositData.walletAddress, depositId, amountAtomic);

      // ✅ Create ledger entry
      await client.query(`
        INSERT INTO ledger (user_id, type, token, amount, amount_atomic, status, ref_type, ref_id, meta)
        VALUES ($1, 'DEPOSIT', $2, $3, $4, 'COMPLETED', 'deposit', $5, $6)
      `, [
        userId,
        depositData.tokenSymbol,
        depositData.amount,
        bigIntToDb(amountAtomic),
        depositId,
        JSON.stringify({ txHash: depositData.txHash, blockNumber: depositData.blockNumber })
      ]);

      // ✅ Mark deposit as processed
      await client.query(`
        UPDATE deposits SET status = 'SUCCESS', processed_at = NOW() WHERE id = $1
      `, [depositId]);

      await client.query('COMMIT');

      logger.info({
        txHash: depositData.txHash,
        depositId,
        amount: fromAtomic(amountAtomic),
        walletAddress: depositData.walletAddress
      }, 'New deposit processed successfully');

      // ✅ Check and upgrade rank (after commit, separate transaction)
      // Only check if deposit >= $100
      if (amountAtomic >= MIN_DEPOSIT_FOR_RANK) {
        try {
          const rankResult = await this.rankService.checkAndUpgradeRank(userId);
          
          if (rankResult.upgraded && rankResult.newRank > 0) {
            logger.info({
              userId,
              walletAddress: depositData.walletAddress,
              newRank: rankResult.newRank,
              rankName: rankResult.rankName
            }, '🏆 User rank upgraded after deposit');
          }
        } catch (rankErr) {
          // Don't fail deposit if rank check fails
          logger.error({ err: rankErr, userId }, 'Rank check failed after deposit');
        }
      }

      return {
        success: true,
        isNewDeposit: true,
        depositId: depositId.toString()
      };

    } catch (error: any) {
      await client.query('ROLLBACK');

      // ✅ Handle unique constraint violation gracefully
      if (error.code === '23505') { // PostgreSQL unique violation
        logger.warn({ txHash: depositData.txHash }, 'Concurrent deposit attempt blocked by database');
        return { success: true, isNewDeposit: false, message: 'Deposit already processed (race condition prevented)' };
      }

      logger.error({ err: error, txHash: depositData.txHash }, 'Deposit processing failed');
      
      // Try to mark deposit as failed
      try {
        await this.pool.query(`
          UPDATE deposits SET status = 'FAILED', error = $1 WHERE tx_hash = $2
        `, [error.message, depositData.txHash]);
      } catch {}

      throw error;

    } finally {
      client.release();
    }
  }

  /**
   * Create ROI tracking ledger
   */
  private async createROILedger(
    client: PoolClient,
    userId: string,
    walletAddress: string,
    depositId: string,
    amountAtomic: bigint
  ): Promise<void> {
    // Get ROI config
    const configResult = await client.query(`
      SELECT daily_rate_bps, standard_cap_percent, ranked_cap_percent
      FROM reward_config
      WHERE config_type = 'roi' AND is_active = TRUE
      LIMIT 1
    `);

    if (configResult.rows.length === 0) {
      logger.warn('ROI config not found, skipping ROI ledger creation');
      return;
    }

    const config = configResult.rows[0];
    const dailyRateBps = config.daily_rate_bps;

    // Get user rank
    const userResult = await client.query(`
      SELECT current_rank FROM users WHERE id = $1
    `, [userId]);

    const currentRank = userResult.rows[0]?.current_rank || 0;
    const capPercent = currentRank > 0 ? config.ranked_cap_percent : config.standard_cap_percent;

    // Calculate max ROI
    const maxRoiAtomic = (amountAtomic * BigInt(capPercent)) / 100n;

    await client.query(`
      INSERT INTO roi_ledger (
        deposit_id,
        user_id,
        wallet_address,
        principal_atomic,
        max_roi_atomic,
        accumulated_roi_atomic,
        daily_rate_bps,
        status,
        start_date
      ) VALUES ($1, $2, $3, $4, $5, 0, $6, 'active', CURRENT_DATE)
    `, [
      depositId,
      userId,
      walletAddress.toLowerCase(),
      bigIntToDb(amountAtomic),
      bigIntToDb(maxRoiAtomic),
      dailyRateBps
    ]);

    logger.info({
      depositId,
      principal: fromAtomic(amountAtomic),
      maxROI: fromAtomic(maxRoiAtomic),
      capPercent
    }, 'ROI ledger created');
  }

  /**
   * Credit MLM tree using optimized PostgreSQL function
   */
  private async creditMLMTree(
    client: PoolClient,
    walletAddress: string,
    depositId: string,
    amountAtomic: bigint
  ): Promise<void> {
    try {
      // ✅ Single database call handles entire 7-level tree
      const result = await client.query(`
        SELECT * FROM credit_mlm_tree($1, $2, $3)
      `, [
        walletAddress.toLowerCase(),
        depositId,
        bigIntToDb(amountAtomic)
      ]);

      if (result.rows.length > 0) {
        logger.info({
          depositId,
          uplineCount: result.rows.length,
          levels: result.rows.map((r: any) => r.level)
        }, 'MLM tree credited');

        // Update user balances
        for (const row of result.rows) {
          const commissionAtomic = dbToBigInt(row.commission_atomic);
          
          await client.query(`
            INSERT INTO user_balances (
              user_id,
              wallet_address,
              total_mlm_earned_atomic,
              claimable_balance_atomic
            )
            SELECT 
              id,
              $1,
              $2,
              $2
            FROM users
            WHERE wallet_address = $1
            ON CONFLICT (user_id)
            DO UPDATE SET
              total_mlm_earned_atomic = user_balances.total_mlm_earned_atomic + $2,
              claimable_balance_atomic = user_balances.claimable_balance_atomic + $2,
              updated_at = NOW()
          `, [row.upline_wallet, bigIntToDb(commissionAtomic)]);
        }
      } else {
        logger.info({ depositId }, 'No upline found for MLM crediting');
      }
    } catch (error: any) {
      logger.error({ err: error, depositId }, 'MLM tree crediting failed');
      // Don't throw - deposit should still succeed even if MLM fails
    }
  }
}
