import { pool } from '../../db/pool'
import { verifyHmacSignature } from '../../utils/webhookVerify'
import { encodeCursor, decodeCursor } from '../../utils/cursor'
import { logger } from '../../config/logger'

const VALID_TOKENS = ['USDT', 'ETH']

export async function handleDepositWebhook(rawBody: Buffer, signature?: string) {
  if (!verifyHmacSignature(rawBody, signature)) {
    throw new Error('Invalid webhook signature')
  }
  const payload = JSON.parse(rawBody.toString('utf8'))
  const { txHash, chainId, tokenSymbol, amount, fromAddress, toAddress, timestamp, creditedWalletAddress } = payload
  if (!txHash) throw new Error('txHash required')
  if (!VALID_TOKENS.includes(tokenSymbol)) throw new Error('Unsupported token')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const ins = await client.query('INSERT INTO deposits (user_id, tx_hash, token, amount, from_address, to_address, status, created_at) VALUES ((SELECT id FROM users WHERE wallet_address = $1), $2, $3, $4, $5, $6, $7, to_timestamp($8)) RETURNING id, status', [creditedWalletAddress?.toLowerCase(), txHash, tokenSymbol, amount, fromAddress?.toLowerCase(), toAddress?.toLowerCase(), 'PROCESSING', timestamp ? Number(timestamp) / 1000 : Date.now() / 1000])
    const deposit = ins.rows[0]
    if (!deposit) {
      const existing = await client.query('SELECT id, status FROM deposits WHERE tx_hash=$1', [txHash])
      if (existing.rowCount && existing.rows[0].status === 'SUCCESS') {
        await client.query('COMMIT')
        return { ok: true, duplicate: true }
      }
    } else {
      const userRes = await client.query('SELECT id FROM users WHERE wallet_address = $1', [creditedWalletAddress?.toLowerCase()])
      const user = userRes.rows[0]
      if (!user) {
        const uins = await client.query('INSERT INTO users (wallet_address) VALUES ($1) RETURNING id', [creditedWalletAddress?.toLowerCase()])
        user.id = uins.rows[0].id
      }
      const amountNumeric = amount
      await client.query('INSERT INTO ledger (user_id, type, token, amount, status, ref_type, ref_id, meta) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [user.id, 'DEPOSIT', tokenSymbol, amountNumeric, 'COMPLETED', 'deposit', deposit.id, JSON.stringify({ txHash })])
      await client.query(`INSERT INTO balances (user_id, token, available, locked, updated_at) VALUES ($1,$2,$3,0,now()) ON CONFLICT (user_id) DO UPDATE SET available = balances.available + $3, updated_at = now()`, [user.id, tokenSymbol, amountNumeric])
      const rewardRows = await client.query(`
        WITH RECURSIVE upline AS (
          SELECT id, sponsor_id, 1 as level FROM users WHERE id = $1
          UNION ALL
          SELECT users.id, users.sponsor_id, upline.level+1 FROM users JOIN upline ON users.id = upline.sponsor_id WHERE upline.level < 7
        ), rc as (select level, percent_bps from reward_config where active = true)
        SELECT upline.id as user_id, upline.level, rc.percent_bps FROM upline JOIN rc ON rc.level = upline.level WHERE upline.level > 1
      `, [user.id])
      for (const r of rewardRows.rows) {
        const rewardAmount = (Number(amountNumeric) * Number(r.percent_bps)) / 10000
        if (rewardAmount <= 0) continue
        await client.query('INSERT INTO ledger (user_id, type, token, amount, status, ref_type, ref_id, meta) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [r.user_id, 'LEVEL_REWARD', tokenSymbol, rewardAmount, 'COMPLETED', 'deposit', deposit.id, JSON.stringify({ level: r.level, source_user_id: user.id, txHash })])
        await client.query(`INSERT INTO balances (user_id, token, available, locked, updated_at) VALUES ($1,$2,$3,0,now()) ON CONFLICT (user_id) DO UPDATE SET available = balances.available + $3, updated_at = now()`, [r.user_id, tokenSymbol, rewardAmount])
      }
      await client.query('UPDATE deposits SET status=$1, processed_at=now() WHERE tx_hash=$2', ['SUCCESS', txHash])
      await client.query('COMMIT')
      return { ok: true, duplicate: false }
    }
  } catch (err: any) {
    await client.query('ROLLBACK')
    logger.error({ err }, 'deposit processing failed')
    try {
      await pool.query('UPDATE deposits SET status=$1, error=$2 WHERE tx_hash=$3', ['FAILED', String(err.message), (JSON.parse(rawBody.toString('utf8')).txHash || null)])
    } catch {}
    throw err
  } finally {
    client.release()
  }
}

export async function listDeposits(cursor?: string, limit = 20, status?: string, q?: string) {
  const params: any[] = []
  let where = ''
  if (status) { params.push(status); where += ` WHERE status = $${params.length}` }
  if (q) { params.push(`%${q}%`); where += `${where ? ' AND' : ' WHERE'} tx_hash ILIKE $${params.length}` }
  const cur = decodeCursor(cursor)
  if (cur) {
    params.push(cur.created_at, cur.id)
    where += `${where ? ' AND' : ' WHERE'} (created_at < $${params.length - 1} OR (created_at = $${params.length - 1} AND id < $${params.length}))`
  }
  params.push(limit)
  const qstr = `SELECT id, user_id, tx_hash, token, amount, status, created_at FROM deposits ${where} ORDER BY created_at DESC, id DESC LIMIT $${params.length}`
  const res = await pool.query(qstr, params)
  const items = res.rows
  const nextCursor = items.length ? encodeCursor({ created_at: items[items.length - 1].created_at, id: items[items.length - 1].id }) : null
  return { items, nextCursor }
}
