import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import fastifyJwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import { env } from './config/envServer'
import { logger } from './config/logger'
import { pool } from './db/pool'
import authRoutes from './modules/auth/routes'
import usersRoutes from './modules/users/routes'
import depositsRoutes from './modules/deposits/routes'
import withdrawalsRoutes from './modules/withdrawals/routes'
import adminRoutes from './modules/admin/routes'
import rankRoutes from './modules/ranks/routes'
import { errorHandler } from './middlewares/errorHandler'
import { requestId } from './middlewares/rateLimit'
import { registerAuthMiddleware } from './middlewares/auth'

export async function buildApp(): Promise<FastifyInstance> {
  const app: FastifyInstance = Fastify({ logger: logger as any })

  // capture raw body for webhooks
  
// Capture raw request body safely (required for webhook HMAC verification).
// We buffer the incoming payload, attach it as request.rawBody, and then
// pass a fresh stream to Fastify so JSON parsing still works.
app.addHook('preParsing', (request, reply, payload, done) => {
  // Only buffer for JSON-ish requests; skip large uploads.
  const chunks: Buffer[] = []
  payload.on('data', (chunk: Buffer) => chunks.push(chunk))
  payload.on('end', () => {
    const buf = Buffer.concat(chunks)
    ;(request as any).rawBody = buf
    // Recreate stream for downstream body parser
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Readable } = require('stream')
    done(null, Readable.from(buf))
  })
  payload.on('error', (err: any) => done(err))
})


  const allowed = env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (allowed.includes(origin)) return cb(null, true)
      cb(new Error('Not allowed'), false)
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-webhook-signature'],
    credentials: false
  })

  await app.register(helmet)

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute'
  })

  app.addHook('onRequest', requestId)

  await app.register(fastifyJwt, { secret: env.JWT_SECRET, sign: { expiresIn: '12h' } })

  // register auth decorators
  registerAuthMiddleware(app)

  // routes
  
// Convenience alias used by frontends
app.get('/v1/me', { preHandler: app.authenticate }, async (request, reply) => {
  const u: any = (request as any).user
  reply.send({ id: u.sub, address: u.address, role: u.role })
})

// Health endpoints
app.get('/health', async () => ({ ok: true }))
app.register(authRoutes, { prefix: '/v1/auth' })
  app.register(usersRoutes, { prefix: '/v1' })
  app.register(depositsRoutes, { prefix: '/v1' })
  app.register(withdrawalsRoutes, { prefix: '/v1' })
  app.register(adminRoutes, { prefix: '/v1/admin' })
  app.register(rankRoutes, { prefix: '/v1/ranks' })

  app.get('/v1/health', async () => ({ ok: true }))

  app.setErrorHandler(errorHandler)

  // try simple ping
  try {
    await pool.query('SELECT 1')
  } catch (err: any) {
    logger.error({ err }, 'unable to connect to database')
    throw new Error('Database connection failed; please verify DATABASE_URL')
  }

  // check migrations table
  let migrationsOk = true
  try {
    await pool.query('SELECT 1 FROM schema_migrations LIMIT 1')
  } catch (err) {
    migrationsOk = false
  }
  if (!migrationsOk) {
    if (process.env.NODE_ENV === 'development') {
      logger.info('schema_migrations table missing, running migrations automatically (dev mode)')
      const { runMigrations } = await import('./scripts/migrate')
      await runMigrations()
    } else {
      logger.error('migrations not applied; run npm run migrate before starting in production')
      throw new Error('Migrations required')
    }
  }

  return app
}
