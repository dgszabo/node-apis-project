import { NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { z } from 'zod';

const authService = new AuthService();

// Validation schema for login
const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
  deviceInfo: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, deviceInfo } = loginSchema.parse(body);
    
    const result = await authService.login(username, password, deviceInfo);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      if (error.message === 'Invalid credentials') {
        return NextResponse.json(
          { error: error.message },
          { status: 401 }
        );
      }
    }
    
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 