import { Controller, Get, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('site-content')
export class SiteContentController {
  constructor(private readonly prisma: PrismaService) {}
  @Get(':key')
  async get(@Param('key') key: string) {
    const allowed = new Set(['siteContent','privacy','terms','refund','shipping','faq','contactEmail']);
    if (!allowed.has(key)) return { key, value: null };
    const row = await this.prisma.siteSetting.findUnique({ where: { key } });
    if (!row) return { key, value: null };
    try { return { key, value: JSON.parse(row.value) }; } catch { return { key, value: row.value }; }
  }
}
