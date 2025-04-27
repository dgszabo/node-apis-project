import { NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { z } from 'zod';

const authService = new AuthService();

// Validation schema for refresh
const refreshSchema = z.object({
  refreshToken: z.string()
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { refreshToken } = refreshSchema.parse(body);
    
    const result = await authService.refresh(refreshToken);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      if (error.message === 'Refresh token invalid' ||
          error.message === 'Refresh token has expired or been revoked' ||
          error.message === 'User not found') {
        return NextResponse.json(
          { error: 'Invalid refresh token' },
          { status: 401 }
        );
      }
    }
    
    console.error('Refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 