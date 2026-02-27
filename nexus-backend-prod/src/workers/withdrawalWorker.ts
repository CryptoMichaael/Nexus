import 'dotenv/config'
import PgBoss from 'pg-boss'
import { env } from '../config/env'
import { pool } from '../db/pool'
import { decryptEncryptedKey } from '../utils/cryptoAesGcm'
import { logger } from '../config/logger'
import { ethers } from 'ethers'

const boss = new PgBoss({ connectionString: env.DATABASE_URL, schema: env.PG_BOSS_SCHEMA })

async function processWithdrawal(job: any) {
  const { withdrawalId } = job.data
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const res = await client.query('SELECT * FROM withdrawals WHERE id=$1 FOR UPDATE', [withdrawalId])
    if (!res.rowCount) { await client.query('ROLLBACK'); return }
    const w = res.rows[0]
    if (w.status !== 'PENDING') { await client.query('ROLLBACK'); return }
    await client.query('UPDATE withdrawals SET status=$1, processed_at=now() WHERE id=$2', ['PROCESSING', withdrawalId])
    await client.query('INSERT INTO ledger (user_id, type, token, amount, status, ref_type, ref_id, meta) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [w.user_id, 'WITHDRAWAL', w.token, w.amount, 'PROCESSING', 'withdrawal', w.id, JSON.stringify({})])
    await client.query('COMMIT')

    const decryptedKey = decryptEncryptedKey(env.TREASURY_ENCRYPTED_KEY)
    const wallet = new ethers.Wallet(decryptedKey, ethers.getDefaultProvider(env.CHAIN_RPC_URL))
    let txHash: string | null = null
    try {
      const tx = await wallet.sendTransaction({
        to: w.to_address,
        value: ethers.parseUnits(w.amount.toString(), 18)
      })
      txHash = tx.hash
      await pool.query('UPDATE withdrawals SET status=$1, tx_hash=$2, processed_at=now() WHERE id=$3', ['SUCCESS', txHash, withdrawalId])
      await pool.query('UPDATE ledger SET status=$1, meta = meta || $2 WHERE ref_id=$3 AND ref_type=$4', ['COMPLETED', JSON.stringify({ txHash }), withdrawalId, 'withdrawal'])
      logger.info({ withdrawalId, txHash }, 'withdrawal success')
    } catch (err: any) {
      logger.error({ err }, 'withdrawal failed to send')
      await pool.query('UPDATE withdrawals SET status=$1, error=$2 WHERE id=$3', ['FAILED', String(err.message), withdrawalId])
      await pool.query('UPDATE ledger SET status=$1, meta = meta || $2 WHERE ref_id=$3 AND ref_type=$4', ['FAILED', JSON.stringify({ error: String(err.message) }), withdrawalId, 'withdrawal'])
    }
  } catch (err) {
    await client.query('ROLLBACK')
    logger.error({ err }, 'worker transaction failed')
  } finally {
    client.release()
  }
}

async function run() {
  await boss.start()
  await boss.work('withdrawal', processWithdrawal as any)
  logger.info('Withdrawal worker started')
}

run().catch(err => { logger.error({ err }, 'Worker failed'); process.exit(1) })
