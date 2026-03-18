import { Injectable } from '@nestjs/common';
import { createHash, randomInt } from 'crypto';
import { OtpPurpose } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;

@Injectable()
export class OtpService {
  constructor(private readonly prisma: PrismaService) {}

  private hash(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  /** Generate a 6-digit OTP, store its hash, return the raw code (caller must send via email). */
  async create(driverAuthId: string, purpose: OtpPurpose): Promise<string> {
    const code = String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await this.prisma.otpCode.create({
      data: {
        driverAuthId,
        purpose,
        codeHash: this.hash(code),
        expiresAt,
      },
    });
    return code;
  }

  /** Verify code: find latest unused, unexpired OTP for this driverAuthId and purpose; if match, mark used and return true. */
  async verify(driverAuthId: string, purpose: OtpPurpose, code: string): Promise<boolean> {
    const now = new Date();
    const record = await this.prisma.otpCode.findFirst({
      where: {
        driverAuthId,
        purpose,
        isUsed: false,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) return false;
    const matches = record.codeHash === this.hash(code);
    if (matches) {
      await this.prisma.otpCode.update({
        where: { id: record.id },
        data: { isUsed: true, usedAt: now },
      });
    }
    return matches;
  }
}
