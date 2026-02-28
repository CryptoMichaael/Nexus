import { FastifyPluginAsync } from 'fastify'
import { getLevelsSummaryForUser, getTeamMembers, getChildren } from './service'
import { pool } from '../../db/pool'

const routes: FastifyPluginAsync = async (app) => {
  app.get('/dashboard/summary', { preHandler: app.authenticate }, async (request, reply) => {
    return {
      walletBalance: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
      pendingWithdrawals: 0,
      totalTeamSize: 0,
      directReferrals: 0,
      totalDepositVolume: 0
    }
  })

  // ROI Status endpoint
  app.get('/roi-status', { preHandler: app.authenticate }, async (request, reply) => {
    const user: any = request.user
    const userId = user.sub

    // Get all ROI ledgers for this user
    const { rows: roiLedgers } = await pool.query(
      `SELECT 
        deposit_id,
        principal_atomic,
        accumulated_roi_atomic,
        max_roi_atomic,
        status,
        daily_rate,
        roi_start_date,
        last_calculated_at
       FROM roi_ledger
       WHERE user_id = $1
       ORDER BY roi_start_date DESC`,
      [userId]
    )

    const deposits = roiLedgers.map((ledger: any) => ({
      depositId: ledger.deposit_id,
      principal: (Number(ledger.principal_atomic) / 1e18).toFixed(2),
      accumulated: (Number(ledger.accumulated_roi_atomic) / 1e18).toFixed(2),
      maxROI: (Number(ledger.max_roi_atomic) / 1e18).toFixed(2),
      status: ledger.status,
      dailyRate: Number(ledger.daily_rate),
      startDate: ledger.roi_start_date,
      lastCalculated: ledger.last_calculated_at,
    }))

    const totalPrincipal = deposits.reduce((sum, d) => sum + parseFloat(d.principal), 0)
    const totalAccumulatedROI = deposits.reduce((sum, d) => sum + parseFloat(d.accumulated), 0)
    const totalMaxROI = deposits.reduce((sum, d) => sum + parseFloat(d.maxROI), 0)
    const activeDeposits = deposits.filter((d) => d.status === 'active').length

    reply.send({
      activeDeposits,
      totalPrincipal: totalPrincipal.toFixed(2),
      totalAccumulatedROI: totalAccumulatedROI.toFixed(2),
      totalMaxROI: totalMaxROI.toFixed(2),
      deposits,
    })
  })

  app.get('/team/levels-summary', { preHandler: app.authenticate }, async (request, reply) => {
    const u: any = request.user
    const summary = await getLevelsSummaryForUser(u.sub)
    reply.send(summary)
  })

  app.get('/team/members', { preHandler: app.authenticate }, async (request, reply) => {
    const { level, cursor, limit, q } = request.query as any
    const res = await getTeamMembers(level ? Number(level) : undefined, cursor, Number(limit) || 20, q)
    reply.send({ items: res.items, nextCursor: res.nextCursor })
  })

  app.get('/team/children', { preHandler: app.authenticate }, async (request, reply) => {
    const { parentId, cursor, limit } = request.query as any
    if (!parentId) return reply.code(400).send({ error: 'parentId required' })
    const res = await getChildren(parentId, cursor, Number(limit) || 20)
    reply.send({ items: res.items, nextCursor: res.nextCursor })
  })
}
export default routes
