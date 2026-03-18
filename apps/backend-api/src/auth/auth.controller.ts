import { Body, Controller, Post, UsePipes } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  signupBodySchema,
  loginBodySchema,
  verifyEmailBodySchema,
  forgotPasswordBodySchema,
  resetPasswordBodySchema,
  resendVerificationBodySchema,
  type SignupBodyDto,
  type LoginBodyDto,
  type VerifyEmailBodyDto,
  type ForgotPasswordBodyDto,
  type ResetPasswordBodyDto,
  type ResendVerificationBodyDto,
} from '@smart-dooh/shared-dto';
import { ZodValidationPipe } from '../core/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Register driver; sends verification OTP email' })
  @UsePipes(new ZodValidationPipe(signupBodySchema))
  async signup(@Body() body: SignupBodyDto) {
    return this.auth.signup(body);
  }

  @Post('login')
  @ApiOperation({ summary: 'Sign in; returns 403 if email not verified' })
  @UsePipes(new ZodValidationPipe(loginBodySchema))
  async login(@Body() body: LoginBodyDto) {
    return this.auth.login(body);
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email with 6-digit OTP; returns JWT' })
  @UsePipes(new ZodValidationPipe(verifyEmailBodySchema))
  async verifyEmail(@Body() body: VerifyEmailBodyDto) {
    return this.auth.verifyEmail(body);
  }

  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend verification OTP to email' })
  @UsePipes(new ZodValidationPipe(resendVerificationBodySchema))
  async resendVerification(@Body() body: ResendVerificationBodyDto) {
    await this.auth.resendVerification(body.email);
    return { message: 'If the account exists and is unverified, a new code was sent.' };
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset OTP (always returns success)' })
  @UsePipes(new ZodValidationPipe(forgotPasswordBodySchema))
  async forgotPassword(@Body() body: ForgotPasswordBodyDto) {
    return this.auth.forgotPassword(body);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Set new password using reset OTP' })
  @UsePipes(new ZodValidationPipe(resetPasswordBodySchema))
  async resetPassword(@Body() body: ResetPasswordBodyDto) {
    return this.auth.resetPassword(body);
  }
}
