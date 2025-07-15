import { createElement } from 'react';
import { Resend } from 'resend';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import config from '@/config';
import { MailForgotPasswordDto } from '../dtos/mail.dto';
import ResetPassword from '../../../emails/ResetPassword';

@Injectable()
export class MailService {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {}

  async sendUserForgotPasswordEmail(payload: MailForgotPasswordDto) {
    try {
      const resend = new Resend(this.configService.mail.resendApiKey);
      const emailSender = this.configService.mail.mailerMail!;

      const { oneTimeToken, email, name, lastName } = payload;
      const url = `${this.configService.frontend.uri}/reset-password/${oneTimeToken}`;

      await resend.emails.send({
        from: emailSender,
        to: email,
        subject: 'Recupera tu contraseña en Kraft Envios',
        react: createElement(ResetPassword, { name, lastName, url }),
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
