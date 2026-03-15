import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { getDisplayHtml } from './display-html';

/**
 * Serves the billboard-style ad display page for use on a second screen (e.g. TV).
 * Open http://<BACKEND_IP>:3000/display/:driverId on another device on the same Wi-Fi.
 */
@ApiTags('Display')
@Controller('display')
export class DisplayController {
  @Get(':driverId')
  @ApiOperation({ summary: 'Billboard display page (full-screen, high-contrast)' })
  @ApiParam({ name: 'driverId', example: 'driver-1' })
  async getDisplay(@Param('driverId') driverId: string, @Res() res: FastifyReply) {
    const html = getDisplayHtml(driverId);
    res.header('Cache-Control', 'no-store');
    res.type('text/html').send(html);
  }
}
