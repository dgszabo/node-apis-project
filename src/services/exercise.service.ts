import { PrismaClient } from '@/generated/prisma';

export class ExerciseService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient = new PrismaClient()) {
    this.prisma = prisma;
  }

  async createExercise(
    name: string,
    description: string,
    difficulty: number,
    isPublic: boolean,
    creatorId: string
  ) {
    // Validate if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: creatorId }
    });

    if (!user) {
      throw new Error('User not found');
    }
    
    const exercise = await this.prisma.exercise.create({
      data: {
        name,
        description,
        difficulty,
        isPublic,
        creatorId
      },
      select: {
        id: true,
        name: true,
        description: true,
        difficulty: true,
        isPublic: true
      }
    });
    return exercise;
  }

  async updateExercise(
    id: string,
    userId: string,
    name?: string,
    description?: string,
    difficulty?: number
  ) {
    // Get the exercise
    const exercise = await this.prisma.exercise.findUnique({
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
    return this.prisma.exercise.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        difficulty: true,
        isPublic: true
      }
    });
  }

  async deleteExercise(exerciseId: string, userId: string) {
    // Get the exercise
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId, deletedAt: null }
    });

    if (!exercise) {
      throw new Error('Exercise not found');
    }

    // Check if user has permission to delete
    if (!exercise.isPublic && exercise.creatorId !== userId) {
      throw new Error('Not authorized to delete this exercise');
    }

    // Soft delete the exercise
    return this.prisma.exercise.update({
      where: { id: exerciseId },
      data: { deletedAt: new Date() },
      select: {
        id: true,
        name: true,
        description: true,
        difficulty: true,
        isPublic: true
      }
    });
  }

  async getExercise(id: string, userId: string) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id }
    });

    if (!exercise) {
      throw new Error('Exercise not found');
    }

    // Check if user has permission to view
    if (!exercise.isPublic && exercise.creatorId !== userId) {
      throw new Error('Not authorized to view this exercise');
    }

    return this.prisma.exercise.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        difficulty: true,
        isPublic: true,
        userExercises: {
          select: {
            isSaved: true,
            isFavorited: true,
            rating: true,
          },
        },
      },
    }).then(exercise => {
      if (!exercise) return null;

      const saveCount = exercise.userExercises.filter(ue => ue.isSaved).length;
      const favoriteCount = exercise.userExercises.filter(ue => ue.isFavorited).length;
      const ratings = exercise.userExercises.map(ue => ue.rating).filter((r): r is number => r !== null);
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
        : null;

      const { userExercises, ...rest } = exercise;
      return {
        ...rest,
        saveCount,
        favoriteCount,
        averageRating,
      };
    });
  }

  async listExercises(
    userId: string,
    filters?: {
      name?: string;
      description?: string;
      difficulty?: number;
    },
    sortBy?: 'difficulty'
  ) {
    // Build the where clause
    const where = {
      deletedAt: null,
      OR: [
        { isPublic: true },
        { creatorId: userId }
      ],
      ...(filters?.name && {
        name: {
          contains: filters.name,
          mode: 'insensitive' as const
        }
      }),
      ...(filters?.description && {
        description: {
          contains: filters.description,
          mode: 'insensitive' as const
        }
      }),
      ...(filters?.difficulty && {
        difficulty: filters.difficulty
      })
    };

    // Build the orderBy clause
    const orderBy = sortBy === 'difficulty' 
      ? { difficulty: 'asc' as const }
      : undefined;

    return this.prisma.exercise.findMany({
      where,
      orderBy,
      select: {
        id: true,
        name: true,
        description: true,
        difficulty: true,
        isPublic: true,
        userExercises: {
          select: {
            isSaved: true,
            isFavorited: true,
            rating: true,
          },
        },
      },
    }).then(exercises => 
      exercises.map(exercise => {
        const saveCount = exercise.userExercises.filter(ue => ue.isSaved).length;
        const favoriteCount = exercise.userExercises.filter(ue => ue.isFavorited).length;
        const ratings = exercise.userExercises.map(ue => ue.rating).filter((r): r is number => r !== null);
        const averageRating = ratings.length > 0 
          ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
          : null;

        const { userExercises, ...rest } = exercise;
        return {
          ...rest,
          saveCount,
          favoriteCount,
          averageRating,
        };
      })
    );
  }
} 