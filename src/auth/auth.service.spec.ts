/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

// ========== MOCK DATA ==========

const now = new Date();
const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days ahead
const pastDate = new Date(Date.now() - 1000); // 1 second ago (expired)

const mockEmployeeWithPassword = {
  id: 1,
  name: 'Waleed Hammad',
  email: 'waleed@example.com',
  password: '$2b$10$hashedpassword', // bcrypt hash placeholder
  role: 'ENGINEER',
  isActive: true,
  createdAt: now,
  updatedAt: now,
};

const mockEmployeeSelected = {
  id: 1,
  name: 'Waleed Hammad',
  email: 'waleed@example.com',
  role: 'ENGINEER',
  isActive: true,
  createdAt: now,
  updatedAt: now,
};

const mockStoredToken = {
  id: 1,
  token: 'sha256-hashed-token',
  employeeId: 1,
  expiresAt: futureDate,
  createdAt: now,
  employee: mockEmployeeSelected,
};

const mockExpiredToken = {
  id: 2,
  token: 'sha256-hashed-expired',
  employeeId: 1,
  expiresAt: pastDate,
  createdAt: now,
  employee: mockEmployeeSelected,
};

// ========== MOCKS ==========

const mockPrismaService = {
  employee: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-access-token'),
};

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: string) => {
    const config: Record<string, string> = {
      REFRESH_TOKEN_EXPIRES_IN: '7d',
    };
    return config[key] ?? defaultValue;
  }),
};

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-v4'),
}));

