import { PrismaClient } from '@/generated/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export class AuthService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient = new PrismaClient()) {
    this.prisma = prisma;
  }

  async signup(username: string, password: string) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { name: username }
    });
    
    if (existingUser) {
      throw new Error('Username already exists');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await this.prisma.user.create({
      data: {
        name: username,
        password: hashedPassword
      }
    });
    
    return { username: user.name };
  }

  async login(username: string, password: string, deviceInfo?: string) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { name: username }
    });
    
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }
    
    // Generate access token
    const accessToken = jwt.sign(
      { userId: user.id, username: user.name },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '30d' }
    );

    // Calculate expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Revoke all previous refersh tokens for user
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, isRevoked: false },
      data: { isRevoked: true }
    });

    // Store refresh token in database
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
        deviceInfo
      }
    });
    
    return {
      username: user.name,
      accessToken,
      refreshToken
    };
  }

  async refresh(refreshToken: string) {
    // Find refresh token in database
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken }
    });
    
    if (!tokenRecord || tokenRecord.isRevoked || tokenRecord.expiresAt < new Date()) {
      throw new Error('Refresh token invalid');
    }

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: tokenRecord.userId }
    });

    if (!user) {
      throw new Error('User not found');
    }
    
    // Generate new access token
    const accessToken = jwt.sign(
      { userId: user.id, username: user.name },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
    
    return {
      username: user.name,
      accessToken
    };
  }
} 