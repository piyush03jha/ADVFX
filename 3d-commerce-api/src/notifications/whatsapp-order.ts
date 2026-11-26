import type { Prisma } from '@prisma/client';
export function whatsappEnabled() {
  return process.env.WHATSAPP_ORDER_UPDATES_ENABLED === 'true' &&
    /^v\d+\.\d+$/.test(process.env.WHATSAPP_GRAPH_VERSION ?? '') &&
    /^\d+$/.test(process.env.WHATSAPP_PHONE_NUMBER_ID ?? '') &&
    Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_TEMPLATE_CONFIRMED &&
      process.env.WHATSAPP_TEMPLATE_SHIPPED && process.env.WHATSAPP_TEMPLATE_DELIVERED);
}
export function normalizeWhatsAppPhone(phone: string, country: string): string | null {
  const compact = phone.trim().replace(/[\s().-]/g, '');
  if (!/^\+?\d+$/.test(compact)) return null;
  if (['IN', 'INDIA'].includes(country.trim().toUpperCase())) {
    const local = compact.replace(/^\+?91(?=\d{10}$)/, '').replace(/^0(?=\d{10}$)/, '');
    return /^[6-9]\d{9}$/.test(local) ? '91' + local : null;
  }
  return /^\+[1-9]\d{7,14}$/.test(compact) ? compact.slice(1) : null;
}
export type WhatsAppEvent = 'CONFIRMED' | 'SHIPPED' | 'DELIVERED';
type OrderData = { id: string; orderNumber: string; whatsappPhone?: string | null; whatsappOptedInAt?: Date | null; totalMinor: number; currency: string };
export async function queueWhatsAppOrder(tx: Prisma.TransactionClient, order: OrderData, event: WhatsAppEvent, options: { cod?: boolean; carrier?: string | null; trackingNumber?: string | null } = {}) {
  if (!order.whatsappPhone || !order.whatsappOptedInAt) return;
  if (event === 'SHIPPED' && (!options.carrier?.trim() || !options.trackingNumber?.trim())) return;
  const parameters = event === 'CONFIRMED' ? [order.orderNumber, new Intl.NumberFormat('en-IN', { style: 'currency', currency: order.currency }).format(order.totalMinor / 100), options.cod ? 'Cash on delivery' : 'Prepaid'] : event === 'SHIPPED' ? [order.orderNumber, options.carrier!.trim(), options.trackingNumber!.trim()] : [order.orderNumber];
  await tx.whatsAppOrderMessage.upsert({
    where: { orderId_event: { orderId: order.id, event } },
    create: { orderId: order.id, event, recipient: order.whatsappPhone, parameters }, update: {},
  });
}
