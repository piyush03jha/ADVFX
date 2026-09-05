import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { CreateTaxRuleDto } from './dto/create-tax-rule.dto';

@Injectable()
export class PricingAdminService {
  constructor(private readonly prisma: PrismaService) {}

  listTaxRules() {
    return this.prisma.taxRule.findMany({ orderBy: [{ isActive: 'desc' }, { priority: 'desc' }, { createdAt: 'desc' }] });
  }

  async createTaxRule(dto: CreateTaxRuleDto) {
    if (dto.rateBps > 10000) throw new BadRequestException('Tax rate cannot exceed 100%');
    return this.prisma.taxRule.create({
      data: {
        name: dto.name.trim(),
        countryCode: dto.countryCode.trim().toUpperCase(),
        stateCode: dto.stateCode?.trim() || null,
        rateBps: dto.rateBps,
        applyToShipping: dto.applyToShipping ?? false,
        priority: dto.priority ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async deactivateTaxRule(id: string) {
    const rule = await this.prisma.taxRule.findUnique({ where: { id }, select: { id: true } });
    if (!rule) throw new NotFoundException('Tax rule not found');
    return this.prisma.taxRule.update({ where: { id }, data: { isActive: false } });
  }

  listPromotions() {
    return this.prisma.promotion.findMany({ orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }] });
  }

  async createPromotion(dto: CreatePromotionDto) {
    const code = dto.code?.trim().toUpperCase() || null;
    if (dto.type === 'PERCENTAGE' && dto.value > 10000) {
      throw new BadRequestException('Percentage promotion cannot exceed 100%');
    }
    if (dto.endsAt && dto.startsAt && new Date(dto.endsAt) < new Date(dto.startsAt)) {
      throw new BadRequestException('Promotion end time must be after start time');
    }

    if (code) {
      const existing = await this.prisma.promotion.findUnique({ where: { code } });
      if (existing) throw new ConflictException('A promotion with this coupon code already exists');
    }

    return this.prisma.promotion.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        code,
        type: dto.type,
        value: dto.value,
        minSubtotalMinor: dto.minSubtotalMinor ?? null,
        maxDiscountMinor: dto.maxDiscountMinor ?? null,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        usageLimit: dto.usageLimit ?? null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async deactivatePromotion(id: string) {
    const promotion = await this.prisma.promotion.findUnique({ where: { id }, select: { id: true } });
    if (!promotion) throw new NotFoundException('Promotion not found');
    return this.prisma.promotion.update({ where: { id }, data: { isActive: false } });
  }
}
