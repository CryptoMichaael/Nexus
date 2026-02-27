import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { generateNonceForAddress, verifySignatureAndCreate } from './service'
const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/wallet/nonce', async (request, reply) => {
    const body = z.object({ address: z.string(), domain: z.string() }).parse(request.body)
    const address = body.address.toLowerCase()
    const res = await generateNonceForAddress(address, body.domain)
    reply.send(res)
  })

  app.post('/wallet/verify', async (request, reply) => {
    const body = z.object({ address: z.string(), signature: z.string(), domain: z.string(), issuedAt: z.string() }).parse(request.body)
    try {
      const result = await verifySignatureAndCreate(body.address, body.signature, body.domain, body.issuedAt, app)
      reply.send(result)
    } catch (err: any) {
      reply.code(400).send({ error: err.message })
    }
  })

  app.get('/me', { preHandler: app.authenticate }, async (request, reply) => {
    const u: any = request.user
    reply.send({ id: u.sub, address: u.address, role: u.role })
  })
}
export default authRoutes
