import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { ConfigService } from '../config/config.service';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class MailService {
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get('SMTP_HOST');
    const port = this.config.get('SMTP_PORT');
    const user = this.config.get('SMTP_USER');
    const pass = this.config.get('SMTP_PASS');
    if (host && port !== undefined && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: port === 465,
        auth: { user, pass },
      });
    }
  }

  async send(options: SendMailOptions): Promise<void> {
    if (!this.transporter) {
      throw new Error(
        'Mail not configured: set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env',
      );
    }
    const from = this.config.get('SMTP_FROM') ?? this.config.get('SMTP_USER') ?? 'noreply@adrive.local';
    await this.transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  }
}
