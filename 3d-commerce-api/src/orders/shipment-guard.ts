/**
 * Rules for shipment updates that also move the order forward.
 *
 * Orders are made to order: payment capture confirms the order automatically,
 * then the order is produced and shipped. A shipment update must therefore
 * never ship or deliver an order that was not confirmed, and must never bring
 * a cancelled, refunded or already delivered order back to life.
 *
 * Kept free of Prisma imports so it can be unit tested on its own.
 */

export type ShipmentDrivenOrderStatus = 'SHIPPED' | 'DELIVERED';

const SHIPPABLE_FROM = ['CONFIRMED', 'PROCESSING', 'READY_TO_SHIP'];
const DELIVERABLE_FROM = [...SHIPPABLE_FROM, 'SHIPPED'];

export type ShipmentGuardResult =
  | { action: 'KEEP' }
  | { action: 'ADVANCE'; to: ShipmentDrivenOrderStatus }
  | { action: 'REJECT'; message: string };

/** The order status a shipment status implies, or null if it implies none. */
export function orderStatusForShipment(
  shipmentStatus: string,
): ShipmentDrivenOrderStatus | null {
  switch (shipmentStatus) {
    case 'SHIPPED':
    case 'IN_TRANSIT':
      return 'SHIPPED';
    case 'DELIVERED':
      return 'DELIVERED';
    default:
      return null;
  }
}

export function guardShipmentUpdate(
  orderStatus: string,
  shipmentStatus: string | undefined,
): ShipmentGuardResult {
  if (!shipmentStatus) return { action: 'KEEP' };

  const target = orderStatusForShipment(shipmentStatus);
  if (!target || target === orderStatus) return { action: 'KEEP' };

  const allowedFrom = target === 'SHIPPED' ? SHIPPABLE_FROM : DELIVERABLE_FROM;
  if (allowedFrom.includes(orderStatus)) return { action: 'ADVANCE', to: target };

  const state = orderStatus.replace(/_/g, ' ').toLowerCase();
  const hint =
    orderStatus === 'PENDING_PAYMENT'
      ? ' Orders are confirmed automatically once payment is captured.'
      : '';
  return {
    action: 'REJECT',
    message: `Cannot set the shipment to ${shipmentStatus}: the order is ${state}.${hint}`,
  };
}
