import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'Pong',
    timestamp: new Date().toISOString()
  });
} 