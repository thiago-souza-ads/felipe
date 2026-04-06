import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

export class DocsService {
  private s3: S3Client
  private bucket: string

  constructor(private prisma: PrismaClient) {
    this.s3 = new S3Client({
      endpoint: process.env.MINIO_ENDPOINT || 'http://minio:9000',
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
      },
      forcePathStyle: true
    })
    this.bucket = process.env.MINIO_BUCKET || 'felipe-docs'
  }

  async uploadFile(userId: string, fileName: string, fileType: string, buffer: Buffer) {
    const minioKey = `${userId}/${uuidv4()}-${fileName}`
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: minioKey,
      Body: buffer,
      ContentType: fileType
    }))

    const doc = await this.prisma.document.create({
      data: {
        userId,
        fileName,
        fileType,
        fileSize: buffer.length,
        minioKey,
        status: 'PROCESSING'
      }
    })
    return doc
  }

  async getSignedDownloadUrl(minioKey: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: minioKey })
    return getSignedUrl(this.s3, command, { expiresIn: 3600 })
  }

  async listDocuments(userId: string) {
    return this.prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, fileName: true, fileType: true, fileSize: true, status: true, createdAt: true }
    })
  }

  async getDocument(id: string, userId: string) {
    return this.prisma.document.findFirst({
      where: { id, userId }
    })
  }

  async deleteDocument(id: string, userId: string) {
    const doc = await this.prisma.document.findFirst({ where: { id, userId } })
    if (!doc) throw new Error('Document not found')

    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: doc.minioKey }))
    await this.prisma.document.delete({ where: { id } })
  }

  async updateStatus(id: string, status: 'PROCESSING' | 'READY' | 'ERROR') {
    await this.prisma.document.update({ where: { id }, data: { status } })
  }
}
