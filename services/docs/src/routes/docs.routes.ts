import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { DocsService } from '../services/docs.service.js'
import { EmbeddingService } from '../services/embedding.service.js'
import { RagService } from '../services/rag.service.js'

async function verifyJwt(request: any, reply: any) {
  try { await request.jwtVerify() } catch { reply.status(401).send({ error: 'Unauthorized' }) }
}

export async function docsRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient
  const docsService = new DocsService(prisma)
  const embeddingService = new EmbeddingService(prisma)
  const ragService = new RagService(prisma)

  // POST /api/docs/upload
  server.post('/upload', { preHandler: [verifyJwt] }, async (request, reply) => {
    const user = (request as any).user as { sub: string }
    try {
      const data = await (request as any).file()
      if (!data) return reply.status(400).send({ error: 'No file uploaded' })

      const buffer = await data.toBuffer()
      const doc = await docsService.uploadFile(user.sub, data.filename, data.mimetype, buffer)

      // Process async (don't await — return immediately)
      embeddingService.processDocument(doc.id, buffer, data.mimetype).catch(console.error)

      return reply.status(201).send({ document: doc, message: 'Upload iniciado. Processamento em andamento.' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      return reply.status(500).send({ error: message })
    }
  })

  // GET /api/docs
  server.get('/', { preHandler: [verifyJwt] }, async (request, reply) => {
    const user = (request as any).user as { sub: string }
    const documents = await docsService.listDocuments(user.sub)
    return reply.send({ documents })
  })

  // GET /api/docs/:id
  server.get('/:id', { preHandler: [verifyJwt] }, async (request, reply) => {
    const user = (request as any).user as { sub: string }
    const { id } = request.params as { id: string }
    const doc = await docsService.getDocument(id, user.sub)
    if (!doc) return reply.status(404).send({ error: 'Document not found' })

    const downloadUrl = await docsService.getSignedDownloadUrl(doc.minioKey)
    return reply.send({ document: { ...doc, downloadUrl } })
  })

  // DELETE /api/docs/:id
  server.delete('/:id', { preHandler: [verifyJwt] }, async (request, reply) => {
    const user = (request as any).user as { sub: string }
    const { id } = request.params as { id: string }
    try {
      await docsService.deleteDocument(id, user.sub)
      return reply.send({ message: 'Document deleted' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete failed'
      return reply.status(404).send({ error: message })
    }
  })

  // POST /api/docs/chat
  server.post('/chat', { preHandler: [verifyJwt] }, async (request, reply) => {
    const user = (request as any).user as { sub: string }
    const { question, documentId } = request.body as { question: string; documentId?: string }

    if (!question) return reply.status(400).send({ error: 'Question is required' })

    try {
      const answer = await ragService.query(user.sub, question, documentId)
      return reply.send({ answer, question })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Chat failed'
      return reply.status(500).send({ error: message })
    }
  })
}
