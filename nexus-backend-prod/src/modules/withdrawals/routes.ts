import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { createWithdrawalJob } from './service'
const routes: FastifyPluginAsync = async (app) => {
  app.post('/withdrawals', { preHandler: app.authenticate }, async (request, reply) => {
    const body = z.object({ token: z.string(), amount: z.string(), toAddress: z.string() }).parse(request.body)
    const u: any = request.user
    try {
      const job = await createWithdrawalJob(u.sub, body.token, body.amount, body.toAddress)
      reply.send({ ok: true, id: job.id })
    } catch (err: any) {
      reply.code(400).send({ error: err.message })
    }
  })

  app.get('/withdrawals', { preHandler: app.authenticate }, async (request, reply) => {
    const { cursor, limit, status } = request.query as any
    const params: any[] = []
    let where = ''
    if (status) { params.push(status); where += ` WHERE status = $${params.length}` }
    const cur = cursor ? JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) : null
    if (cur) {
      params.push(cur.created_at, cur.id)
      where += `${where ? ' AND' : ' WHERE'} (created_at < $${params.length - 1} OR (created_at = $${params.length - 1} AND id < $${params.length}))`
    }
    params.push(Number(limit) || 20)
    const q = `SELECT id, user_id, token, amount, to_address, status, tx_hash, created_at FROM withdrawals ${where} ORDER BY created_at DESC LIMIT $${params.length}`
    const res = await (await import('../../db/pool')).pool.query(q, params)
    const items = res.rows
    const nextCursor = items.length ? Buffer.from(JSON.stringify({ created_at: items[items.length - 1].created_at, id: items[items.length - 1].id })).toString('base64') : null
    reply.send({ items, nextCursor })
  })
}
export default routes
