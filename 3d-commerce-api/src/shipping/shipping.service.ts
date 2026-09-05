import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ShippingRuleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShippingRuleDto } from './dto/create-shipping-rule.dto';
import { UpdateShippingRuleDto } from './dto/update-shipping-rule.dto';
import { ShippingQuote, ShippingQuoteContext } from './shipping.types';

@Injectable()
export class ShippingService {
  constructor(private readonly prisma: PrismaService) {}

  async listRules(includeInactive = false) {
    return this.prisma.shippingRule.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async createRule(dto: CreateShippingRuleDto) {
    this.validateRule(dto);
    return this.prisma.shippingRule.create({ data: this.toData(dto) });
  }

  async updateRule(id: string, dto: UpdateShippingRuleDto) {
    const existing = await this.prisma.shippingRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Shipping rule not found');

    const merged = { ...existing, ...dto, type: dto.type ?? existing.type } as CreateShippingRuleDto;
    this.validateRule(merged);
    return this.prisma.shippingRule.update({ where: { id }, data: this.toData(merged) });
  }

  async deactivateRule(id: string) {
    const rule = await this.prisma.shippingRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Shipping rule not found');
    return this.prisma.shippingRule.update({ where: { id }, data: { isActive: false } });
  }

  async quote(context: ShippingQuoteContext): Promise<ShippingQuote> {
    const rules = await this.prisma.shippingRule.findMany({
      where: { isActive: true },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    const matching = rules.filter((rule) => this.matches(rule, context));
    if (matching.length === 0) {
      return {
        amountMinor: 0,
        currency: 'INR',
        ruleId: null,
        estimatedMinDays: null,
        estimatedMaxDays: null,
        label: 'Shipping calculated after order review',
      };
    }

    const rule = matching[0];
    const amountMinor = this.calculate(rule, context);

    return {
      amountMinor,
      currency: 'INR',
      ruleId: rule.id,
      estimatedMinDays: rule.estimatedMinDays,
      estimatedMaxDays: rule.estimatedMaxDays,
      label: amountMinor === 0 ? 'Free shipping' : rule.name,
    };
  }

  private matches(rule: any, context: ShippingQuoteContext) {
    if (rule.countryCode && rule.countryCode.toUpperCase() !== context.country.toUpperCase()) return false;
    if (rule.stateCode && rule.stateCode.toUpperCase() !== context.state.toUpperCase()) return false;

    if (rule.type === ShippingRuleType.WEIGHT_BASED) {
      if (rule.minWeightGrams != null && context.weightGrams < rule.minWeightGrams) return false;
      if (rule.maxWeightGrams != null && context.weightGrams > rule.maxWeightGrams) return false;
    }

    return true;
  }

  private calculate(rule: any, context: ShippingQuoteContext) {
    switch (rule.type) {
      case ShippingRuleType.FREE:
        return 0;
      case ShippingRuleType.FLAT_RATE:
        return rule.amountMinor ?? 0;
      case ShippingRuleType.FREE_ABOVE:
        return context.subtotalMinor >= (rule.freeAboveMinor ?? Number.MAX_SAFE_INTEGER)
          ? 0
          : rule.amountMinor ?? 0;
      case ShippingRuleType.WEIGHT_BASED:
        return rule.amountMinor ?? 0;
      default:
        throw new BadRequestException(`Unsupported shipping rule type: ${rule.type}`);
    }
  }

  private validateRule(dto: CreateShippingRuleDto) {
    if (dto.estimatedMinDays != null && dto.estimatedMaxDays != null && dto.estimatedMinDays > dto.estimatedMaxDays) {
      throw new BadRequestException('estimatedMinDays cannot exceed estimatedMaxDays');
    }
    if (dto.type === ShippingRuleType.WEIGHT_BASED && dto.minWeightGrams != null && dto.maxWeightGrams != null && dto.minWeightGrams > dto.maxWeightGrams) {
      throw new BadRequestException('minWeightGrams cannot exceed maxWeightGrams');
    }
  }

  private toData(dto: CreateShippingRuleDto) {
    return {
      name: dto.name,
      type: dto.type,
      amountMinor: dto.amountMinor ?? null,
      freeAboveMinor: dto.freeAboveMinor ?? null,
      minWeightGrams: dto.minWeightGrams ?? null,
      maxWeightGrams: dto.maxWeightGrams ?? null,
      countryCode: dto.countryCode?.trim().toUpperCase() || null,
      stateCode: dto.stateCode?.trim().toUpperCase() || null,
      estimatedMinDays: dto.estimatedMinDays ?? null,
      estimatedMaxDays: dto.estimatedMaxDays ?? null,
      priority: dto.priority ?? 0,
    };
  }
}
