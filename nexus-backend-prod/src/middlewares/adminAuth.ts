import { FastifyRequest, FastifyReply } from 'fastify'
import { pool } from '../db/pool'
import crypto from 'crypto'

// Admin secret key from environment (should be strong 64+ char secret)
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || ''
const ADMIN_MFA_SECRET = process.env.ADMIN_MFA_SECRET || ''

if (!ADMIN_SECRET_KEY) {
  console.warn('⚠️  ADMIN_SECRET_KEY not set - admin endpoints will be insecure!')
}

/**
 * Middleware to verify admin authorization
 * Checks:
 * 1. JWT token (from @fastify/jwt)
 * 2. Admin Secret Key (from X-Admin-Secret header)
 * 3. Wallet address in admin_allowlist table
 */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Step 1: Verify JWT token (handled by app.authenticate hook)
    const user: any = request.user
    if (!user || !user.sub) {
      return reply.code(401).send({ error: 'Unauthorized: No valid token' })
    }

    // Step 2: Verify Admin Secret Key from header
    const adminSecret = request.headers['x-admin-secret'] as string | undefined
    
    if (!adminSecret || adminSecret !== ADMIN_SECRET_KEY) {
      console.warn(`[SECURITY] Failed admin secret key attempt from user ${user.sub}`)
      return reply.code(403).send({ 
        error: 'Forbidden: Invalid admin secret key',
        hint: 'Ensure X-Admin-Secret header is present and correct'
      })
    }

    // Step 3: Check admin_allowlist table
    const { rows } = await pool.query(
      `SELECT wallet_address, role, is_active 
       FROM admin_allowlist 
       WHERE user_id = $1 AND is_active = true`,
      [user.sub]
    )

    if (rows.length === 0 || rows[0].role !== 'ADMIN') {
      console.warn(`[SECURITY] Unauthorized admin access attempt by ${user.sub}`)
      
      // Log unauthorized attempt
      await pool.query(
        `INSERT INTO security_audit_log (user_id, event_type, ip_address, user_agent, details)
         VALUES ($1, 'ADMIN_ACCESS_DENIED', $2, $3, $4)`,
        [
          user.sub,
          request.ip,
          request.headers['user-agent'] || 'unknown',
          JSON.stringify({ reason: 'Not in admin allowlist or inactive' })
        ]
      )

      return reply.code(403).send({ 
        error: 'Forbidden: Admin access denied',
        hint: 'Your wallet is not authorized for admin operations'
      })
    }

    // All checks passed - proceed
    console.log(`[ADMIN] Authorized request from ${user.sub} (${rows[0].wallet_address})`)
  } catch (error) {
    console.error('[ADMIN] Authorization error:', error)
    return reply.code(500).send({ error: 'Internal server error during admin verification' })
  }
}

/**
 * Middleware for sensitive operations requiring 2FA
 * Used for: reward_config updates, manual withdrawals, ledger adjustments
 * Checks:
 * 1. All requireAdmin checks
 * 2. TOTP token (from X-Admin-MFA header)
 */
export async function requireAdminMFA(request: FastifyRequest, reply: FastifyReply) {
  try {
    // First run standard admin checks
    await requireAdmin(request, reply)
    
    // If requireAdmin already sent a response, stop here
    if (reply.sent) return

    const user: any = request.user

    // Step 4: Verify 2FA token
    const mfaToken = request.headers['x-admin-mfa'] as string | undefined

    if (!mfaToken) {
      return reply.code(403).send({
        error: 'Forbidden: 2FA token required for this operation',
        hint: 'Include X-Admin-MFA header with your TOTP code'
      })
    }

    // Simple time-based verification (can be replaced with speakeasy/otplib for TOTP)
    const isValid = await verifyMFAToken(user.sub, mfaToken)

    if (!isValid) {
      console.warn(`[SECURITY] Invalid MFA token from ${user.sub}`)
      
      // Log failed MFA attempt
      await pool.query(
        `INSERT INTO security_audit_log (user_id, event_type, ip_address, user_agent, details)
         VALUES ($1, 'MFA_FAILED', $2, $3, $4)`,
        [
          user.sub,
          request.ip,
          request.headers['user-agent'] || 'unknown',
          JSON.stringify({ reason: 'Invalid TOTP token' })
        ]
      )

      return reply.code(403).send({
        error: 'Forbidden: Invalid 2FA token',
        hint: 'Ensure your authenticator app is synchronized'
      })
    }

    // Log successful sensitive operation
    await pool.query(
      `INSERT INTO security_audit_log (user_id, event_type, ip_address, user_agent, details)
       VALUES ($1, 'SENSITIVE_OPERATION_AUTHORIZED', $2, $3, $4)`,
      [
        user.sub,
        request.ip,
        request.headers['user-agent'] || 'unknown',
        JSON.stringify({ 
          path: request.url,
          method: request.method
        })
      ]
    )

    console.log(`[ADMIN MFA] Sensitive operation authorized for ${user.sub}`)
  } catch (error) {
    console.error('[ADMIN MFA] Verification error:', error)
    return reply.code(500).send({ error: 'Internal server error during MFA verification' })
  }
}

