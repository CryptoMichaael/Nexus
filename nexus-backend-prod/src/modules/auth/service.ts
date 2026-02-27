import crypto from 'crypto'
import { pool } from '../../db/pool'
import { env } from '../../config/env'
import { verifyMessage } from 'ethers'
import { logger } from '../../config/logger'

export async function generateNonceForAddress(address: string, domain: string) {
  // Validate domain
  const allowed = env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  if (!allowed.includes(domain)) throw new Error('Invalid domain')
  
  const nonceBuffer = crypto.randomBytes(24)
  const nonce = nonceBuffer.toString('hex')
  const issuedAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
  
  await pool.query(
    'INSERT INTO auth_nonces (wallet_address, nonce, expires_at) VALUES ($1,$2,$3)',
    [address.toLowerCase(), nonce, expiresAt]
  )
  
  const messageToSign = `${domain} wants you to sign in to Nexus Rewards\n\nAddress: ${address.toLowerCase()}\nNonce: ${nonce}\nIssuedAt: ${issuedAt}\nStatement: Sign in to Nexus Rewards`
  return { nonce, messageToSign, issuedAt }
}

export async function verifySignatureAndCreate(address: string, signature: string, domain: string, issuedAt: string, app: any) {
  const allowed = env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  if (!allowed.includes(domain)) throw new Error('Invalid domain')
  const res = await pool.query(
    `SELECT id, nonce, expires_at, used_at FROM auth_nonces WHERE wallet_address=$1 AND used_at IS NULL ORDER BY created_at DESC LIMIT 1`,
    [address.toLowerCase()]
  )
  if (res.rowCount === 0) throw new Error('Nonce not found')
  const row = res.rows[0]
  if (new Date(row.expires_at) < new Date()) throw new Error('Nonce expired')
  const message = `${domain} wants you to sign in to Nexus Rewards\n\nAddress: ${address.toLowerCase()}\nNonce: ${row.nonce}\nIssuedAt: ${issuedAt}\nStatement: Sign in to Nexus Rewards`
  let recovered: string
  try {
    recovered = verifyMessage(message, signature)
  } catch (err) {
    logger.warn({ err }, 'signature verification failed')
    throw new Error('Invalid signature')
  }
  if (recovered.toLowerCase() !== address.toLowerCase()) {
    throw new Error('Signature does not match address')
  }
  await pool.query('UPDATE auth_nonces SET used_at=now() WHERE id=$1', [row.id])
  const u = await pool.query('SELECT id, wallet_address, role FROM users WHERE wallet_address=$1', [address.toLowerCase()])
  let user = u.rows[0]
  if (!user) {
    const insert = await pool.query(
      'INSERT INTO users (wallet_address, role) VALUES ($1, $2) RETURNING id, wallet_address, role',
      [address.toLowerCase(), 'USER']
    )
    user = insert.rows[0]
  }
  const token = app.jwt.sign({ sub: user.id, address: user.wallet_address, role: user.role })
  return { token, user }
}
