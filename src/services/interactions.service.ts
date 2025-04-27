import { PrismaClient } from '@/generated/prisma';

export class InteractionsService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient = new PrismaClient()) {
    this.prisma = prisma;
  }

  async updateInteraction(
    userId: string, 
    exerciseId: string, 
    updates: {
      isSaved?: boolean;
      isFavorited?: boolean;
      rating?: number | null;
    }
  ) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
    });

    if (!exercise || exercise.deletedAt || !exercise.isPublic) {
      throw new Error("Exercise not found");
    }

    if (exercise.creatorId === userId) {
      throw new Error("Cannot interact with your own exercise");
    }

    const userExercise = await this.prisma.userExercise.upsert({
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
