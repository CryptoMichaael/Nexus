import process from 'process'
import { z } from 'zod'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local first (for local dev), then fall back to .env
dotenv.config({ path: path.join(__dirname, '../../.env.local') })
dotenv.config()

/**
 * Server runtime environment schema.
 * Requires all secrets and configuration for the Fastify application.
 */
const schema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .describe('PostgreSQL connection string'),
  PORT: z
    .preprocess((val) => Number(val), z.number())
    .default(3000)
    .describe('Fastify server port'),
  JWT_SECRET: z
    .string()
    .min(1)
    .describe('JWT signing secret for authentication tokens'),
  WEBHOOK_SECRET: z
    .string()
    .min(1)
    .describe('HMAC secret for webhook signature verification'),
  KEY_ENCRYPTION_SECRET: z
    .string()
    .min(32)
    .describe('AES-256-GCM key encryption secret (minimum 32 chars)'),
  TREASURY_ENCRYPTED_KEY: z
    .string()
    .min(1)
    .describe('Encrypted treasury private key (base64)'),
  CHAIN_RPC_URL: z
    .string()
    .optional()
    .describe('Optional blockchain RPC endpoint for withdrawals'),
  ALLOWED_ORIGINS: z
    .string()
    .min(1)
    .describe('Comma-separated CORS allowed origins'),
  PG_BOSS_SCHEMA: z
    .string()
    .default('pgboss')
    .describe('PostgreSQL schema for job queue'),
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
  PG_BOSS_SCHEMA: parsed.PG_BOSS_SCHEMA,
}
