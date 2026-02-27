import 'dotenv/config'
import { buildApp } from './app'
import { logger } from './config/logger'
import { env } from './config/envServer'
async function main() {
  const app = await buildApp()
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
    logger.info({ port: env.PORT }, 'Server listening')
  } catch (err) {
    logger.error({ err }, 'Failed to start server')
    process.exit(1)
  }
}
process.on('SIGINT', () => { logger.info('SIGINT received'); process.exit(0) })
process.on('SIGTERM', () => { logger.info('SIGTERM received'); process.exit(0) })
main()
