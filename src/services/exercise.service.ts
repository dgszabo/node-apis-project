import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export class ExerciseService {
  async createExercise(
    name: string,
    description: string,
    difficulty: number,
    isPublic: boolean,
    creatorId: string
  ) {
    // Validate if user exists
    const user = await prisma.user.findUnique({
      where: { id: creatorId }
    });

    if (!user) {
      throw new Error('User not found');
    }
    
    return prisma.exercise.create({
      data: {
        name,
        description,
        difficulty,
        isPublic,
        creatorId
      }
    });
  }

  async updateExercise(
    id: string,
    userId: string,
    name?: string,
    description?: string,
    difficulty?: number
  ) {
    // Get the exercise
    const exercise = await prisma.exercise.findUnique({
      where: { id }
    });

    if (!exercise) {
      throw new Error('Exercise not found');
    }

    // Check if user has permission to modify
    if (!exercise.isPublic && exercise.creatorId !== userId) {
      throw new Error('Not authorized to modify this exercise');
    }

    // Create update data object with only provided fields
    const updateData: {
      name?: string;
      description?: string;
      difficulty?: number;
    } = {};

    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (difficulty) updateData.difficulty = difficulty;

    // Update the exercise
    return prisma.exercise.update({
      where: { id },
      data: updateData
    });
  }

  async deleteExercise(exerciseId: string, userId: string) {
    // Get the exercise
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId }
    });

    if (!exercise) {
      throw new Error('Exercise not found');
    }

    // Check if user has permission to delete
    if (!exercise.isPublic && exercise.creatorId !== userId) {
      throw new Error('Not authorized to delete this exercise');
    }

    // Soft delete the exercise
    return prisma.exercise.update({
      where: { id: exerciseId },
      data: { deletedAt: new Date() }
    });
  }
} 