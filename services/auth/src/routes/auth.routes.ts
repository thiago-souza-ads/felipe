import { FastifyInstance } from 'fastify'
import { AuthController } from '../controllers/auth.controller.js'
import { AuthService } from '../services/auth.service.js'

export async function authRoutes(server: FastifyInstance) {
  const authService = new AuthService(server.prisma)
  const controller = new AuthController(authService)

  server.post('/register', (req, reply) => controller.register(req as any, reply))
  server.post('/login', (req, reply) => controller.login(req as any, reply))
  server.post('/refresh', (req, reply) => controller.refresh(req as any, reply))
  server.post('/logout', (req, reply) => controller.logout(req as any, reply))

  server.get('/me', {
    preHandler: [async (req, reply) => { try { await req.jwtVerify() } catch { reply.status(401).send({ error: 'Unauthorized' }) } }]
  }, async (request, reply) => {
    const user = request.user as { sub: string; email: string; role: string }
    return reply.send({ id: user.sub, email: user.email, role: user.role })
  })
}
