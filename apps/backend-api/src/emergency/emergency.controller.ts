import { BadRequestException, Body, Controller, Get, Header, Logger, Post, Query, UseGuards } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { EmergencyService } from './emergency.service';
import { PikudHaorefService } from './pikud-haoref.service';
import { AdminApiKeyGuard } from '../admin/guards/admin-api-key.guard';
import { locationQuerySchema, testAlertBodySchema } from './interfaces/validation-schemas';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@ApiTags('Emergency')
@Controller('emergency')
export class EmergencyController {
  private readonly logger = new Logger(EmergencyController.name);

  constructor(
    private readonly emergencyService: EmergencyService,
    private readonly pikudHaoref: PikudHaorefService,
  ) {}

  @Get('status-page')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiExcludeEndpoint()
  statusPage(): string {
    const alertActive = this.emergencyService.isAlertActive();
    const headline = this.emergencyService.getCurrentAlertHeadline();
    const connectedDrivers = this.emergencyService.getConnectionCount();
    const title = alertActive ? 'ALERT ACTIVE' : 'No alert';
    const bg = alertActive ? '#8B0000' : '#1a1a1a';
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Emergency – ${title}</title><meta http-equiv="refresh" content="2"></head>
<body style="margin:0;min-height:100vh;background:${bg};color:#fff;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:1rem;">
  <h1 style="font-size:clamp(2rem,8vw,4rem);margin:0;">${alertActive ? '⚠ ALERT ACTIVE' : 'No alert'}</h1>
  ${headline ? `<p style="font-size:1.25rem;margin:1rem 0;">${escapeHtml(headline)}</p>` : ''}
  <p style="opacity:0.8;">Connected drivers: ${connectedDrivers}</p>
  <p style="margin-top:2rem;"><a href="/emergency/status" style="color:#8af;">JSON status</a></p>
</body>
</html>`;
    return html;
  }

  @Get('check')
  @ApiOperation({ summary: 'Check if an emergency alert is active for a GPS location (lightweight fallback)' })
  @ApiQuery({ name: 'lat', type: Number, required: true })
  @ApiQuery({ name: 'lng', type: Number, required: true })
  async check(@Query() rawQuery: Record<string, string>) {
    const parsed = locationQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.emergencyService.checkForLocation(parsed.data.lat, parsed.data.lng);
  }

  @Get('status')
  @ApiOperation({ summary: 'Current emergency alert state and connected driver count' })
  async status() {
    return {
      alertActive: this.emergencyService.isAlertActive(),
      connectedDrivers: this.emergencyService.getConnectionCount(),
    };
  }

  @Get('pikud-status')
  @ApiOperation({ summary: 'Pikud HaOref polling status and last API response (for debugging real alarms)' })
  pikudStatus() {
    const status = this.pikudHaoref.getPikudStatus();
    return {
      ...status,
      whereToSeeLogs: 'Backend logs: run "npx nx serve backend-api" in a terminal; all Pikud HaOref messages appear there.',
    };
  }

  @Post('test-alert')
  @UseGuards(AdminApiKeyGuard)
  @ApiOperation({ summary: 'Trigger a test emergency alert (admin/dev only)' })
  async triggerTestAlert(@Body() rawBody: unknown) {
    const parsed = testAlertBodySchema.safeParse(rawBody ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    const { areas, headline } = parsed.data;
    this.logger.warn({ msg: 'Test alert triggered', areas, headline });
    await this.emergencyService.triggerTestAlert(areas, headline);
    return { message: 'Test alert triggered', areas, headline };
  }

  @Post('clear')
  @UseGuards(AdminApiKeyGuard)
  @ApiOperation({ summary: 'Clear active emergency alert (admin only)' })
  async clearAlert() {
    await this.emergencyService.clearAlert();
    return { message: 'Alert cleared' };
  }
}
