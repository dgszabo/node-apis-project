import { ExerciseService } from '../exercise.service';
import { PrismaClient } from '@/generated/prisma';

// Mock PrismaClient
jest.mock('@/generated/prisma', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    exercise: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  })),
}));

describe('ExerciseService', () => {
  let service: ExerciseService;
  let prisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    service = new ExerciseService(prisma);
  });

  describe('createExercise', () => {
    const mockUser = {
      id: 'user1',
      name: 'testuser',
    };

    const mockExercise = {
      id: '1',
      name: 'Test Exercise',
      description: 'Test Description',
      difficulty: 3,
      isPublic: true,
    };

    it('should create a new exercise', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);
      (prisma.exercise.create as jest.Mock).mockResolvedValueOnce(mockExercise);

      const result = await service.createExercise(
        'Test Exercise',
        'Test Description',
        3,
        true,
        'user1'
      );

      expect(result).toEqual(mockExercise);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user1' },
      });
      expect(prisma.exercise.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Exercise',
          description: 'Test Description',
          difficulty: 3,
          isPublic: true,
          creatorId: 'user1',
        },
        select: {
          id: true,
          name: true,
          description: true,
          difficulty: true,
          isPublic: true,
        },
      });
    });

    it('should throw error if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        service.createExercise(
          'Test Exercise',
          'Test Description',
          3,
          true,
          'user1'
        )
      ).rejects.toThrow('User not found');
    });
  });

  describe('updateExercise', () => {
    const mockExercise = {
      id: '1',
      name: 'Test Exercise',
      description: 'Test Description',
      difficulty: 3,
      isPublic: true,
      creatorId: 'user1',
    };

    const mockUpdatedExercise = {
      ...mockExercise,
      name: 'Updated Exercise',
      description: 'Updated Description',
    };

    it('should update an exercise', async () => {
      (prisma.exercise.findUnique as jest.Mock).mockResolvedValueOnce(mockExercise);
      (prisma.exercise.update as jest.Mock).mockResolvedValueOnce(mockUpdatedExercise);

      const result = await service.updateExercise(
        '1',
        'user1',
        'Updated Exercise',
        'Updated Description'
      );

      expect(result).toEqual(mockUpdatedExercise);
      expect(prisma.exercise.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(prisma.exercise.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          name: 'Updated Exercise',
          description: 'Updated Description',
        },
        select: {
          id: true,
          name: true,
          description: true,
          difficulty: true,
          isPublic: true,
        },
      });
    });

    it('should throw error if exercise not found', async () => {
      (prisma.exercise.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        service.updateExercise('1', 'user1', 'Updated Exercise')
      ).rejects.toThrow('Exercise not found');
    });

    it('should throw error if user not authorized', async () => {
      (prisma.exercise.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockExercise,
        isPublic: false,
      });

      await expect(
        service.updateExercise('1', 'user2', 'Updated Exercise')
      ).rejects.toThrow('Not authorized to modify this exercise');
    });
  });

  describe('deleteExercise', () => {
    const mockExercise = {
      id: '1',
      name: 'Test Exercise',
      description: 'Test Description',
      difficulty: 3,
      isPublic: true,
      creatorId: 'user1',
      deletedAt: null,
    };

    const mockDeletedExercise = {
      ...mockExercise,
      deletedAt: new Date(),
    };

    it('should delete an exercise', async () => {
      (prisma.exercise.findUnique as jest.Mock).mockResolvedValueOnce(mockExercise);
      (prisma.exercise.update as jest.Mock).mockResolvedValueOnce(mockDeletedExercise);

      const result = await service.deleteExercise('1', 'user1');

      expect(result).toEqual(mockDeletedExercise);
      expect(prisma.exercise.findUnique).toHaveBeenCalledWith({
        where: { id: '1', deletedAt: null },
      });
      expect(prisma.exercise.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { deletedAt: expect.any(Date) },
        select: {
          id: true,
          name: true,
          description: true,
          difficulty: true,
          isPublic: true,
        },
      });
    });

    it('should throw error if exercise not found', async () => {
      (prisma.exercise.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.deleteExercise('1', 'user1')).rejects.toThrow('Exercise not found');
    });

    it('should throw error if user not authorized', async () => {
      (prisma.exercise.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockExercise,
        isPublic: false,
      });

      await expect(service.deleteExercise('1', 'user2')).rejects.toThrow('Not authorized to delete this exercise');
    });
  });

  describe('getExercise', () => {
    const mockExercise = {
      id: '1',
      name: 'Test Exercise',
      description: 'Test Description',
      difficulty: 3,
      isPublic: true,
      creatorId: 'user1',
      userExercises: [
        { isSaved: true, isFavorited: true, rating: 4 },
        { isSaved: true, isFavorited: false, rating: 5 },
        { isSaved: false, isFavorited: true, rating: null },
      ],
    };

    it('should return exercise with stats for public exercise', async () => {
      (prisma.exercise.findUnique as jest.Mock).mockResolvedValueOnce(mockExercise);
      (prisma.exercise.findUnique as jest.Mock).mockResolvedValueOnce(mockExercise);

      const result = await service.getExercise('1', 'user2');

      expect(result).toEqual({
        id: '1',
        name: 'Test Exercise',
        description: 'Test Description',
        difficulty: 3,
        isPublic: true,
        creatorId: 'user1',
        saveCount: 2,
        favoriteCount: 2,
        averageRating: 4.5,
      });
    });

    it('should return exercise with stats for user\'s own private exercise', async () => {
      const privateExercise = { ...mockExercise, isPublic: false };
      (prisma.exercise.findUnique as jest.Mock).mockResolvedValueOnce(privateExercise);
      (prisma.exercise.findUnique as jest.Mock).mockResolvedValueOnce(privateExercise);

      const result = await service.getExercise('1', 'user1');

      expect(result).toEqual({
        id: '1',
        name: 'Test Exercise',
        description: 'Test Description',
        difficulty: 3,
        isPublic: false,
        creatorId: 'user1',
        saveCount: 2,
        favoriteCount: 2,
        averageRating: 4.5,
      });
    });

    it('should throw error for non-existent exercise', async () => {
      (prisma.exercise.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.getExercise('1', 'user1')).rejects.toThrow('Exercise not found');
    });

    it('should throw error for unauthorized access to private exercise', async () => {
      const privateExercise = { ...mockExercise, isPublic: false };
      (prisma.exercise.findUnique as jest.Mock).mockResolvedValueOnce(privateExercise);
      (prisma.exercise.findUnique as jest.Mock).mockResolvedValueOnce(privateExercise);

      await expect(service.getExercise('1', 'user2')).rejects.toThrow('Not authorized to view this exercise');
    });
  });

  describe('listExercises', () => {
    const mockExercises = [
      {
        id: '1',
        name: 'Exercise 1',
        description: 'Description 1',
        difficulty: 3,
        isPublic: true,
        creatorId: 'user1',
        userExercises: [
          { isSaved: true, isFavorited: true, rating: 4 },
          { isSaved: true, isFavorited: false, rating: 5 },
        ],
      },
      {
        id: '2',
        name: 'Exercise 2',
        description: 'Description 2',
        difficulty: 4,
        isPublic: true,
        creatorId: 'user1',
        userExercises: [
          { isSaved: false, isFavorited: true, rating: 3 },
          { isSaved: true, isFavorited: true, rating: null },
        ],
      },
    ];

    it('should return list of exercises with stats', async () => {
      (prisma.exercise.findMany as jest.Mock).mockResolvedValueOnce(mockExercises);

      const result = await service.listExercises('user1');

      expect(result).toEqual([
        {
          id: '1',
          name: 'Exercise 1',
          description: 'Description 1',
          difficulty: 3,
          isPublic: true,
          creatorId: 'user1',
          saveCount: 2,
          favoriteCount: 1,
          averageRating: 4.5,
        },
        {
          id: '2',
          name: 'Exercise 2',
          description: 'Description 2',
          difficulty: 4,
          isPublic: true,
          creatorId: 'user1',
          saveCount: 1,
          favoriteCount: 2,
          averageRating: 3,
        },
      ]);
    });

    it('should apply filters correctly', async () => {
      (prisma.exercise.findMany as jest.Mock).mockResolvedValueOnce([mockExercises[0]]);

      const result = await service.listExercises('user1', {
        name: 'Exercise 1',
        difficulty: 3,
      });

      expect(prisma.exercise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.objectContaining({
              contains: 'Exercise 1',
            }),
            difficulty: 3,
          }),
        })
      );
    });

    it('should sort by difficulty when specified', async () => {
      (prisma.exercise.findMany as jest.Mock).mockResolvedValueOnce(mockExercises);

      await service.listExercises('user1', undefined, 'difficulty');

      expect(prisma.exercise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { difficulty: 'asc' },
        })
      );
    });
  });
}); 