import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from '../services/users.service';
import { getModelToken } from '@nestjs/mongoose';
import { User, UserDoc } from '../entities/users.entity';

describe('UsersController', () => {
  let usersController: UsersController;
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: jest.fn() },
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
