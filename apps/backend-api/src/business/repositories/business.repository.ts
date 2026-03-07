import { Injectable, Logger } from '@nestjs/common';
import { Prisma, BusinessTag as PrismaBusinessTag } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  BusinessFilter,
  BusinessRecord,
  IBusinessRepository,
} from '../../core/interfaces/business-repository.interface';
import type { PreferenceFilter } from '../../core/constants/filter-tags';

@Injectable()
export class BusinessRepository implements IBusinessRepository {
  private readonly logger = new Logger(BusinessRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findFiltered(filter: BusinessFilter): Promise<BusinessRecord[]> {
    const conditions: Prisma.BusinessWhereInput[] = [];

    if (filter.preference_tags?.length) {
      for (const pref of filter.preference_tags) {
        const cond = this.conditionForPreference(pref);
        if (cond) conditions.push(cond);
      }
    }

    if (filter.excludedLanguages?.length) {
      conditions.push({
        OR: [
          { language: { notIn: filter.excludedLanguages } },
          { language: null },
        ],
      });
    }

    const where: Prisma.BusinessWhereInput =
      conditions.length > 0 ? { AND: conditions } : {};

    const rows = await this.prisma.business.findMany({ where });
    this.logger.log({
      preference_tags: filter.preference_tags ?? [],
      excludedLangsCount: filter.excludedLanguages?.length ?? 0,
      rowsCount: rows.length,
      msg: 'findFiltered',
    });

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      tags: (r.tags ?? []) as BusinessRecord['tags'],
      language: r.language,
    }));
  }

  /**
   * Rule-based conditions. Dietary/kosher/alcohol apply only to businesses with RESTAURANT tag.
   */
  private conditionForPreference(pref: PreferenceFilter): Prisma.BusinessWhereInput | null {
    switch (pref) {
      case 'NO_ALCOHOL':
        // Exclude restaurants that serve alcohol. Use OR of NOT has() so we never include RESTAURANT + SERVES_ALCOHOL.
        return {
          OR: [
            { NOT: { tags: { has: PrismaBusinessTag.RESTAURANT } } },
            { NOT: { tags: { has: PrismaBusinessTag.SERVES_ALCOHOL } } },
          ],
        };
      case 'KOSHER_ONLY':
        return { tags: { hasEvery: [PrismaBusinessTag.RESTAURANT, PrismaBusinessTag.KOSHER] } };
      case 'UNKOSHER_ONLY':
        return {
          tags: { hasEvery: [PrismaBusinessTag.RESTAURANT] },
          NOT: { tags: { hasSome: [PrismaBusinessTag.KOSHER] } },
        };
      case 'VEGAN_ONLY':
        return { tags: { hasEvery: [PrismaBusinessTag.RESTAURANT, PrismaBusinessTag.VEGAN] } };
      case 'VEGETARIAN_ONLY':
        return { tags: { hasEvery: [PrismaBusinessTag.RESTAURANT, PrismaBusinessTag.VEGETARIAN] } };
      case 'NO_GAMBLING':
        return { NOT: { tags: { hasSome: [PrismaBusinessTag.GAMBLING] } } };
      default:
        return null;
    }
  }
}
