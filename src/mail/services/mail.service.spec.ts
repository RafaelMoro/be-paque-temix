import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { MailForgotPasswordDto } from '../dtos/mail.dto';
import config from '@/config';

// Mock dependencies before importing the service
jest.mock('react');
jest.mock('resend');
jest.mock('../../../emails/ResetPassword', () => jest.fn());

// Get the mocked modules
const mockCreateElement = jest.mocked(require('react').createElement);
const mockResend = jest.mocked(require('resend').Resend);
const mockSend = jest.fn();

// Configure the mocks
mockCreateElement.mockReturnValue('<MockReactElement />');
mockResend.mockImplementation(() => ({
  emails: {
    send: mockSend,
  },
}));

describe('MailService', () => {
  let service: MailService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSend.mockClear();

    const mockConfigService = {
      mail: {
        resendApiKey: 'test-resend-api-key',
        mailerMail: 'noreply@example.com',
      },
      frontend: {
        uri: 'https://example.com',
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: config.KEY,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send password reset email successfully', async () => {
    const mockPayload: MailForgotPasswordDto = {
      email: 'test@example.com',
      hostname: 'https://test.com',
      oneTimeToken: 'test-token-123',
      name: 'John',
      lastName: 'Doe',
    };

    mockSend.mockResolvedValue({ success: true });

    await service.sendUserForgotPasswordEmail(mockPayload);

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith({
      from: 'noreply@example.com',
      to: 'test@example.com',
      subject: 'Recupera tu contraseña en Kraft Envios',
      react: '<MockReactElement />',
    });
  });
});
