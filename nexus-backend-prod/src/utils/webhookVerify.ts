import crypto from 'crypto'
import { env } from '../config/env'

export function verifyHmacSignature(rawBody: Buffer, signatureHeader?: string): boolean {
  if (!signatureHeader) return false

  // Expect hex signature
  const sig = signatureHeader.trim().toLowerCase()
  if (!/^[0-9a-f]{64}$/i.test(sig)) return false

  const h = crypto.createHmac('sha256', env.WEBHOOK_SECRET)
  h.update(rawBody)
  const expectedHex = h.digest('hex')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedHex, 'hex'),
      Buffer.from(sig, 'hex')
    )
  } catch {
    return false
  }
}
