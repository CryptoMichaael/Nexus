/**
 * Weekly Rank Pool Worker
 * Runs every Sunday at 00:00 UTC
 * Calculates 0.3% pool and distributes to ranked users
 */

import { Pool } from 'pg'
import { logger } from '../config/logger'
import { WeeklyRankPoolService } from '../services/weeklyRankPool.service'
import { envServer } from '../config/envServer'

const pool = new Pool({ connectionString: envServer.DATABASE_URL })
const weeklyPoolService = new WeeklyRankPoolService(pool)

async function runWeeklyPool() {
  try {
    logger.info('🏆 Starting weekly rank pool calculation...')
    
    // Calculate pool
    const calculation = await weeklyPoolService.calculateAndDistributePool()
    
    if (!calculation) {
      logger.info('Weekly pool already calculated for this week')
      return
    }
    
    logger.info({
      poolId: calculation.poolId.toString(),
      weekStart: calculation.weekStartDate,
      poolSize: calculation.poolSize.toString()
    }, '✅ Weekly pool calculated')
    
    // Credit rewards immediately
    const credited = await weeklyPoolService.creditPendingRewards(calculation.poolId)
    
    logger.info({
      credited,
      poolId: calculation.poolId.toString()
    }, '✅ Weekly rewards credited to users')
    
    // Log summary
    Object.entries(calculation.distributions).forEach(([rank, dist]) => {
      if (dist.holders > 0) {
        logger.info({
          rank,
          holders: dist.holders,
          totalShare: dist.shareAtomic.toString(),
          perUser: dist.perUserAtomic.toString()
        }, `${rank} distribution complete`)
      }
    })
    
    process.exit(0)
  } catch (err) {
    logger.error({ err }, '❌ Weekly pool calculation failed')
    process.exit(1)
  }
}

// Run immediately
runWeeklyPool()
