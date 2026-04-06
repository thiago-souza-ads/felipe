import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

async function verifyJwt(request: any, reply: any) {
  try { await request.jwtVerify() } catch { reply.status(401).send({ error: 'Unauthorized' }) }
}

export async function usersRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient

  // GET /api/users/me
  server.get('/me', { preHandler: [verifyJwt] }, async (request, reply) => {
    const user = (request as any).user as { sub: string }
    const profile = await prisma.userProfile.findUnique({ where: { userId: user.sub } })
    return reply.send(profile || { userId: user.sub, name: null, avatarUrl: null, bio: null })
  })

  // PUT /api/users/me
  server.put('/me', { preHandler: [verifyJwt] }, async (request, reply) => {
    const user = (request as any).user as { sub: string }
    const { name, avatarUrl, bio } = request.body as any
    const profile = await prisma.userProfile.upsert({
      where: { userId: user.sub },
      update: { name, avatarUrl, bio },
      create: { userId: user.sub, name, avatarUrl, bio }
    })
    return reply.send(profile)
  })

  // GET /api/users (admin only)
  server.get('/', { preHandler: [verifyJwt] }, async (request, reply) => {
    const user = (request as any).user as { sub: string; role: string }
    if (user.role !== 'ADMIN') return reply.status(403).send({ error: 'Forbidden' })
    const profiles = await prisma.userProfile.findMany()
    return reply.send(profiles)
  })

  // DELETE /api/users/:id (admin only)
  server.delete('/:id', { preHandler: [verifyJwt] }, async (request, reply) => {
    const user = (request as any).user as { role: string }
    if (user.role !== 'ADMIN') return reply.status(403).send({ error: 'Forbidden' })
    const { id } = request.params as { id: string }
    await prisma.userProfile.deleteMany({ where: { userId: id } })
    return reply.send({ message: 'User deleted' })
  })
}
