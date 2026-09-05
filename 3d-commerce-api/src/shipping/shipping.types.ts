import { ShippingRuleType } from '@prisma/client';

export interface ShippingQuoteContext {
  subtotalMinor: number;
  weightGrams: number;
  country: string;
  state: string;
}

export interface ShippingQuote {
  amountMinor: number;
  currency: string;
  ruleId: string | null;
  estimatedMinDays: number | null;
  estimatedMaxDays: number | null;
  label: string;
}

export interface ShippingRuleInput {
  name: string;
  type: ShippingRuleType;
  amountMinor?: number;
  freeAboveMinor?: number;
  minWeightGrams?: number;
  maxWeightGrams?: number;
  countryCode?: string;
  stateCode?: string;
  estimatedMinDays?: number;
  estimatedMaxDays?: number;
  priority?: number;
}
