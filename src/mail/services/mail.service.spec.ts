import { BadRequestException } from '@nestjs/common';
import { render } from '@react-email/render';
import * as React from 'react';
import { Test, TestingModule } from '@nestjs/testing';
import BalanceRequestCreated from '../../../emails/BalanceRequestCreated';
import BalanceRequestDecision from '../../../emails/BalanceRequestDecision';
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
            frontend: { uri: 'https://example.com' },
          },
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
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

    expect(mockSend).toHaveBeenCalledWith({
      from: 'noreply@example.com',
      to: payload.email,
      subject: 'Recupera tu contraseña en Kraft Envios',
      html: 'MockRenderedEmail',
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
