import { NextResponse } from 'next/server';
import { ExerciseService } from '@/services/exercise.service';
import { getUserIdFromHeader } from '@/utils/auth';
import { z } from 'zod';

const exerciseService = new ExerciseService();

// Validation schema for updating an exercise
const updateExerciseSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  difficulty: z.number().min(1).max(5).optional()
}).refine(
  (data) => data.name !== undefined || data.description !== undefined || data.difficulty !== undefined,
  { message: "At least one field (name, description, or difficulty) must be provided" }
);

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { name, description, difficulty } = updateExerciseSchema.parse(body);
    
    const userId = getUserIdFromHeader(request);
    
    const exercise = await exerciseService.updateExercise(
      id,
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
      if (error.message === 'Exercise not found' || error.message === 'Not authorized to modify this exercise') {
        return NextResponse.json(
          { error: 'Exercise not found' },
          { status: 404 }
        );
      }
      if (error.message === 'User ID not found in request') {
        return NextResponse.json(
          { error: error.message },
          { status: 401 }
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
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const userId = getUserIdFromHeader(request);
    
    await exerciseService.deleteExercise(id, userId);
    
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
      if (error.message === 'User ID not found in request') {
        return NextResponse.json(
          { error: error.message },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 