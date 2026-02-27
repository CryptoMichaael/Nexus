import { FastifyInstance } from 'fastify'
import { FastifyReply, FastifyRequest } from 'fastify'
export function registerAuthMiddleware(app: FastifyInstance) {
  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }
  })
  app.decorate('requireAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
      const payload: any = request.user
      if (payload.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Forbidden' })
      }
    } catch {
      return reply.code(401).send({ error: 'Unauthorized' })
    }
  })
}
