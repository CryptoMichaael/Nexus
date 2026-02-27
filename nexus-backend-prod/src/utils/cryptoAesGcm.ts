import crypto from 'crypto'
import { env } from '../config/env'

function deriveKey(secret: string): Buffer {
  // Derive a stable 32-byte key from any passphrase.
  // This keeps ops simple (no base64 requirement).
  return crypto.createHash('sha256').update(secret, 'utf8').digest()
}

// Encrypted payload is base64(JSON.stringify({ iv, authTag, ciphertext }))
export function decryptEncryptedKey(encryptedJsonBase64: string): string {
  const key = deriveKey(env.KEY_ENCRYPTION_SECRET)
  const json = Buffer.from(encryptedJsonBase64, 'base64').toString('utf8')
  const parsed = JSON.parse(json) as { iv: string; authTag: string; ciphertext: string }

  const iv = Buffer.from(parsed.iv, 'base64')
  const authTag = Buffer.from(parsed.authTag, 'base64')
  const ciphertext = Buffer.from(parsed.ciphertext, 'base64')

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return decrypted.toString('utf8')
}

export function encryptKey(plaintext: string, secret: string): string {
  const key = deriveKey(secret)
  const iv = crypto.randomBytes(12)

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  const payload = {
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  }

  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64')
}
