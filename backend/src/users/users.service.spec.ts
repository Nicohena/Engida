import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';
import { HostProfile, HostVerificationStatus } from './entities/host-profile.entity';

describe('UsersService', () => {
  let service: UsersService;

  const mockUser: User = {
    id: 'user-uuid-1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    passwordHash: 'hashed_password_string',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    refreshTokens: [],
  };

  const mockHostProfile: HostProfile = {
    id: 'host-profile-uuid-1',
    userId: 'user-uuid-1',
    displayName: 'Jane Hosts',
    bio: 'Superhost in Addis',
    phone: '+251911223344',
    verificationStatus: HostVerificationStatus.UNVERIFIED,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: mockUser,
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((user) =>
      Promise.resolve({
        id: 'user-uuid-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...user,
      }),
    ),
  };

  const mockHostProfileRepository = {
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => ({
      id: 'host-profile-uuid-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...dto,
    })),
    save: jest.fn().mockImplementation((profile) =>
      Promise.resolve({
        id: 'host-profile-uuid-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...profile,
      }),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(HostProfile),
          useValue: mockHostProfileRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should return user when user exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      const user = await service.findByEmail('jane@example.com');
      expect(user).toEqual(mockUser);
    });

    it('should return null when user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      const user = await service.findByEmail('unknown@example.com');
      expect(user).toBeNull();
    });
  });

  describe('createUser', () => {
    it('should create user when email is available', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const newUser = await service.createUser({
        name: 'Jane Doe',
        email: 'jane@example.com',
        passwordHash: 'hashed_password_string',
      });

      expect(newUser.email).toBe('jane@example.com');
      expect(newUser.name).toBe('Jane Doe');
    });

    it('should throw ConflictException when email is taken', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.createUser({
          name: 'Jane Doe',
          email: 'jane@example.com',
          passwordHash: 'hashed_password_string',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findHostProfile', () => {
    it('should return host profile when exists', async () => {
      mockHostProfileRepository.findOne.mockResolvedValue(mockHostProfile);
      const profile = await service.findHostProfile('user-uuid-1');
      expect(profile).toEqual(mockHostProfile);
      expect(mockHostProfileRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
      });
    });

    it('should return null when host profile does not exist', async () => {
      mockHostProfileRepository.findOne.mockResolvedValue(null);
      const profile = await service.findHostProfile('unknown-id');
      expect(profile).toBeNull();
    });
  });

  describe('createOrUpdateHostProfile', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      await expect(
        service.createOrUpdateHostProfile('non-existent-user', {
          displayName: 'Test',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create new host profile if none exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockHostProfileRepository.findOne.mockResolvedValue(null);

      const profile = await service.createOrUpdateHostProfile('user-uuid-1', {
        displayName: 'Jane Hosts',
        bio: 'Superhost in Addis',
      });

      expect(profile.displayName).toBe('Jane Hosts');
      expect(profile.bio).toBe('Superhost in Addis');
      expect(mockHostProfileRepository.save).toHaveBeenCalled();
    });

    it('should update existing host profile if one exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockHostProfileRepository.findOne.mockResolvedValue({ ...mockHostProfile });

      const profile = await service.createOrUpdateHostProfile('user-uuid-1', {
        bio: 'Updated bio',
      });

      expect(profile.bio).toBe('Updated bio');
      expect(mockHostProfileRepository.save).toHaveBeenCalled();
    });
  });
});
