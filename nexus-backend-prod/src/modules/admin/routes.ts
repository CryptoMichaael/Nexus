import { FastifyPluginAsync } from 'fastify'
import { pool } from '../../db/pool'
const routes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.requireAdmin)
  app.get('/users', async (request, reply) => {
    const q = request.query as any
    const res = await pool.query('SELECT id, wallet_address, sponsor_id, role, status, created_at FROM users WHERE wallet_address ILIKE $1 LIMIT 100', [`%${q.q || ''}%`])
    reply.send({ items: res.rows, nextCursor: null })
  })

  app.get('/users/:id', async (request, reply) => {
    const { id } = request.params as any
    const res = await pool.query('SELECT id, wallet_address, sponsor_id, role, status, created_at FROM users WHERE id=$1', [id])
    reply.send(res.rows[0] || null)
  })

  app.get('/ledger', async (request, reply) => {
    const { cursor, limit, q } = request.query as any
    const { listLedger } = await import('../ledger/service')
    const res = await listLedger(cursor, Number(limit) || 20, undefined, undefined, q)
    reply.send({ items: res.items, nextCursor: res.nextCursor })
  })

  app.get('/withdrawals', async (request, reply) => {
    const { status, cursor, limit } = request.query as any
    const params: any[] = []
    let where = ''
    if (status) { params.push(status); where += ` WHERE status = $${params.length}` }
    params.push(Number(limit) || 20)
    const qstr = `SELECT id, user_id, token, amount, to_address, status, tx_hash, created_at FROM withdrawals ${where} ORDER BY created_at DESC LIMIT $${params.length}`
    const res = await pool.query(qstr, params)
    reply.send({ items: res.rows, nextCursor: null })
  })

  app.post('/ledger/adjust', async (request, reply) => {
    const body = request.body as any
    const { userId, token, amount, reason } = body
    if (!userId || !token || !amount) return reply.code(400).send({ error: 'invalid' })
    await pool.query('INSERT INTO ledger (user_id, type, token, amount, status, meta) VALUES ($1,$2,$3,$4,$5,$6)', [userId, 'ADJUSTMENT', token, amount, 'COMPLETED', JSON.stringify({ reason })])
    await pool.query(`INSERT INTO balances (user_id, token, available, locked, updated_at) VALUES ($1,$2,$3,0,now()) ON CONFLICT (user_id) DO UPDATE SET available = balances.available + $3, updated_at = now()`, [userId, token, amount])
    reply.send({ ok: true })
  })
}
export default routes
