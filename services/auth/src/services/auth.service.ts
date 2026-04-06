import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

interface RegisterInput {
  email: string
  password: string
}

interface LoginInput {
  email: string
  password: string
}

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async register(data: RegisterInput) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } })
    if (existing) throw new Error('Email already in use')

    const passwordHash = await bcrypt.hash(data.password, 12)
    const user = await this.prisma.user.create({
      data: { email: data.email, passwordHash },
      select: { id: true, email: true, role: true, createdAt: true }
    })
    return user
  }

  async login(data: LoginInput) {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } })
    if (!user) throw new Error('Invalid credentials')

    const valid = await bcrypt.compare(data.password, user.passwordHash)
    if (!valid) throw new Error('Invalid credentials')

    return { id: user.id, email: user.email, role: user.role }
  }

  async createRefreshToken(userId: string) {
    const token = uuidv4()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    await this.prisma.refreshToken.create({ data: { token, userId, expiresAt } })
    return token
  }

  async validateRefreshToken(token: string) {
    const rt = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { select: { id: true, email: true, role: true } } }
    })
    if (!rt || rt.expiresAt < new Date()) {
      if (rt) await this.prisma.refreshToken.delete({ where: { token } })
      throw new Error('Invalid or expired refresh token')
    }
    return rt.user
  }

  async revokeRefreshToken(token: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token } })
  }

  async revokeAllUserTokens(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } })
  }
}
