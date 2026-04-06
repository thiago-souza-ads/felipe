import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import fp from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'
import { usersRoutes } from './routes/users.routes.js'

const server = Fastify({ logger: true })

async function bootstrap() {
  await server.register(cors, { origin: true })
  await server.register(jwt, { secret: process.env.JWT_SECRET || 'changeme-secret' })

  // Prisma plugin
  await server.register(fp(async (s) => {
    const prisma = new PrismaClient()
    await prisma.$connect()
    s.decorate('prisma', prisma)
    s.addHook('onClose', async (i) => { await i.prisma.$disconnect() })
  }))

  await server.register(usersRoutes, { prefix: '/api/users' })
  server.get('/health', async () => ({ status: 'ok', service: 'users' }))

  const port = parseInt(process.env.PORT || '3002')
  await server.listen({ port, host: '0.0.0.0' })
  console.log(`Users service running on port ${port}`)
}

bootstrap().catch((err) => { console.error(err); process.exit(1) })
