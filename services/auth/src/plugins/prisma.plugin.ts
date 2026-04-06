import { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { PrismaClient } from '@prisma/client'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

const prismaPlugin: FastifyPluginAsync = async (server: FastifyInstance) => {
  const prisma = new PrismaClient()
  await prisma.$connect()
  server.decorate('prisma', prisma)
  server.addHook('onClose', async (instance: FastifyInstance) => {
    await instance.prisma.$disconnect()
  })
}

export default prismaPlugin
