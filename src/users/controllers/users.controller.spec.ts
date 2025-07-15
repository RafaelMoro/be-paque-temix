import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from '../services/users.service';
import { getModelToken } from '@nestjs/mongoose';
import { User, UserDoc } from '../entities/users.entity';
import { ConfigType } from '@nestjs/config';
import config from '@/config';

describe('UsersController', () => {
  let usersController: UsersController;
  let usersService: UsersService;

  const mockConfigService: ConfigType<typeof config> = {
    version: '1.0.0', // Mock the version or other properties as needed
    database: {
      cluster: 'string',
      mongoDbName: 'string',
      user: 'string',
      password: 'string',
      connection: 'string',
    },
    auth: {
      jwtKey: 'string',
      publicKey: 'string',
      roleKey: 'string',
    },
    // Add other mocked properties from your config if necessary
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: jest.fn() },
        {
          provide: config.KEY, // Provide the mocked config service
          useValue: mockConfigService,
        },
      ],
    }).compile();

    usersController = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Find by email', async () => {
    const result = [
      {
        _id: '68351afb0e685e9fe702e63b',
        name: 'John',
        lastName: 'Doe',
        email: 'john.doe@mail.com',
        role: ['user'],
        phone: 123456789,
        postalCode: 785,
      },
    ] as unknown as UserDoc;

    jest
      .spyOn(usersService, 'findByEmail')
      // eslint-disable-next-line @typescript-eslint/require-await
      .mockImplementation(async () => result);

    expect(await usersController.getUser('john.doe@mail.com')).toBe(result);
  });
});
