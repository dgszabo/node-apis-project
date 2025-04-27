import { InteractionsService } from '../interactions.service';
import { PrismaClient } from '@/generated/prisma';

// Mock PrismaClient
jest.mock('@/generated/prisma', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    exercise: {
      findUnique: jest.fn(),
    },
    userExercise: {
      upsert: jest.fn(),
    },
  })),
}));

describe('InteractionsService', () => {
  let service: InteractionsService;
  let prisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    service = new InteractionsService(prisma);
  });

  describe('updateInteraction', () => {
    const mockExercise = {
      id: '1',
      name: 'Test Exercise',
      description: 'Test Description',
      difficulty: 3,
      isPublic: true,
      creatorId: 'user2',
      deletedAt: null,
    };

    const mockUserExercise = {
      exerciseId: '1',
      isSaved: true,
      isFavorited: true,
      rating: 4,
    };

    it('should create new interaction', async () => {
      (prisma.exercise.findUnique as jest.Mock).mockResolvedValueOnce(mockExercise);
      (prisma.userExercise.upsert as jest.Mock).mockResolvedValueOnce(mockUserExercise);

      const result = await service.updateInteraction('user1', '1', {
        isSaved: true,
        isFavorited: true,
        rating: 4,
      });

      expect(result).toEqual(mockUserExercise);
      expect(prisma.exercise.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(prisma.userExercise.upsert).toHaveBeenCalledWith({
        where: {
          userId_exerciseId: {
            userId: 'user1',
            exerciseId: '1',
          },
        },
        create: {
          userId: 'user1',
          exerciseId: '1',
          isSaved: true,
          isFavorited: true,
          rating: 4,
        },
        update: {
          isSaved: true,
          isFavorited: true,
          rating: 4,
        },
        select: {
          exerciseId: true,
          isSaved: true,
          isFavorited: true,
          rating: true,
        },
      });
    });

    it('should update existing interaction', async () => {
      (prisma.exercise.findUnique as jest.Mock).mockResolvedValueOnce(mockExercise);
      (prisma.userExercise.upsert as jest.Mock).mockResolvedValueOnce({
        ...mockUserExercise,
        isSaved: false,
      });

      const result = await service.updateInteraction('user1', '1', {
        isSaved: false,
      });

      expect(result).toEqual({
        ...mockUserExercise,
        isSaved: false,
      });
    });

    it('should throw error for non-existent exercise', async () => {
      (prisma.exercise.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        service.updateInteraction('user1', '1', { isSaved: true })
      ).rejects.toThrow('Exercise not found');
    });

    it('should throw error for self-interaction', async () => {
      (prisma.exercise.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockExercise,
        creatorId: 'user1',
      });

      await expect(
        service.updateInteraction('user1', '1', { isSaved: true })
      ).rejects.toThrow('Cannot interact with your own exercise');
    });

    it('should throw error for deleted exercise', async () => {
      (prisma.exercise.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockExercise,
        deletedAt: new Date(),
      });

      await expect(
        service.updateInteraction('user1', '1', { isSaved: true })
      ).rejects.toThrow('Exercise not found');
    });

    it('should throw error for private exercise', async () => {
      (prisma.exercise.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockExercise,
        isPublic: false,
      });

      await expect(
        service.updateInteraction('user1', '1', { isSaved: true })
      ).rejects.toThrow('Exercise not found');
    });
  });
}); 