/**
 * Verify MFA token (TOTP)
 * Simple implementation - can be enhanced with speakeasy/otplib
 */
async function verifyMFAToken(userId: string, token: string): Promise<boolean> {
  try {
    // Method 1: Static secret key (simple but less secure)
    if (ADMIN_MFA_SECRET) {
      // Generate expected token using time-based algorithm
      const currentTime = Math.floor(Date.now() / 1000 / 30) // 30-second window
      const expectedToken = generateTOTP(ADMIN_MFA_SECRET, currentTime)
      const previousToken = generateTOTP(ADMIN_MFA_SECRET, currentTime - 1)
      
      // Allow current and previous window (60s total)
      return token === expectedToken || token === previousToken
    }

    // Method 2: Database-stored MFA secret (more secure)
    const { rows } = await pool.query(
      `SELECT mfa_secret FROM admin_allowlist WHERE user_id = $1 AND is_active = true`,
      [userId]
    )

    if (rows.length === 0 || !rows[0].mfa_secret) {
      // MFA not configured for this admin
      return true // Allow if MFA not setup (should be required in production)
    }

    const userSecret = rows[0].mfa_secret
    const currentTime = Math.floor(Date.now() / 1000 / 30)
    const expectedToken = generateTOTP(userSecret, currentTime)
    const previousToken = generateTOTP(userSecret, currentTime - 1)

    return token === expectedToken || token === previousToken
  } catch (error) {
    console.error('[MFA] Verification error:', error)
    return false
  }
}

/**
 * Generate TOTP code (Time-based One-Time Password)
 * Simple implementation - for production use speakeasy/otplib
 */
function generateTOTP(secret: string, timeCounter: number): string {
  const buffer = Buffer.alloc(8)
  buffer.writeBigInt64BE(BigInt(timeCounter))
  
  const hmac = crypto.createHmac('sha1', secret)
  hmac.update(buffer)
  const hash = hmac.digest()
  
  const offset = hash[hash.length - 1] & 0xf
  const truncatedHash = (
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  )
  
  const code = truncatedHash % 1000000
  return code.toString().padStart(6, '0')
}

/**
 * Admin allowlist verification endpoint
 * Used by AdminWalletGuard component
 */
export async function verifyAdminAllowlist(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user: any = request.user
    if (!user || !user.sub) {
      return reply.code(401).send({ allowed: false, walletAddress: '', role: '' })
    }

    const { rows } = await pool.query(
      `SELECT wallet_address, role, is_active 
       FROM admin_allowlist 
       WHERE user_id = $1`,
      [user.sub]
    )

    if (rows.length === 0 || !rows[0].is_active || rows[0].role !== 'ADMIN') {
      return reply.send({
        allowed: false,
        walletAddress: user.address || '',
        role: rows[0]?.role || 'USER'
      })
    }

    return reply.send({
      allowed: true,
      walletAddress: rows[0].wallet_address,
      role: rows[0].role
    })
  } catch (error) {
    console.error('[ADMIN] Allowlist verification error:', error)
    return reply.code(500).send({ allowed: false, walletAddress: '', role: '' })
  }
}
