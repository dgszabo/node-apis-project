import { NextResponse } from 'next/server';
import { ExerciseService } from '@/services/exercise.service';
import { z } from 'zod';

const exerciseService = new ExerciseService();

// Validation schema for creating an exercise
const createExerciseSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  difficulty: z.number().min(1).max(5),
  isPublic: z.boolean().optional()
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, difficulty, isPublic } = createExerciseSchema.parse(body);
    
    // TODO: Get userId from JWT token
    const userId = 'temp-user-id';
    
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

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 