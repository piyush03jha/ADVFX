export function canCancelBeforeShipment(order: {
  status: string;
  shipment?: { status: string; shippedAt?: Date | string | null; deliveredAt?: Date | string | null } | null;
}) {
  return ['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'READY_TO_SHIP'].includes(order.status) &&
    !order.shipment?.shippedAt && !order.shipment?.deliveredAt &&
    (!order.shipment || ['PENDING', 'LABEL_CREATED'].includes(order.shipment.status));
}
