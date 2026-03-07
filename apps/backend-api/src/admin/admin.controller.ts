import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  adminCreateCampaignSchema,
  adminCreativeStatusSchema,
  adminListCreativesQuerySchema,
  adminRedemptionSchema,
  adminUpdateCampaignSchema,
  type AdminCreateCampaignDto,
  type AdminCreativeStatusDto,
  type AdminListCreativesQueryDto,
  type AdminUpdateCampaignDto,
  type AdminRedemptionDto,
} from '@smart-dooh/shared-dto';
import { ZodValidationPipe } from '../core/pipes/zod-validation.pipe';
import { AdminService } from './admin.service';
import { AdminApiKeyGuard } from './guards/admin-api-key.guard';
import { AdminCampaignRepository } from './repositories/campaign.repository';
import { AdminCreativeRepository } from './repositories/creative.repository';
import { RedemptionRepository } from './repositories/redemption.repository';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(AdminApiKeyGuard)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly creativeRepo: AdminCreativeRepository,
    private readonly campaignRepo: AdminCampaignRepository,
    private readonly redemptionRepo: RedemptionRepository,
  ) {}

  @Get('analytics')
  @ApiOperation({ summary: 'Get admin analytics' })
  async getAnalytics() {
    return this.admin.getAnalytics();
  }

  @Get('creatives')
  async listCreatives(
    @Query(new ZodValidationPipe(adminListCreativesQuerySchema)) query: AdminListCreativesQueryDto
  ) {
    const options = query.status ? { status: query.status } : {};
    return this.creativeRepo.findMany(options);
  }

  @Patch('creatives/:id/status')
  @ApiOperation({ summary: 'Update creative status (moderation)' })
  @UsePipes(new ZodValidationPipe(adminCreativeStatusSchema))
  async updateCreativeStatus(
    @Param('id') id: string,
    @Body() body: AdminCreativeStatusDto
  ) {
    const creative = await this.creativeRepo.findUnique(id);
    if (!creative) throw new BadRequestException('Creative not found');
    if (creative.status !== 'PENDING') {
      throw new BadRequestException('Only PENDING creatives can be moderated');
    }
    return this.creativeRepo.updateStatus(id, body.status);
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'List campaigns' })
  async listCampaigns() {
    return this.campaignRepo.findMany();
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Get campaign by id' })
  async getCampaign(@Param('id') id: string) {
    const c = await this.campaignRepo.findUnique(id);
    if (!c) throw new BadRequestException('Campaign not found');
    return c;
  }

  @Post('campaigns')
  @ApiOperation({ summary: 'Create campaign' })
  @UsePipes(new ZodValidationPipe(adminCreateCampaignSchema))
  async createCampaign(@Body() body: AdminCreateCampaignDto) {
    return this.campaignRepo.create(body);
  }

  @Patch('campaigns/:id')
  @ApiOperation({ summary: 'Update campaign' })
  @UsePipes(new ZodValidationPipe(adminUpdateCampaignSchema))
  async updateCampaign(
    @Param('id') id: string,
    @Body() body: AdminUpdateCampaignDto
  ) {
    const campaign = await this.campaignRepo.findUnique(id);
    if (!campaign) throw new BadRequestException('Campaign not found');
    return this.campaignRepo.update(id, {
      cpm: body.cpm,
      budgetRemaining: body.budgetRemaining,
      active: body.active,
      geofence: body.geofence,
    });
  }

  @Delete('campaigns/:id')
  @ApiOperation({ summary: 'Delete campaign' })
  async deleteCampaign(@Param('id') id: string) {
    const campaign = await this.campaignRepo.findUnique(id);
    if (!campaign) throw new BadRequestException('Campaign not found');
    await this.campaignRepo.delete(id);
    return { deleted: true };
  }

  @Post('redemptions')
  @ApiOperation({ summary: 'Create redemption' })
  @UsePipes(new ZodValidationPipe(adminRedemptionSchema))
  async createRedemption(@Body() body: AdminRedemptionDto) {
    return this.redemptionRepo.create(body);
  }
}
