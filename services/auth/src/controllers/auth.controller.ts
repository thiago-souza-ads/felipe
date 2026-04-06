import { FastifyRequest, FastifyReply } from 'fastify'
import { AuthService } from '../services/auth.service.js'

interface RegisterBody { email: string; password: string }
interface LoginBody { email: string; password: string }
interface RefreshBody { refreshToken: string }
interface LogoutBody { refreshToken?: string }

export class AuthController {
  constructor(private authService: AuthService) {}

  async register(request: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) {
    try {
      const { email, password } = request.body
      if (!email || !password) return reply.status(400).send({ error: 'Email and password are required' })
      if (password.length < 6) return reply.status(400).send({ error: 'Password must be at least 6 characters' })

      const user = await this.authService.register({ email, password })
      return reply.status(201).send({ user })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      return reply.status(400).send({ error: message })
    }
  }

  async login(request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) {
    try {
      const { email, password } = request.body
      const user = await this.authService.login({ email, password })

      const accessToken = await reply.jwtSign(
        { sub: user.id, email: user.email, role: user.role },
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      )
      const refreshToken = await this.authService.createRefreshToken(user.id)

      return reply.send({ accessToken, refreshToken, user })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed'
      return reply.status(401).send({ error: message })
    }
  }

  async refresh(request: FastifyRequest<{ Body: RefreshBody }>, reply: FastifyReply) {
    try {
      const { refreshToken } = request.body
      if (!refreshToken) return reply.status(400).send({ error: 'Refresh token required' })

      const user = await this.authService.validateRefreshToken(refreshToken)
      await this.authService.revokeRefreshToken(refreshToken)

      const accessToken = await reply.jwtSign(
        { sub: user.id, email: user.email, role: user.role },
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      )
      const newRefreshToken = await this.authService.createRefreshToken(user.id)

      return reply.send({ accessToken, refreshToken: newRefreshToken })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Token refresh failed'
      return reply.status(401).send({ error: message })
    }
  }

  async logout(request: FastifyRequest<{ Body: LogoutBody }>, reply: FastifyReply) {
    try {
      const { refreshToken } = request.body
      if (refreshToken) await this.authService.revokeRefreshToken(refreshToken)
      return reply.send({ message: 'Logged out successfully' })
    } catch {
      return reply.send({ message: 'Logged out' })
    }
  }
}
