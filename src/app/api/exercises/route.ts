import { NextResponse } from 'next/server';
import { ExerciseService } from '@/services/exercise.service';
import { getUserIdFromHeader } from '@/utils/auth';
import { z } from 'zod';

const exerciseService = new ExerciseService();

// Validation schema for creating an exercise
const createExerciseSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(10),
  difficulty: z.number().min(1).max(5),
  isPublic: z.boolean().optional()
});

// Validation schema for listing exercises
const listExercisesSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  difficulty: z.string().optional().transform(val => val ? Number(val) : undefined),
  sortBy: z.enum(['difficulty']).optional()
});

export async function GET(request: Request) {
  try {
    const userId = getUserIdFromHeader(request);
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const query = {
      name: searchParams.get('name') || undefined,
      description: searchParams.get('description') || undefined,
      difficulty: searchParams.get('difficulty') || undefined,
      sortBy: searchParams.get('sortBy') as 'difficulty' | null || undefined
    };
    
    // Parse and validate query parameters
    const { name, description, difficulty, sortBy } = listExercisesSchema.parse(query);
    
    const exercises = await exerciseService.listExercises(
      userId,
      { name, description, difficulty },
      sortBy
    );
    
    return NextResponse.json(exercises);
  } catch (error) {
    console.error('List exercises error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'User ID not found in request') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, difficulty, isPublic } = createExerciseSchema.parse(body);
    
    const userId = getUserIdFromHeader(request);
    
    const exercise = await exerciseService.createExercise(
      name,
      description,
      difficulty,
      isPublic ?? false,
      userId
    );
    
    return NextResponse.json(exercise, { status: 201 });
  } catch (error) {
    console.error('Create exercise error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'User ID not found in request') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 