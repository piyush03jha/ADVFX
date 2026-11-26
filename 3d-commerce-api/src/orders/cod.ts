import { BadRequestException } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
export function codAvailable(country: string, currency: string) {
  return process.env.COD_ENABLED === 'true' && ['IN', 'INDIA'].includes(country.trim().toUpperCase()) && currency === 'INR';
}
export async function collectCod(tx: Prisma.TransactionClient, orderId: string, confirmed: boolean) {
  const payment = await tx.payment.findUnique({ where: { orderId } });
  if (payment?.provider !== 'COD' || payment.status === PaymentStatus.CAPTURED) return;
  if (!confirmed || payment.status !== PaymentStatus.PENDING) throw new BadRequestException('Confirm that the courier collected the COD payment before marking delivered.');
  const updated = await tx.payment.updateMany({
    where: { id: payment.id, provider: 'COD', status: PaymentStatus.PENDING },
    data: { status: PaymentStatus.CAPTURED, paidAt: new Date() },
  });
  if (updated.count !== 1) throw new BadRequestException('COD payment changed. Refresh the order.');
  const items = await tx.orderItem.findMany({ where: { orderId }, select: { productId: true, quantity: true } });
  const totals = new Map<string, number>();
  for (const item of items) totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.quantity);
  for (const [productId, unitsSold] of totals) await tx.productMetrics.upsert({
    where: { productId }, create: { productId, purchaseCount: 1, unitsSold },
    update: { purchaseCount: { increment: 1 }, unitsSold: { increment: unitsSold } },
  });
}
