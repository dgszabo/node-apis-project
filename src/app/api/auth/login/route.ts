import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema for login
const loginSchema = z.object({
  username: z.string(),
  password: z.string()
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate input
    const { username, password } = loginSchema.parse(body);
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { name: username }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.name },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
    
    return NextResponse.json({
      username: user.name,
      token
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 