import Anthropic from '@anthropic-ai/sdk'
import { PrismaClient } from '@prisma/client'
import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export class EmbeddingService {
  constructor(private prisma: PrismaClient) {}

  async extractText(buffer: Buffer, fileType: string): Promise<string> {
    const mime = fileType.toLowerCase()

    if (mime.includes('pdf')) {
      const data = await pdfParse(buffer)
      return data.text
    }

    if (mime.includes('word') || mime.includes('docx') || mime.includes('document')) {
      const result = await mammoth.extractRawText({ buffer })
      return result.value
    }

    if (mime.includes('text') || mime.includes('plain')) {
      return buffer.toString('utf-8')
    }

    if (mime.includes('sheet') || mime.includes('excel') || mime.includes('xlsx')) {
      // For xlsx, return a description via Claude Vision
      return await this.extractViaClaudeVision(buffer, 'spreadsheet')
    }

    if (mime.includes('image') || mime.includes('png') || mime.includes('jpg') || mime.includes('jpeg')) {
      return await this.extractViaClaudeVision(buffer, 'image')
    }

    return buffer.toString('utf-8')
  }

  private async extractViaClaudeVision(buffer: Buffer, type: string): Promise<string> {
    const base64 = buffer.toString('base64')
    const mediaType = type === 'image' ? 'image/png' : 'image/png'

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: 'Extract and describe all text and content from this document/image in detail.' }
        ]
      }]
    })

    const content = response.content[0]
    return content.type === 'text' ? content.text : ''
  }

  chunkText(text: string, chunkSize = 800, overlap = 100): string[] {
    const chunks: string[] = []
    let start = 0
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length)
      chunks.push(text.slice(start, end).trim())
      start += chunkSize - overlap
    }
    return chunks.filter(c => c.length > 20)
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Use Claude to get a semantic representation via embeddings endpoint
    // Anthropic doesn't have a native embeddings API yet; we use a small model
    // to create a "fake" embedding via token logprobs approximation.
    // Production recommendation: use voyage-3 or openai text-embedding-3-small.
    // Here we use a simple deterministic hash-based embedding for compatibility.
    // Replace with: import OpenAI from 'openai'; openai.embeddings.create(...)
    // or voyage-ai client when available.

    // For now, call Claude to summarize and hash for a 1536-dim vector
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `Summarize the following text in exactly 100 words for semantic indexing:\n\n${text.slice(0, 2000)}`
      }]
    })

    const summary = response.content[0].type === 'text' ? response.content[0].text : text
    return this.hashToVector(summary, 1536)
  }

  private hashToVector(text: string, dimensions: number): number[] {
    const vector = new Array(dimensions).fill(0)
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i)
      vector[i % dimensions] += charCode / 1000
    }
    // Normalize
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
    return vector.map(v => magnitude > 0 ? v / magnitude : 0)
  }

  async processDocument(documentId: string, buffer: Buffer, fileType: string) {
    try {
      const text = await this.extractText(buffer, fileType)
      const chunks = this.chunkText(text)

      for (let i = 0; i < chunks.length; i++) {
        const embedding = await this.generateEmbedding(chunks[i])
        const embeddingStr = `[${embedding.join(',')}]`

        await this.prisma.$executeRaw`
          INSERT INTO document_chunks (id, document_id, content, embedding, chunk_index, created_at)
          VALUES (gen_random_uuid(), ${documentId}, ${chunks[i]}, ${embeddingStr}::vector, ${i}, NOW())
        `
      }

      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'READY' }
      })
    } catch (err) {
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'ERROR' }
      })
      throw err
    }
  }
}
