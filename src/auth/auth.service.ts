import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { EMPLOYEE_SELECT } from '../employees/constants/employee.constants';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ========== HELPERS ==========

  /**
   * Hashes a token using SHA-256 (deterministic, fast, O(1) lookup friendly).
   *
   * WHY SHA-256 and NOT bcrypt for refresh tokens?
   * - Refresh tokens are UUIDv4 (122 bits of entropy) → impossible to brute-force.
   * - SHA-256 is deterministic → same input always produces the same hash.
   * - This allows direct DB lookup via `findUnique()` → O(1) instead of O(N).
   * - bcrypt is non-deterministic (random salt) → requires fetching ALL tokens
   *   and comparing one-by-one in a loop → O(N) and blocks the event loop.
   *
   * @see AUTH_SERVICE_DOCS.md for detailed performance comparison.
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates an Access Token (JWT) + Refresh Token (UUID → SHA-256 → DB).
   * Returns both tokens along with the employee data.
   */
  private async generateTokens(employee: {
    id: number;
    email: string;
    role: string;
  }) {
    // 1. Access Token: short-lived JWT with employee claims
    const payload: JwtPayload = {
      sub: employee.id,
      email: employee.email,
      role: employee.role,
    };
    const accessToken = this.jwtService.sign(payload);

    // 2. Refresh Token: long-lived UUID → hashed with SHA-256 → stored in DB
    const rawRefreshToken = uuidv4();
    const hashedRefreshToken = this.hashToken(rawRefreshToken);

    // Parse the refresh token expiry from env (e.g., "7d" → 7 days in ms)
    const expiresIn = this.configService.get<string>(
      'REFRESH_TOKEN_EXPIRES_IN',
      '7d',
    );
    const expiresMs = this.parseDuration(expiresIn);

    await this.prisma.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        employeeId: employee.id,
        expiresAt: new Date(Date.now() + expiresMs),
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken, // Raw UUID → sent to client
    };
  }

  /**
   * Parses duration strings like "7d", "24h", "30m" into milliseconds.
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([dhms])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // Default: 7 days

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'm':
        return value * 60 * 1000;
      case 's':
        return value * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }

  // ========== REGISTER ==========

  async register(dto: RegisterDto) {
    const existingEmployee = await this.prisma.employee.findUnique({
      where: { email: dto.email },
    });
    if (existingEmployee) {
      throw new ConflictException('Email already registered');
    }

    // bcrypt for passwords ✅ (low entropy, needs slow hashing)
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const employee = await this.prisma.employee.create({
      data: {
        ...dto,
        password: hashedPassword,
      },
      select: EMPLOYEE_SELECT,
    });

    const tokens = await this.generateTokens(employee);

    return {
      ...tokens,
      employee,
    };
  }

  // ========== LOGIN ==========

  async login(dto: LoginDto) {
    // We intentionally fetch the full record here (including password)
    // because we need the hash for bcrypt.compare(). This is the ONE place
    // where destructuring is used instead of select — by necessity.
    const employee = await this.prisma.employee.findUnique({
      where: { email: dto.email },
    });

    if (!employee) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // bcrypt.compare for password verification
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      employee.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Prevent deactivated employees from authenticating
    if (!employee.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const tokens = await this.generateTokens(employee);

    // Destructuring is used here instead of select because we already
    // fetched the full record above for bcrypt.compare().
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...employeeData } = employee;

    return {
      ...tokens,
      employee: employeeData,
    };
  }

  // ========== REFRESH ==========

  /**
   * Refreshes the token pair using SHA-256 deterministic hashing.
   *
   * Flow:
   * 1. Hash the incoming raw token with SHA-256 (same hash as stored in DB)
   * 2. Direct O(1) lookup via `findUnique` on the @unique indexed `token` field
   * 3. Validate expiry
   * 4. Token Rotation: delete old token, issue new pair
   *
   * NO loops. NO findMany. NO bcrypt.compare. Just one fast DB hit.
   */
  async refresh(dto: RefreshTokenDto) {
    // SHA-256 hash of the raw token → same as what's stored in DB
    const hashedToken = this.hashToken(dto.refreshToken);

    // O(1) indexed lookup — no loops, no scanning
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: hashedToken },
      include: {
        employee: {
          select: EMPLOYEE_SELECT,
        },
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token has expired
    if (storedToken.expiresAt < new Date()) {
      // Clean up the expired token
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Token Rotation: delete old token before issuing new ones
    await this.prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    const tokens = await this.generateTokens(storedToken.employee);

    return {
      ...tokens,
      employee: storedToken.employee,
    };
  }

  // ========== LOGOUT ==========

  async logout(dto: RefreshTokenDto) {
    const hashedToken = this.hashToken(dto.refreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: hashedToken },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    return { message: 'Logged out successfully' };
  }

  // ========== REVOKE ALL TOKENS ==========

  /**
   * Revokes all refresh tokens for a specific employee.
   * Useful for security breach scenarios or password changes.
   */
  async revokeAllTokens(employeeId: number) {
    const { count } = await this.prisma.refreshToken.deleteMany({
      where: { employeeId },
    });

    return { message: `Revoked ${count} refresh token(s)` };
  }
}
