/**
 * Rank Routes
 * User rank progress and requirements endpoints
 */

import { FastifyInstance, FastifyRequest } from 'fastify'
import { RankService } from '../../services/rank.service'
import { WeeklyRankPoolService } from '../../services/weeklyRankPool.service'
import { pool } from '../../db/pool'
import { requireAdminMFA } from '../../middlewares/adminAuth'

const rankService = new RankService(pool)
const weeklyPoolService = new WeeklyRankPoolService(pool)

export default async function rankRoutes(fastify: FastifyInstance) {
  
  /**
   * GET /api/ranks/progress
   * Get user's current rank and progress toward next rank
   */
  fastify.get('/progress', {
    onRequest: [fastify.authenticate]
  }, async (request: any, reply) => {
    try {
      const userId = request.user.userId
      
      const progress = await rankService.getRankProgress(userId)
      
      return reply.send({
        success: true,
        data: progress
      })
    } catch (err: any) {
      fastify.log.error({ err }, 'Failed to get rank progress')
      return reply.status(500).send({
        success: false,
        error: 'Failed to get rank progress'
      })
    }
  })

  /**
   * GET /api/ranks/directs
   * Get list of direct referrals with qualification status
   */
  fastify.get('/directs', {
    onRequest: [fastify.authenticate]
  }, async (request: any, reply) => {
    try {
      const userId = request.user.userId
      
      const directs = await rankService.getQualifiedDirects(userId)
      
      return reply.send({
        success: true,
        data: directs
      })
    } catch (err: any) {
      fastify.log.error({ err }, 'Failed to get qualified directs')
      return reply.status(500).send({
        success: false,
        error: 'Failed to get qualified directs'
      })
    }
  })

  /**
   * GET /api/ranks/requirements
   * Get all rank level requirements
   */
  fastify.get('/requirements', async (request, reply) => {
    try {
      const requirements = await rankService.getAllRankRequirements()
      
      return reply.send({
        success: true,
        data: requirements
      })
    } catch (err: any) {
      fastify.log.error({ err }, 'Failed to get rank requirements')
      return reply.status(500).send({
        success: false,
        error: 'Failed to get rank requirements'
      })
    }
  })

  /**
   * GET /api/ranks/pool/history
   * Get weekly pool distribution history
   */
  fastify.get('/pool/history', {
    onRequest: [fastify.authenticate]
  }, async (request: any, reply) => {
    try {
      const history = await weeklyPoolService.getPoolHistory(10)
      
      return reply.send({
        success: true,
        data: history
      })
    } catch (err: any) {
      fastify.log.error({ err }, 'Failed to get pool history')
      return reply.status(500).send({
        success: false,
        error: 'Failed to get pool history'
      })
    }
  })

  /**
   * POST /api/ranks/manual-upgrade (ADMIN ONLY - REQUIRES MFA)
   * Manually upgrade user rank (sensitive operation)
   */
  fastify.post('/manual-upgrade', {
    preHandler: [fastify.authenticate, requireAdminMFA]
  }, async (request: any, reply) => {
    try {
      const { userId, targetRank } = request.body as { userId: string; targetRank: number }
      
      if (!userId || targetRank === undefined) {
        return reply.status(400).send({
          success: false,
          error: 'userId and targetRank are required'
        })
      }
      
      // Log admin action
      fastify.log.warn({
        adminId: request.user.sub,
        targetUserId: userId,
        newRank: targetRank
      }, 'Manual rank upgrade with MFA')
      
      await rankService.manualUpgradeRank(userId, targetRank, request.user.sub)
      
      return reply.send({
        success: true,
        message: 'Rank manually upgraded'
      })
    } catch (err: any) {
      fastify.log.error({ err }, 'Failed to manually upgrade rank')
      return reply.status(500).send({
        success: false,
        error: err.message
      })
    }
  })

  /**
   * GET /api/ranks/stats (ADMIN ONLY)
   * Get rank statistics for admin dashboard
   */
  fastify.get('/stats', {
    onRequest: [fastify.authenticate]
  }, async (request: any, reply) => {
    try {
      // Check if user is admin
      const adminUser = await pool.query(
        'SELECT role FROM users WHERE id = $1',
        [request.user.userId]
      )
      
      if (adminUser.rows[0]?.role !== 'ADMIN') {
        return reply.status(403).send({
          success: false,
          error: 'Unauthorized: Admin access required'
        })
      }
      
      const stats = await rankService.getRankStatistics()
      
      return reply.send({
        success: true,
        data: stats
      })
    } catch (err: any) {
      fastify.log.error({ err }, 'Failed to get rank stats')
      return reply.status(500).send({
        success: false,
        error: 'Failed to get rank stats'
      })
    }
  })
}
