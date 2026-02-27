/**
 * Usage:
 *   KEY_ENCRYPTION_SECRET="your-secret" node -r ts-node/register src/scripts/encryptKey.ts "0xYOUR_PRIVATE_KEY"
 *
 * Or via npm:
 *   KEY_ENCRYPTION_SECRET="your-secret" npm run encrypt:key -- "0xYOUR_PRIVATE_KEY"
 */
import { encryptKey } from '../utils/cryptoAesGcm'

const secret = process.env.KEY_ENCRYPTION_SECRET
if (!secret) {
  console.error('Missing KEY_ENCRYPTION_SECRET in env')
  process.exit(1)
}

const plaintext = process.argv[2]
if (!plaintext) {
  console.error('Usage: npm run encrypt:key -- "0xYOUR_PRIVATE_KEY"')
  process.exit(1)
}

const encrypted = encryptKey(plaintext, secret)
console.log(encrypted)
