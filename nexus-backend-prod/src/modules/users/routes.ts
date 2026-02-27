import { FastifyPluginAsync } from 'fastify'
import { getLevelsSummaryForUser, getTeamMembers, getChildren } from './service'
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
