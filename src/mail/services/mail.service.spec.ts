import { BadRequestException } from '@nestjs/common';
import { render } from '@react-email/render';
import * as React from 'react';
import { Test, TestingModule } from '@nestjs/testing';
import BalanceRequestCreated from '../../../emails/BalanceRequestCreated';
import BalanceRequestDecision from '../../../emails/BalanceRequestDecision';
import ResetPassword from '../../../emails/ResetPassword';
import config from '@/config';
import {
  MailBalanceRequestCreatedDto,
  MailBalanceRequestDecisionDto,
  MailForgotPasswordDto,
} from '../dtos/mail.dto';
import { MailService } from './mail.service';

const mockSend = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

jest.mock('@react-email/render', () => ({
  render: jest.fn(() => 'MockRenderedEmail'),
}));

describe('MailService', () => {
  let service: MailService;
  let configService: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(React, 'createElement');
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: config.KEY,
          useValue: {
            mail: {
              resendApiKey: 'test-resend-api-key',
              mailerMail: 'noreply@example.com',
            },
            frontend: { uri: 'https://example.com', port: '3000' },
            environment: 'production',
          },
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
    configService = module.get(config.KEY);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends password reset emails', async () => {
    const payload: MailForgotPasswordDto = {
      email: 'test@example.com',
      hostname: 'https://test.com',
      oneTimeToken: 'test-token-123',
      name: 'John',
      lastName: 'Doe',
    };
    mockSend.mockResolvedValue({ success: true });

    await service.sendUserForgotPasswordEmail(payload);

    expect(React.createElement).toHaveBeenCalledWith(ResetPassword, {
      name: payload.name,
      lastName: payload.lastName,
      url: 'https://example.com/reset-password/test-token-123',
    });
    expect(mockSend).toHaveBeenCalledWith({
      from: 'noreply@example.com',
      to: payload.email,
      subject: 'Recupera tu contraseña en Kraft Envios',
      html: 'MockRenderedEmail',
    });
  });

  describe('frontend base URL resolution', () => {
    const forgotPasswordPayload: MailForgotPasswordDto = {
      email: 'test@example.com',
      hostname: 'https://test.com',
      oneTimeToken: 'test-token-123',
      name: 'John',
      lastName: 'Doe',
    };
    const balanceRequestPayload: MailBalanceRequestCreatedDto = {
      adminEmails: ['admin@example.com'],
      requesterName: 'Jane Doe',
      amount: 150.5,
      paymentReference: 'SPEI-123',
      createdAt: new Date('2026-07-21T12:00:00.000Z'),
      requestId: 'request-id-123',
    };

    beforeEach(() => {
      mockSend.mockResolvedValue({ success: true });
    });

    it('builds links on http://localhost:3000 when environment is local', async () => {
      configService.environment = 'local';
      configService.frontend = { uri: 'http://localhost', port: '3000' };

      await service.sendUserForgotPasswordEmail(forgotPasswordPayload);
      await service.sendBalanceRequestCreatedEmail(balanceRequestPayload);

      expect(React.createElement).toHaveBeenNthCalledWith(
        1,
        ResetPassword,
        expect.objectContaining({
          url: 'http://localhost:3000/reset-password/test-token-123',
        }),
      );
      expect(React.createElement).toHaveBeenNthCalledWith(
        2,
        BalanceRequestCreated,
        expect.objectContaining({
          url: 'http://localhost:3000/dashboard/requests/request-id-123',
        }),
      );
    });

    it('builds links on FRONTEND_URI with no port when environment is development', async () => {
      configService.environment = 'development';
      configService.frontend = { uri: 'https://stage.example.com', port: '3000' };

      await service.sendUserForgotPasswordEmail(forgotPasswordPayload);
      await service.sendBalanceRequestCreatedEmail(balanceRequestPayload);

      expect(React.createElement).toHaveBeenNthCalledWith(
        1,
        ResetPassword,
        expect.objectContaining({
          url: 'https://stage.example.com/reset-password/test-token-123',
        }),
      );
      expect(React.createElement).toHaveBeenNthCalledWith(
        2,
        BalanceRequestCreated,
        expect.objectContaining({
          url: 'https://stage.example.com/dashboard/requests/request-id-123',
        }),
      );
    });

    it('builds links on FRONTEND_URI with no port when environment is production', async () => {
      configService.environment = 'production';
      configService.frontend = { uri: 'https://example.com', port: '3000' };

      await service.sendUserForgotPasswordEmail(forgotPasswordPayload);
      await service.sendBalanceRequestCreatedEmail(balanceRequestPayload);

      expect(React.createElement).toHaveBeenNthCalledWith(
        1,
        ResetPassword,
        expect.objectContaining({
          url: 'https://example.com/reset-password/test-token-123',
        }),
      );
      expect(React.createElement).toHaveBeenNthCalledWith(
        2,
        BalanceRequestCreated,
        expect.objectContaining({
          url: 'https://example.com/dashboard/requests/request-id-123',
        }),
      );
    });

    it('does not duplicate the port when environment is local and FRONTEND_URI already has one', async () => {
      configService.environment = 'local';
      configService.frontend = { uri: 'http://localhost:3000', port: '3000' };

      await service.sendUserForgotPasswordEmail(forgotPasswordPayload);

      expect(React.createElement).toHaveBeenCalledWith(
        ResetPassword,
        expect.objectContaining({
          url: 'http://localhost:3000/reset-password/test-token-123',
        }),
      );
    });

    it('does not produce a double slash when FRONTEND_URI has a trailing slash', async () => {
      configService.environment = 'production';
      configService.frontend = { uri: 'https://example.com/', port: '3000' };

      await service.sendUserForgotPasswordEmail(forgotPasswordPayload);

      expect(React.createElement).toHaveBeenCalledWith(
        ResetPassword,
        expect.objectContaining({
          url: 'https://example.com/reset-password/test-token-123',
        }),
      );
    });
  });

  it('sends one created-request notification to all admins', async () => {
    const payload: MailBalanceRequestCreatedDto = {
      adminEmails: ['admin-one@example.com', 'admin-two@example.com'],
      requesterName: 'Jane Doe',
      amount: 150.5,
      paymentReference: 'SPEI-123',
      createdAt: new Date('2026-07-21T12:00:00.000Z'),
      requestId: 'request-id-123',
    };
    mockSend.mockResolvedValue({ success: true });

    await service.sendBalanceRequestCreatedEmail(payload);

    expect(React.createElement).toHaveBeenCalledWith(BalanceRequestCreated, {
      ...payload,
      url: 'https://example.com/dashboard/requests/request-id-123',
    });
    expect(mockSend).toHaveBeenCalledWith({
      from: 'noreply@example.com',
      to: payload.adminEmails,
      subject: 'Nueva solicitud de saldo en Kraft Envios',
      html: 'MockRenderedEmail',
    });
  });

  it('renders and sends approved and rejected decisions with optional reasons', async () => {
    const approved: MailBalanceRequestDecisionDto = {
      email: 'user@example.com',
      name: 'Jane Doe',
      action: 'approved',
      amount: 150.5,
    };
    const rejected: MailBalanceRequestDecisionDto = {
      ...approved,
      action: 'rejected',
      reason: 'La referencia no pudo verificarse.',
    };
    mockSend.mockResolvedValue({ success: true });

    await service.sendBalanceRequestDecisionEmail(approved);
    await service.sendBalanceRequestDecisionEmail(rejected);

    expect(React.createElement).toHaveBeenNthCalledWith(
      1,
      BalanceRequestDecision,
      approved,
    );
    expect(React.createElement).toHaveBeenNthCalledWith(
      2,
      BalanceRequestDecision,
      rejected,
    );
    expect(mockSend).toHaveBeenNthCalledWith(1, {
      from: 'noreply@example.com',
      to: approved.email,
      subject: 'Actualizacion de tu solicitud de saldo en Kraft Envios',
      html: 'MockRenderedEmail',
    });
    expect(mockSend).toHaveBeenNthCalledWith(2, {
      from: 'noreply@example.com',
      to: rejected.email,
      subject: 'Actualizacion de tu solicitud de saldo en Kraft Envios',
      html: 'MockRenderedEmail',
    });
  });

  it('surfaces Resend failures to its caller', async () => {
    const payload: MailBalanceRequestDecisionDto = {
      email: 'user@example.com',
      name: 'Jane Doe',
      action: 'approved',
      amount: 150.5,
    };
    mockSend.mockRejectedValue(new Error('Resend failed'));

    await expect(service.sendBalanceRequestDecisionEmail(payload)).rejects.toThrow(
      BadRequestException,
    );
    expect(render).toHaveBeenCalled();
  });
});
