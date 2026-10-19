// Shared order/tracking view types. Order data itself always comes from the API;
// the old sample orders and status-label helpers were unused and have been removed.
export type OrderStatus =
  | "placed"
  | "confirmed"
  | "processing"
  | "packed"
  | "shipped"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

export interface TrackingEvent {
  status: OrderStatus;
  title: string;
  description: string;
  location?: string;
  timestamp: string;
  completed: boolean;
  current?: boolean;
}

export interface Shipment {
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
  status: OrderStatus;
  estimatedDelivery: string;
  events: TrackingEvent[];
}

export interface OrderAddress {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;

  status: OrderStatus;

  items: OrderItem[];

  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;

  paymentMethod: {
    type: string;
    label: string;
    lastFour?: string;
  };

  shippingAddress: OrderAddress;

  shipment?: Shipment;
}
