import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export class InteractionsService {
  async updateInteraction(
    userId: string, 
    exerciseId: string, 
    updates: {
      isSaved?: boolean;
      isFavorited?: boolean;
      rating?: number | null;
    }
  ) {
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId, deletedAt: null, isPublic: true },
    });

    if (!exercise) {
      throw new Error("Exercise not found");
    }

    if (exercise.creatorId === userId) {
      throw new Error("Cannot interact with your own exercise");
    }

    const userExercise = await prisma.userExercise.upsert({
      where: {
        userId_exerciseId: {
          userId,
          exerciseId,
        },
      },
      create: {
        userId,
        exerciseId,
        isSaved: updates.isSaved ?? false,
        isFavorited: updates.isFavorited ?? false,
        rating: updates.rating ?? null,
      },
      update: {
        isSaved: updates.isSaved,
        isFavorited: updates.isFavorited,
        rating: updates.rating,
      },
      select: {
        exerciseId: true,
        isSaved: true,
        isFavorited: true,
        rating: true,
      },
    });

    return userExercise;
  }
}
