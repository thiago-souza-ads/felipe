import Anthropic from '@anthropic-ai/sdk'
import { PrismaClient } from '@prisma/client'
import { EmbeddingService } from './embedding.service.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export class RagService {
  private embeddingService: EmbeddingService

  constructor(private prisma: PrismaClient) {
    this.embeddingService = new EmbeddingService(prisma)
  }

  async query(userId: string, question: string, documentId?: string): Promise<string> {
    // Generate embedding for the question
    const queryEmbedding = await this.embeddingService.generateEmbedding(question)
    const embeddingStr = `[${queryEmbedding.join(',')}]`

    // Search for similar chunks using pgvector cosine similarity
    let chunks: Array<{ content: string; document_id: string; similarity: number }>

    if (documentId) {
      // Search within a specific document (and verify ownership)
      const doc = await this.prisma.document.findFirst({ where: { id: documentId, userId } })
      if (!doc) throw new Error('Document not found')

      chunks = await this.prisma.$queryRaw`
        SELECT dc.content, dc."documentId" as document_id, 1 - (dc.embedding <=> ${embeddingStr}::vector) as similarity
        FROM document_chunks dc
        JOIN documents d ON d.id = dc."documentId"
        WHERE d."userId" = ${userId} AND dc."documentId" = ${documentId}
        ORDER BY dc.embedding <=> ${embeddingStr}::vector
        LIMIT 5
      `
    } else {
      // Search across all user documents
      chunks = await this.prisma.$queryRaw`
        SELECT dc.content, dc."documentId" as document_id, 1 - (dc.embedding <=> ${embeddingStr}::vector) as similarity
        FROM document_chunks dc
        JOIN documents d ON d.id = dc."documentId"
        WHERE d."userId" = ${userId} AND d.status = 'READY'
        ORDER BY dc.embedding <=> ${embeddingStr}::vector
        LIMIT 8
      `
    }

    if (chunks.length === 0) {
      return 'Não encontrei informações relevantes nos seus documentos para responder essa pergunta.'
    }

    // Build context from chunks
    const context = chunks
      .map((c, i) => `[Trecho ${i + 1}]: ${c.content}`)
      .join('\n\n')

    // Call Claude with the context (RAG)
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      system: `Você é um assistente especializado em análise de documentos. 
Responda as perguntas do usuário baseando-se APENAS nas informações contidas nos trechos de documentos fornecidos.
Se a resposta não estiver nos documentos, diga claramente que não encontrou a informação.
Responda sempre em português do Brasil.`,
      messages: [{
        role: 'user',
        content: `Documentos do usuário (trechos relevantes):\n\n${context}\n\n---\n\nPergunta: ${question}`
      }]
    })

    return response.content[0].type === 'text' ? response.content[0].text : 'Erro ao processar resposta.'
  }
}
