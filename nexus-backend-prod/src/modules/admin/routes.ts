import { FastifyPluginAsync } from 'fastify'
import { pool } from '../../db/pool'
import { requireAdmin, requireAdminMFA, verifyAdminAllowlist } from '../../middlewares/adminAuth'

const routes: FastifyPluginAsync = async (app) => {
  // Standard admin routes (require secret key + allowlist)
  app.addHook('preHandler', app.authenticate)

  // ✅ Admin allowlist verification (used by AdminWalletGuard)
  app.get('/verify-allowlist', verifyAdminAllowlist)

  // Apply admin middleware to all other routes
  app.addHook('preHandler', requireAdmin)
  
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

  // ✅ Admin: Adjust ledger (REQUIRES MFA)
  app.post('/ledger/adjust', { preHandler: requireAdminMFA }, async (request, reply) => {
    const body = request.body as any
    const { userId, token, amount, reason } = body
    const adminUser: any = request.user
    
    if (!userId || !token || !amount) return reply.code(400).send({ error: 'invalid' })
    
    app.log.warn({
      adminId: adminUser.sub,
      userId,
      token,
      amount,
      reason
    }, 'Admin ledger adjustment with MFA')
    
    await pool.query('INSERT INTO ledger (user_id, type, token, amount, status, meta) VALUES ($1,$2,$3,$4,$5,$6)', [userId, 'ADJUSTMENT', token, amount, 'COMPLETED', JSON.stringify({ reason, adminId: adminUser.sub })])
    await pool.query(`INSERT INTO balances (user_id, token, available, locked, updated_at) VALUES ($1,$2,$3,0,now()) ON CONFLICT (user_id) DO UPDATE SET available = balances.available + $3, updated_at = now()`, [userId, token, amount])
    reply.send({ ok: true })
  })

  // ✅ Admin: Override withdrawal address (REQUIRES MFA)
  app.post('/withdrawals/:id/override-address', { preHandler: requireAdminMFA }, async (request, reply) => {
    const { id } = request.params as any
    const { newAddress } = request.body as any
    const adminUser: any = request.user
    
    if (!newAddress) {
      return reply.code(400).send({ error: 'newAddress is required' })
    }
    
    try {
      await pool.query(
        `UPDATE withdrawals 
         SET admin_override_address = $1, admin_approved_by = $2
         WHERE id = $3`,
        [newAddress.toLowerCase(), adminUser.sub, id]
      )
      
      app.log.warn({
        adminId: adminUser.sub,
        withdrawalId: id,
        newAddress
      }, 'Admin overrode withdrawal address')
      
      reply.send({ ok: true, message: 'Withdrawal address overridden' })
    } catch (err: any) {
      reply.code(500).send({ error: err.message })
    }
  })

  // ✅ Admin: Get ecosystem stats
  app.get('/stats/ecosystem', async (request, reply) => {
    const stats = await pool.query(`
      SELECT 
        COUNT(DISTINCT id) as total_users,
        COUNT(DISTINCT CASE WHEN current_rank > 0 THEN id END) as ranked_users,
        COALESCE(SUM(total_deposited_atomic), 0) as total_deposits,
        COALESCE(SUM(total_roi_earned_atomic), 0) as total_roi_paid,
        COALESCE(SUM(total_mlm_earned_atomic), 0) as total_mlm_paid,
        COALESCE(SUM(claimable_balance_atomic), 0) as total_claimable
      FROM user_balances ub
      LEFT JOIN users u ON u.id = ub.user_id
    `)
    
    reply.send(stats.rows[0])
  })

  // ✅ Admin: Get rank distribution
  app.get('/stats/ranks', async (request, reply) => {
    const ranks = await pool.query(`
      SELECT 
        COALESCE(current_rank, 0) as rank,
        COUNT(*) as user_count
      FROM users
      GROUP BY current_rank
      ORDER BY current_rank DESC
    `)
    
    reply.send({ items: ranks.rows })
  })
}
export default routes