// ========== TEST SUITE ==========

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================
  // REGISTER
  // ==========================================

  describe('register', () => {
    const registerDto = {
      name: 'Waleed Hammad',
      email: 'waleed@example.com',
      password: 'secure123',
      role: 'ENGINEER' as const,
    };

    it('should register a new employee and return tokens + employee data', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashed');
      mockPrismaService.employee.create.mockResolvedValue(mockEmployeeSelected);
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken', 'mock-access-token');
      expect(result).toHaveProperty('refreshToken', 'mock-uuid-v4');
      expect(result).toHaveProperty('employee');
      expect(result.employee).toEqual(mockEmployeeSelected);

      // Verify bcrypt was used for password (NOT SHA-256)
      expect(bcrypt.hash).toHaveBeenCalledWith('secure123', 10);

      // Verify employee was created with hashed password and select pattern
      expect(mockPrismaService.employee.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ password: '$2b$10$hashed' }),
          select: expect.objectContaining({
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
          }),
        }),
      );

      // Verify password is NOT in the response
      expect(result.employee).not.toHaveProperty('password');
    });

    it('should throw ConflictException (409) if email already exists', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(
        mockEmployeeWithPassword,
      );

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Email already registered',
      );

      // Verify no employee was created
      expect(mockPrismaService.employee.create).not.toHaveBeenCalled();
    });

    it('should store refresh token as SHA-256 hash in DB (not raw UUID)', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashed');
      mockPrismaService.employee.create.mockResolvedValue(mockEmployeeSelected);
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      await service.register(registerDto);

      // The token stored in DB should NOT be the raw UUID
      const createCall = mockPrismaService.refreshToken.create.mock.calls[0][0];
      expect(createCall.data.token).not.toBe('mock-uuid-v4');
      // It should be a 64-char hex string (SHA-256 output)
      expect(createCall.data.token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should propagate database errors during registration', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashed');
      mockPrismaService.employee.create.mockRejectedValue(
        new Error('Database connection lost'),
      );

      await expect(service.register(registerDto)).rejects.toThrow(
        'Database connection lost',
      );
    });
  });

  // ==========================================
  // LOGIN
  // ==========================================

  describe('login', () => {
    const loginDto = {
      email: 'waleed@example.com',
      password: 'secure123',
    };

    it('should login successfully and return tokens + employee data (without password)', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(
        mockEmployeeWithPassword,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken', 'mock-access-token');
      expect(result).toHaveProperty('refreshToken', 'mock-uuid-v4');
      expect(result).toHaveProperty('employee');

      // CRITICAL: password must NEVER be in the response
      expect(result.employee).not.toHaveProperty('password');
      expect(result.employee).toHaveProperty('id', 1);
      expect(result.employee).toHaveProperty('email', 'waleed@example.com');
    });

    it('should throw UnauthorizedException (401) if email is not found', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );

      // Verify bcrypt.compare was never called (no need if user doesn't exist)
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException (401) if password is wrong', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(
        mockEmployeeWithPassword,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );

      // Verify no tokens were generated
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should use same error message for wrong email and wrong password (prevent email enumeration)', async () => {
      // Test wrong email
      mockPrismaService.employee.findUnique.mockResolvedValue(null);
      try {
        await service.login(loginDto);
      } catch (e) {
        expect((e as UnauthorizedException).message).toBe(
          'Invalid credentials',
        );
      }

      // Test wrong password
      mockPrismaService.employee.findUnique.mockResolvedValue(
        mockEmployeeWithPassword,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      try {
        await service.login(loginDto);
      } catch (e) {
        expect((e as UnauthorizedException).message).toBe(
          'Invalid credentials',
        );
      }
    });

    it('should throw UnauthorizedException (401) if account is deactivated', async () => {
      const inactiveEmployee = { ...mockEmployeeWithPassword, isActive: false };
      mockPrismaService.employee.findUnique.mockResolvedValue(inactiveEmployee);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Account is deactivated',
      );

      // Verify no tokens were generated for deactivated account
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should propagate database errors during login', async () => {
      mockPrismaService.employee.findUnique.mockRejectedValue(
        new Error('Connection timeout'),
      );

      await expect(service.login(loginDto)).rejects.toThrow(
        'Connection timeout',
      );
    });
  });

  // ==========================================
  // REFRESH
  // ==========================================

  describe('refresh', () => {
    const refreshDto = { refreshToken: 'raw-uuid-token' };

    it('should refresh tokens successfully with O(1) lookup (no loops)', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(
        mockStoredToken,
      );
      mockPrismaService.refreshToken.delete.mockResolvedValue({});
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh(refreshDto);

      expect(result).toHaveProperty('accessToken', 'mock-access-token');
      expect(result).toHaveProperty('refreshToken', 'mock-uuid-v4');
      expect(result).toHaveProperty('employee');

      // Verify findUnique was used (O(1)) — NOT findMany
      expect(mockPrismaService.refreshToken.findUnique).toHaveBeenCalledTimes(
        1,
      );

      // Verify the old token was deleted (Token Rotation)
      expect(mockPrismaService.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: mockStoredToken.id },
      });

      // Verify a new token was created
      expect(mockPrismaService.refreshToken.create).toHaveBeenCalledTimes(1);
    });

    it('should hash the incoming token with SHA-256 before DB lookup', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(
        mockStoredToken,
      );
      mockPrismaService.refreshToken.delete.mockResolvedValue({});
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      await service.refresh(refreshDto);

      // The token passed to findUnique should be SHA-256 hash, not raw
      const findCall =
        mockPrismaService.refreshToken.findUnique.mock.calls[0][0];
      expect(findCall.where.token).not.toBe('raw-uuid-token');
      expect(findCall.where.token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should throw UnauthorizedException (401) if refresh token is invalid', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh(refreshDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refresh(refreshDto)).rejects.toThrow(
        'Invalid refresh token',
      );

      // Verify no token deletion or creation happened
      expect(mockPrismaService.refreshToken.delete).not.toHaveBeenCalled();
      expect(mockPrismaService.refreshToken.create).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException (401) and clean up if token is expired', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(
        mockExpiredToken,
      );
      mockPrismaService.refreshToken.delete.mockResolvedValue({});

      await expect(service.refresh(refreshDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refresh(refreshDto)).rejects.toThrow(
        'Refresh token has expired',
      );

      // Verify expired token was cleaned up from DB
      expect(mockPrismaService.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: mockExpiredToken.id },
      });

      // Verify no new tokens were generated
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should implement token rotation (delete old, create new)', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(
        mockStoredToken,
      );
      mockPrismaService.refreshToken.delete.mockResolvedValue({});
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      await service.refresh(refreshDto);

      // Old token must be deleted BEFORE new one is created
      const deleteCall =
        mockPrismaService.refreshToken.delete.mock.invocationCallOrder[0];
      const createCall =
        mockPrismaService.refreshToken.create.mock.invocationCallOrder[0];
      expect(deleteCall).toBeLessThan(createCall);
    });

    it('should not return password in employee data during refresh', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(
        mockStoredToken,
      );
      mockPrismaService.refreshToken.delete.mockResolvedValue({});
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh(refreshDto);

      expect(result.employee).not.toHaveProperty('password');
    });
  });

  // ==========================================
  // LOGOUT
  // ==========================================

  describe('logout', () => {
    const logoutDto = { refreshToken: 'raw-uuid-token' };

    it('should logout successfully and delete the refresh token', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        id: 1,
        token: 'hashed',
      });
      mockPrismaService.refreshToken.delete.mockResolvedValue({});

      const result = await service.logout(logoutDto);

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(mockPrismaService.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw UnauthorizedException (401) if refresh token is invalid', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.logout(logoutDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.logout(logoutDto)).rejects.toThrow(
        'Invalid refresh token',
      );

      // Verify no deletion happened
      expect(mockPrismaService.refreshToken.delete).not.toHaveBeenCalled();
    });

    it('should hash the token before looking up in DB', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        id: 1,
        token: 'hashed',
      });
      mockPrismaService.refreshToken.delete.mockResolvedValue({});

      await service.logout(logoutDto);

      const findCall =
        mockPrismaService.refreshToken.findUnique.mock.calls[0][0];
      expect(findCall.where.token).not.toBe('raw-uuid-token');
      expect(findCall.where.token).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  // ==========================================
  // REVOKE ALL TOKENS
  // ==========================================

  describe('revokeAllTokens', () => {
    it('should revoke all tokens for a given employee', async () => {
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 3 });

      const result = await service.revokeAllTokens(1);

      expect(result).toEqual({ message: 'Revoked 3 refresh token(s)' });
      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { employeeId: 1 },
      });
    });

    it('should handle case where employee has no tokens', async () => {
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.revokeAllTokens(999);

      expect(result).toEqual({ message: 'Revoked 0 refresh token(s)' });
    });

    it('should propagate database errors', async () => {
      mockPrismaService.refreshToken.deleteMany.mockRejectedValue(
        new Error('Foreign key constraint failed'),
      );

      await expect(service.revokeAllTokens(1)).rejects.toThrow(
        'Foreign key constraint failed',
      );
    });
  });

  // ==========================================
  // SHA-256 CONSISTENCY
  // ==========================================

  describe('SHA-256 hashing consistency', () => {
    it('should produce the same hash for the same input (deterministic)', async () => {
      // Register twice with different calls but observe the refresh token hashing
      mockPrismaService.employee.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashed');
      mockPrismaService.employee.create.mockResolvedValue(mockEmployeeSelected);
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      await service.register({
        name: 'Test',
        email: 'test@test.com',
        password: 'pass123',
      });

      await service.register({
        name: 'Test 2',
        email: 'test2@test.com',
        password: 'pass456',
      });

      // Both calls should produce the same SHA-256 hash for the same UUID mock
      const hash1 =
        mockPrismaService.refreshToken.create.mock.calls[0][0].data.token;
      const hash2 =
        mockPrismaService.refreshToken.create.mock.calls[1][0].data.token;
      expect(hash1).toBe(hash2); // Same input UUID → same hash
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // Valid SHA-256
    });
  });
});
