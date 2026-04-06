import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import fp from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'
import { docsRoutes } from './routes/docs.routes.js'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

const server = Fastify({ logger: true })

async function bootstrap() {
  await server.register(cors, { origin: true })
  await server.register(jwt, { secret: process.env.JWT_SECRET || 'changeme-secret' })
  await server.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } }) // 50MB

  await server.register(fp(async (s) => {
    const prisma = new PrismaClient()
    await prisma.$connect()
    s.decorate('prisma', prisma)
    s.addHook('onClose', async (i: FastifyInstance) => { await i.prisma.$disconnect() })
  }))

  await server.register(docsRoutes, { prefix: '/api/docs' })
  server.get('/health', async () => ({ status: 'ok', service: 'docs' }))

  const port = parseInt(process.env.PORT || '3003')
  await server.listen({ port, host: '0.0.0.0' })
  console.log(`Docs service running on port ${port}`)
}

bootstrap().catch((err) => { console.error(err); process.exit(1) })
