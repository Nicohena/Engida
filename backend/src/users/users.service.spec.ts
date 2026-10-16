import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: 'UserRepository',
          useValue: mockUserRepository,
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
});
