import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OtpPurpose } from '@prisma/client';
import type {
  SignupBodyDto,
  LoginBodyDto,
  VerifyEmailBodyDto,
  ForgotPasswordBodyDto,
  ResetPasswordBodyDto,
} from '@smart-dooh/shared-dto';
import { ConfigService } from '../config/config.service';
import { MailService } from '../mail/mail.service';
import { verificationEmailHtml } from '../mail/templates/verification-email';
import { resetPasswordEmailHtml } from '../mail/templates/reset-password-email';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from './otp.service';

const SALT_ROUNDS = 10;

export interface TokenPayload {
  sub: string;
  driverId: string;
  email: string;
  isVerified: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly mail: MailService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private getJwtSecret(): string {
    const secret = this.config.get('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not set; cannot sign or verify tokens');
    }
    return secret;
  }

  private async signToken(payload: TokenPayload): Promise<string> {
    return this.jwt.signAsync(payload, {
      secret: this.getJwtSecret(),
      expiresIn: '7d',
    });
  }

  async signup(dto: SignupBodyDto): Promise<{ accessToken: string; driverId: string; isVerified: boolean }> {
    const emailNormalized = dto.email.toLowerCase().trim();
    const existing = await this.prisma.driverAuth.findUnique({ where: { email: emailNormalized } });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const driver = await this.prisma.driver.create({ data: {} });
    const driverAuth = await this.prisma.driverAuth.create({
      data: {
        driverId: driver.id,
        email: emailNormalized,
        passwordHash,
        isVerified: false,
      },
    });
    const code = await this.otp.create(driverAuth.id, OtpPurpose.VERIFY_EMAIL);
    try {
      await this.mail.send({
        to: dto.email,
        subject: 'Adrive – Verify your email',
        html: verificationEmailHtml(code),
      });
    } catch (err) {
      this.logger.warn('Failed to send verification email', { email: emailNormalized, err });
      await this.prisma.driverAuth.delete({ where: { id: driverAuth.id } }).catch(() => {});
      await this.prisma.driver.delete({ where: { id: driver.id } }).catch(() => {});
      throw new ServiceUnavailableException(
        'We couldn\'t send the verification email. Please check that SMTP is configured correctly on the server, or try again later.',
      );
    }
    const accessToken = await this.signToken({
      sub: driverAuth.id,
      driverId: driver.id,
      email: driverAuth.email,
      isVerified: false,
    });
    return {
      accessToken,
      driverId: driver.id,
      isVerified: false,
    };
  }

  async login(
    dto: LoginBodyDto,
  ): Promise<{ accessToken: string; driverId: string; isVerified: boolean }> {
    const driverAuth = await this.prisma.driverAuth.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (!driverAuth) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const match = await bcrypt.compare(dto.password, driverAuth.passwordHash);
    if (!match) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!driverAuth.isVerified) {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email before signing in',
      });
    }
    const accessToken = await this.signToken({
      sub: driverAuth.id,
      driverId: driverAuth.driverId,
      email: driverAuth.email,
      isVerified: true,
    });
    return {
      accessToken,
      driverId: driverAuth.driverId,
      isVerified: true,
    };
  }

  async verifyEmail(
    dto: VerifyEmailBodyDto,
  ): Promise<{ accessToken: string; driverId: string; isVerified: boolean }> {
    const driverAuth = await this.prisma.driverAuth.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (!driverAuth) {
      throw new UnauthorizedException('Invalid email or code');
    }
    const valid = await this.otp.verify(driverAuth.id, OtpPurpose.VERIFY_EMAIL, dto.code);
    if (!valid) {
      throw new UnauthorizedException('Invalid or expired code');
    }
    await this.prisma.driverAuth.update({
      where: { id: driverAuth.id },
      data: { isVerified: true, verifiedAt: new Date() },
    });
    const accessToken = await this.signToken({
      sub: driverAuth.id,
      driverId: driverAuth.driverId,
      email: driverAuth.email,
      isVerified: true,
    });
    return {
      accessToken,
      driverId: driverAuth.driverId,
      isVerified: true,
    };
  }

  async resendVerification(email: string): Promise<void> {
    const driverAuth = await this.prisma.driverAuth.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!driverAuth || driverAuth.isVerified) return;
    const code = await this.otp.create(driverAuth.id, OtpPurpose.VERIFY_EMAIL);
    await this.mail.send({
      to: driverAuth.email,
      subject: 'Adrive – Verify your email',
      html: verificationEmailHtml(code),
    });
  }

  async forgotPassword(_dto: ForgotPasswordBodyDto): Promise<{ message: string }> {
    const email = _dto.email.toLowerCase().trim();
    const driverAuth = await this.prisma.driverAuth.findUnique({ where: { email } });
    if (driverAuth) {
      const code = await this.otp.create(driverAuth.id, OtpPurpose.RESET_PASSWORD);
      await this.mail.send({
        to: driverAuth.email,
        subject: 'Adrive – Reset your password',
        html: resetPasswordEmailHtml(code),
      });
    }
    return { message: 'If an account exists for this email, you will receive a reset code.' };
  }

  async resetPassword(dto: ResetPasswordBodyDto): Promise<{ message: string }> {
    const driverAuth = await this.prisma.driverAuth.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (!driverAuth) {
      throw new UnauthorizedException('Invalid email or code');
    }
    const valid = await this.otp.verify(driverAuth.id, OtpPurpose.RESET_PASSWORD, dto.code);
    if (!valid) {
      throw new UnauthorizedException('Invalid or expired code');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.prisma.driverAuth.update({
      where: { id: driverAuth.id },
      data: { passwordHash },
    });
    return { message: 'Password has been reset. You can sign in with your new password.' };
  }
}
