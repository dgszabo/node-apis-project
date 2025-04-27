import { AuthService } from '../auth.service';
import { PrismaClient } from '@/generated/prisma';
import { sign, verify } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Mock PrismaClient
jest.mock('@/generated/prisma', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
  })),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Set environment variables
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
    prisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    service = new AuthService(prisma);
  });

  describe('signup', () => {
    const mockUser = {
      id: 'user1',
      name: 'testuser',
      password: 'hashedpassword',
    };

    it('should create a new user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashedpassword');
      (prisma.user.create as jest.Mock).mockResolvedValueOnce(mockUser);

      const result = await service.signup('testuser', 'password123');

      expect(result).toEqual({ username: 'testuser' });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { name: 'testuser' },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          name: 'testuser',
          password: 'hashedpassword',
        },
      });
    });

    it('should throw error if username already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);

      await expect(service.signup('testuser', 'password123')).rejects.toThrow('Username already exists');
    });
  });

  describe('login', () => {
    const mockUser = {
      id: 'user1',
      name: 'testuser',
      password: 'hashedpassword',
    };
    const mockAccessToken = 'mock-access-token';
    const mockRefreshToken = 'mock-refresh-token';
    const mockRefreshTokenRecord = {
      id: 'refresh1',
      token: mockRefreshToken,
      userId: mockUser.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      isRevoked: false,
    };

    it('should login user and return tokens', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      (sign as jest.Mock).mockReturnValueOnce(mockAccessToken);
      (sign as jest.Mock).mockReturnValueOnce(mockRefreshToken);
      (prisma.refreshToken.updateMany as jest.Mock).mockResolvedValueOnce({ count: 0 });
      (prisma.refreshToken.create as jest.Mock).mockResolvedValueOnce(mockRefreshTokenRecord);

      const result = await service.login('testuser', 'password123');

      expect(result).toEqual({
        username: 'testuser',
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { name: 'testuser' },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
      expect(sign).toHaveBeenCalledTimes(2);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id, isRevoked: false },
        data: { isRevoked: true },
      });
      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          token: mockRefreshToken,
          userId: mockUser.id,
        }),
      });
    });

    it('should throw error for invalid credentials', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.login('testuser', 'password123')).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for incorrect password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(service.login('testuser', 'wrongpassword')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refresh', () => {
    const mockUser = {
      id: 'user1',
      name: 'testuser',
    };
    const mockRefreshToken = 'mock-refresh-token';
    const mockRefreshTokenRecord = {
      id: 'refresh1',
      token: mockRefreshToken,
      userId: mockUser.id,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      isRevoked: false,
    };
    const mockNewAccessToken = 'new-access-token';

    it('should generate new access token for valid refresh token', async () => {
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValueOnce(mockRefreshTokenRecord);
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);
      (sign as jest.Mock).mockReturnValueOnce(mockNewAccessToken);

      const result = await service.refresh(mockRefreshToken);

      expect(result).toEqual({
        username: 'testuser',
        accessToken: mockNewAccessToken,
      });
      expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { token: mockRefreshToken },
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(sign).toHaveBeenCalledWith(
        { userId: mockUser.id, username: mockUser.name },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    it('should throw error for non-existent refresh token', async () => {
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.refresh(mockRefreshToken)).rejects.toThrow('Refresh token invalid');
    });

    it('should throw error for revoked refresh token', async () => {
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockRefreshTokenRecord,
        isRevoked: true,
      });

      await expect(service.refresh(mockRefreshToken)).rejects.toThrow('Refresh token invalid');
    });

    it('should throw error for expired refresh token', async () => {
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockRefreshTokenRecord,
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      });

      await expect(service.refresh(mockRefreshToken)).rejects.toThrow('Refresh token invalid');
    });

    it('should throw error for non-existent user', async () => {
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValueOnce(mockRefreshTokenRecord);
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.refresh(mockRefreshToken)).rejects.toThrow('User not found');
    });
  });
});
