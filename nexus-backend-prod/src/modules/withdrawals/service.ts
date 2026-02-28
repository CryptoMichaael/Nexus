import { pool } from '../../db/pool'
import PgBoss from 'pg-boss'
import { env } from '../../config/env'
import { logger } from '../../config/logger'

const boss = new PgBoss({ connectionString: env.DATABASE_URL, schema: env.PG_BOSS_SCHEMA })

export async function initPgBoss() {
  await boss.start()
}

export async function createWithdrawalJob(userId: string, token: string, amount: string, toAddress: string) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    
    // ✅ Get user's wallet address (deposit address)
    const userResult = await client.query(
      'SELECT wallet_address FROM users WHERE id = $1',
      [userId]
    )
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found')
    }
    
    const userWalletAddress = userResult.rows[0].wallet_address.toLowerCase()
    const requestedAddress = toAddress.toLowerCase()
    
    // ✅ ENFORCE: Withdrawal only to deposit address
    if (requestedAddress !== userWalletAddress) {
      throw new Error('Withdrawal address must match deposit address. Contact admin for address change.')
    }
    
    const res = await client.query(
      `INSERT INTO withdrawals (
        user_id, token, amount, to_address, deposit_address, status
      ) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, 
      [userId, token, amount, toAddress, userWalletAddress, 'PENDING']
    )
    
    const w = res.rows[0]
    await client.query(
      'INSERT INTO ledger (user_id, type, token, amount, status, ref_type, ref_id, meta) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', 
      [userId, 'WITHDRAWAL', token, amount, 'PENDING', 'withdrawal', w.id, JSON.stringify({ toAddress })]
    )
    await client.query('COMMIT')
    await boss.send('withdrawal', { withdrawalId: w.id })
    return w
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
