import process from 'process'
import { z } from 'zod'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local first (for local dev), then fall back to .env
dotenv.config({ path: path.join(__dirname, '../../.env.local') })
dotenv.config()

/**
 * Migration-only environment schema.
 * Only requires DATABASE_URL for migrations to run.
 * Defaults to local development database if not specified.
 */
const schema = z.object({
  DATABASE_URL: z
    .string()
    .default('postgresql://localhost:5432/nexus')
    .describe('PostgreSQL connection string for migrations'),
})

const parsed = schema.parse(process.env)

export const envMigrate = {
  DATABASE_URL: parsed.DATABASE_URL,
}
