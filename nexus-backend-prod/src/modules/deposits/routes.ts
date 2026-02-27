import { FastifyPluginAsync } from 'fastify'
import { handleDepositWebhook, listDeposits } from './service'
const routes: FastifyPluginAsync = async (app) => {
  app.post('/webhooks/deposit', async (request, reply) => {
    // @ts-ignore
    const rawBody: Buffer = (request as any).rawBody || Buffer.from(JSON.stringify(request.body || {}), 'utf8')
    const sig = (request.headers as any)['x-webhook-signature'] as string | undefined
    try {
      const res = await handleDepositWebhook(rawBody, sig)
      reply.send(res)
    } catch (err: any) {
      reply.code(400).send({ error: err.message })
    }
  })

  app.get('/deposits', { preHandler: app.authenticate }, async (request, reply) => {
    const { cursor, limit, status, q } = request.query as any
    const res = await listDeposits(cursor, Number(limit) || 20, status, q)
    reply.send({ items: res.items, nextCursor: res.nextCursor })
  })
}
export default routes