import { render } from '@react-email/render';
import { Resend } from 'resend';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import * as React from 'react';

import config from '@/config';
import { LOCAL_ENV } from '@/app.constant';
import {
  MailBalanceRequestCreatedDto,
  MailBalanceRequestDecisionDto,
  MailForgotPasswordDto,
} from '../dtos/mail.dto';
import BalanceRequestCreated from '../../../emails/BalanceRequestCreated';
import BalanceRequestDecision from '../../../emails/BalanceRequestDecision';
import ResetPassword from '../../../emails/ResetPassword';

@Injectable()
export class MailService {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {}

  private getFrontendBaseUrl(): string {
    const { frontend, environment } = this.configService;
    const { uri = 'http://localhost', port = '3000' } = frontend;
    const normalizedUri = uri.replace(/\/+$/, '');

    if (environment === LOCAL_ENV && !/:\d+$/.test(normalizedUri)) {
      return `${normalizedUri}:${port}`;
    }

    return normalizedUri;
  }

  async sendUserForgotPasswordEmail(
    payload: MailForgotPasswordDto,
  ): Promise<void> {
    try {
      const resend = new Resend(this.configService.mail.resendApiKey);
      const emailSender = this.configService.mail.mailerMail!;

      const { oneTimeToken, email, name, lastName } = payload;
      const url = `${this.getFrontendBaseUrl()}/reset-password/${oneTimeToken}`;

      const emailHtml = await render(
        React.createElement(ResetPassword, { name, lastName, url }),
      );

      await resend.emails.send({
        from: emailSender,
        to: email,
        subject: 'Recupera tu contraseña en Kraft Envios',
        html: emailHtml,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async sendBalanceRequestCreatedEmail(
    payload: MailBalanceRequestCreatedDto,
  ): Promise<void> {
    try {
      const resend = new Resend(this.configService.mail.resendApiKey);
      const emailSender = this.configService.mail.mailerMail!;
      const url = `${this.getFrontendBaseUrl()}/dashboard/requests/${payload.requestId}`;
      const emailHtml = await render(
        React.createElement(BalanceRequestCreated, { ...payload, url }),
      );

      await resend.emails.send({
        from: emailSender,
        to: payload.adminEmails,
        subject: 'Nueva solicitud de saldo en Kraft Envios',
        html: emailHtml,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async sendBalanceRequestDecisionEmail(
    payload: MailBalanceRequestDecisionDto,
  ): Promise<void> {
    try {
      const resend = new Resend(this.configService.mail.resendApiKey);
      const emailSender = this.configService.mail.mailerMail!;
      const emailHtml = await render(
        React.createElement(BalanceRequestDecision, payload),
      );

      await resend.emails.send({
        from: emailSender,
        to: payload.email,
        subject: 'Actualizacion de tu solicitud de saldo en Kraft Envios',
        html: emailHtml,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
