import { Body, Controller, Get, Param, Post, Query, UsePipes } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  generateFromTrendBodySchema,
  translatedCreativeQuerySchema,
  type GenerateFromTrendBodyDto,
  type TranslatedCreativeQueryDto,
} from '@smart-dooh/shared-dto';
import { ZodValidationPipe } from '../core/pipes/zod-validation.pipe';
import { AdCreativeService } from './ad-creative.service';

/**
 * AdCreativeService API: trend-based generation, translations (cached in Redis), PENDING status for moderation.
 */
@ApiTags('Ad Creative')
@Controller('ad-creative')
export class AdCreativeController {
  constructor(private readonly adCreative: AdCreativeService) {}

  /**
   * Generate a new creative from current trends for the region.
   * Ties the trend to the business (e.g. "PM loves pizza" → pizza place ad).
   * New creative is created with status PENDING for admin approval.
   */
  @Post('generate-from-trend')
  @ApiOperation({ summary: 'Generate creative from trends' })
  @UsePipes(new ZodValidationPipe(generateFromTrendBodySchema))
  async generateFromTrend(@Body() body: GenerateFromTrendBodyDto) {
    return this.adCreative.generateFromTrend(body);
  }

  /**
   * Get creative content in the requested language.
   * Cache key: creative_{id}_{lang} in Redis. Glossary applied for brand terms.
   */
  @Get('translated/:creativeId')
  @ApiOperation({ summary: 'Get translated creative by id and lang' })
  async getTranslated(
    @Param('creativeId') creativeId: string,
    @Query(new ZodValidationPipe(translatedCreativeQuerySchema)) query: TranslatedCreativeQueryDto
  ) {
    const langCode = query.lang ?? 'en';
    return this.adCreative.getTranslated(creativeId, langCode);
  }
}
