import { NextResponse } from 'next/server';
import { ExerciseService } from '@/services/exercise.service';
import { z } from 'zod';

const exerciseService = new ExerciseService();

// Validation schema for updating an exercise
const updateExerciseSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  difficulty: z.number().min(1).max(5).optional()
});

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, description, difficulty } = updateExerciseSchema.parse(body);
    
    // TODO: Get userId from JWT token
    const userId = 'temp-user-id';
    
    const exercise = await exerciseService.updateExercise(
      params.id,
      userId,
      name,
      description,
      difficulty
    );
    
    return NextResponse.json(exercise);
  } catch (error) {
    console.error('Update exercise error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      if (error.message == 'Exercise not found' || error.message == 'Exercise not found') {
        return NextResponse.json(
          { error: 'Exercise not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Get userId from JWT token
    const userId = 'temp-user-id';
    
    await exerciseService.deleteExercise(params.id, userId);
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Delete exercise error:', error);
    if (error instanceof Error) {
      if (error.message === 'Exercise not found' || error.message === 'Not authorized to delete this exercise') {
        return NextResponse.json(
          { error: 'Exercise not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 