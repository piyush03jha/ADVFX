import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { whatsappEnabled } from './whatsapp-order';

@Injectable()
export class WhatsAppOrderWorker {
  private readonly logger = new Logger(WhatsAppOrderWorker.name);
  private busy = false;
  constructor(private readonly prisma: PrismaService) {}
  @Interval(15000)
  async dispatch() {
    if (this.busy || !whatsappEnabled()) return;
    this.busy = true;
    try {
      await this.prisma.whatsAppOrderMessage.updateMany({
        where: { status: 'SENDING', updatedAt: { lt: new Date(Date.now() - 300000) } },
        data: { status: 'UNKNOWN', lastError: 'Interrupted send; verify in WhatsApp Manager' },
      });
      const jobs = await this.prisma.whatsAppOrderMessage.findMany({
        where: { status: 'PENDING', nextAttemptAt: { lte: new Date() } },
        orderBy: { createdAt: 'asc' }, take: 5,
      });
      for (const job of jobs) {
        const claimed = await this.prisma.whatsAppOrderMessage.updateMany({ where: { id: job.id, status: 'PENDING' }, data: { status: 'SENDING', attempts: { increment: 1 } } });
        if (!claimed.count) continue;
        try {
          const templates: Record<string, string | undefined> = { CONFIRMED: process.env.WHATSAPP_TEMPLATE_CONFIRMED, SHIPPED: process.env.WHATSAPP_TEMPLATE_SHIPPED, DELIVERED: process.env.WHATSAPP_TEMPLATE_DELIVERED };
          const template = templates[job.event];
          if (!template || !Array.isArray(job.parameters) || !job.parameters.every((value) => typeof value === 'string')) {
            await this.prisma.whatsAppOrderMessage.update({ where: { id: job.id }, data: { status: 'FAILED', lastError: 'Invalid template or parameters' } }); continue;
          }
          const order = await this.prisma.order.findUnique({ where: { id: job.orderId }, select: { status: true, whatsappPhone: true, whatsappOptedInAt: true } });
          if (!order?.whatsappOptedInAt || order.whatsappPhone !== job.recipient || ['CANCELLED', 'REFUNDED'].includes(order.status)) {
            await this.prisma.whatsAppOrderMessage.update({ where: { id: job.id }, data: { status: 'SKIPPED', lastError: 'Order closed or consent unavailable' } }); continue;
          }
          const response = await fetch('https://graph.facebook.com/' + process.env.WHATSAPP_GRAPH_VERSION + '/' + process.env.WHATSAPP_PHONE_NUMBER_ID + '/messages', {
            method: 'POST', headers: { Authorization: 'Bearer ' + process.env.WHATSAPP_ACCESS_TOKEN, 'Content-Type': 'application/json' },
            body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: job.recipient, type: 'template', template: { name: template, language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en' }, components: [{ type: 'body', parameters: job.parameters.map((text) => ({ type: 'text', text })) }] } }),
            signal: AbortSignal.timeout(10000),
          });
          const data = await response.json().catch(() => null);
          if (response.ok && typeof data?.messages?.[0]?.id === 'string') await this.prisma.whatsAppOrderMessage.update({ where: { id: job.id }, data: { status: 'ACCEPTED', providerMessageId: data.messages[0].id, lastError: null } });
          else {
            const retry = response.status === 429 && job.attempts < 4;
            await this.prisma.whatsAppOrderMessage.update({ where: { id: job.id }, data: {
              status: retry ? 'PENDING' : response.status >= 500 || response.ok ? 'UNKNOWN' : 'FAILED',
              nextAttemptAt: new Date(Date.now() + Math.min(30, 2 ** (job.attempts + 1)) * 60000),
              lastError: 'Meta HTTP ' + response.status + (typeof data?.error?.code === 'number' ? ' code ' + data.error.code : ''),
            } });
          }
        } catch {
          await this.prisma.whatsAppOrderMessage.update({ where: { id: job.id }, data: { status: 'UNKNOWN', lastError: 'Send outcome uncertain; verify before retrying' } }).catch(() => undefined);
          this.logger.warn('WhatsApp send outcome uncertain: ' + job.id);
        }
      }
    } catch { this.logger.error('WhatsApp outbox dispatch failed'); }
    finally { this.busy = false; }
  }
}
