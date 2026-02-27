import { FastifyReply, FastifyRequest } from 'fastify'
import { logger } from '../config/logger'
export async function errorHandler(error: any, request: FastifyRequest, reply: FastifyReply) {
  logger.error({ err: error }, 'request error')
  const status = error.statusCode || error.status || 500
  const message = error.message || 'Internal Server Error'
  reply.status(status).send({ error: message })
}
