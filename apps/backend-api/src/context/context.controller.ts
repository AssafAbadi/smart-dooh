import { Body, Controller, Post, UseGuards, UsePipes } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { contextSnapshotSchema, type ContextSnapshot } from '@smart-dooh/shared-dto';
import { ZodValidationPipe } from '../core/pipes/zod-validation.pipe';
import { ContextService } from './context.service';
import { DeviceRateLimitGuard } from '../rate-limit/guards/device-rate-limit.guard';

/**
 * Controller: HTTP only. Validates input and delegates to ContextService (BL).
 * Device rate limit: 1 req / 5s (429 + retryAfter if exceeded).
 */
@ApiTags('Context')
@Controller('context')
export class ContextController {
  constructor(private readonly contextService: ContextService) {}

  @Post('snapshot')
  @ApiOperation({ summary: 'Submit context snapshot' })
  @UseGuards(DeviceRateLimitGuard)
  @UsePipes(new ZodValidationPipe(contextSnapshotSchema))
  async snapshot(@Body() body: ContextSnapshot) {
    return this.contextService.submitSnapshot(body);
  }
}
