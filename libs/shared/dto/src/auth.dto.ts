import { z } from 'zod';

const emailSchema = z.string().email('Invalid email').min(1, 'Email is required');
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');

/** POST /auth/signup */
export const signupBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export type SignupBodyDto = z.infer<typeof signupBodySchema>;
export const signupBodySafeParse = signupBodySchema.safeParse;

/** POST /auth/login */
export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});
export type LoginBodyDto = z.infer<typeof loginBodySchema>;
export const loginBodySafeParse = loginBodySchema.safeParse;

/** POST /auth/resend-verification */
export const resendVerificationBodySchema = z.object({
  email: emailSchema,
});
export type ResendVerificationBodyDto = z.infer<typeof resendVerificationBodySchema>;

/** POST /auth/verify-email */
export const verifyEmailBodySchema = z.object({
  email: emailSchema,
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must be digits only'),
});
export type VerifyEmailBodyDto = z.infer<typeof verifyEmailBodySchema>;
export const verifyEmailBodySafeParse = verifyEmailBodySchema.safeParse;

/** POST /auth/forgot-password */
export const forgotPasswordBodySchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordBodyDto = z.infer<typeof forgotPasswordBodySchema>;
export const forgotPasswordBodySafeParse = forgotPasswordBodySchema.safeParse;

/** POST /auth/reset-password */
export const resetPasswordBodySchema = z.object({
  email: emailSchema,
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must be digits only'),
  newPassword: passwordSchema,
});
export type ResetPasswordBodyDto = z.infer<typeof resetPasswordBodySchema>;
export const resetPasswordBodySafeParse = resetPasswordBodySchema.safeParse;
