import 'fastify'
import '@fastify/jwt'

type JwtRole = 'USER' | 'ADMIN'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void> | void
    requireAdmin: (request: any, reply: any) => Promise<void> | void
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; address: string; role: JwtRole }
    user: { sub: string; address: string; role: JwtRole }
  }
}
