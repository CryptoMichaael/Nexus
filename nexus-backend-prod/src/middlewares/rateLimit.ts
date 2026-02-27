import { FastifyRequest, FastifyReply } from 'fastify'
export async function requestId(request: FastifyRequest, reply: FastifyReply) {
  const id = request.headers['x-request-id'] ?? `${Date.now()}`
  reply.header('x-request-id', String(id))
}
