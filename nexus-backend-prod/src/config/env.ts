import process from 'process'
import { z } from 'zod'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local first (for local dev), then fall back to .env
dotenv.config({ path: path.join(__dirname, '../../.env.local') })
dotenv.config()

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.preprocess((val) => Number(val), z.number().default(3000)),
  JWT_SECRET: z.string().min(1),
  WEBHOOK_SECRET: z.string().min(1),
  KEY_ENCRYPTION_SECRET: z.string().min(1),
  TREASURY_ENCRYPTED_KEY: z.string().min(1),
  CHAIN_RPC_URL: z.string().optional(),
  ALLOWED_ORIGINS: z.string().min(1),
  PG_BOSS_SCHEMA: z.string().default('pgboss')
})

const parsed = schema.parse(process.env)

export const env = {
  DATABASE_URL: parsed.DATABASE_URL,
  PORT: parsed.PORT,
  JWT_SECRET: parsed.JWT_SECRET,
  WEBHOOK_SECRET: parsed.WEBHOOK_SECRET,
  KEY_ENCRYPTION_SECRET: parsed.KEY_ENCRYPTION_SECRET,
  TREASURY_ENCRYPTED_KEY: parsed.TREASURY_ENCRYPTED_KEY,
  CHAIN_RPC_URL: parsed.CHAIN_RPC_URL || '',
  ALLOWED_ORIGINS: parsed.ALLOWED_ORIGINS,
  PG_BOSS_SCHEMA: parsed.PG_BOSS_SCHEMA
}
