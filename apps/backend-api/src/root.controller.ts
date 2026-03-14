import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Root')
@Controller()
export class RootController {
  @Get()
  @ApiOperation({ summary: 'API root' })
  root() {
    return {
      success: true,
      message: 'Smart DOOH API',
      docs: '/api-docs',
      display: '/display/:driverId',
    };
  }
}
