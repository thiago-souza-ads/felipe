import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import prismaPlugin from './plugins/prisma.plugin.js'
import { authRoutes } from './routes/auth.routes.js'

const server = Fastify({ logger: true })

async function bootstrap() {
  await server.register(cors, { origin: true })
  await server.register(jwt, { secret: process.env.JWT_SECRET || 'changeme-secret' })
  await server.register(prismaPlugin)
  await server.register(authRoutes, { prefix: '/api/auth' })

  server.get('/health', async () => ({ status: 'ok', service: 'auth' }))

  const port = parseInt(process.env.PORT || '3001')
  await server.listen({ port, host: '0.0.0.0' })
  console.log(`Auth service running on port ${port}`)
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})
