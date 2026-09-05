import type { Product } from "@/config/products";

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

const cyberpunk: OrderItem = {
  productId: "1",
  name: "Cyberpunk Warrior",
  image: "/models/products/1.jpg",
  price: 1499,
  quantity: 1,
};

const sportsCar: OrderItem = {
  productId: "2",
  name: "Futuristic Sports Car",
  image: "/models/products/2.jpg",
  price: 1299,
  quantity: 1,
};

const fantasyCastle: OrderItem = {
  productId: "4",
  name: "Fantasy Castle",
  image: "/models/products/4.jpg",
  price: 1799,
  quantity: 1,
};

export const orders: Order[] = [
  {
    id: "forma-10284",
    orderNumber: "FORMA-10284",
    createdAt: "2026-08-24T20:21:00",
    status: "in_transit",

    items: [cyberpunk, sportsCar],

    subtotal: 2798,
    shipping: 99,
    tax: 504,
    discount: 0,
    total: 3401,

    paymentMethod: {
      type: "UPI",
      label: "UPI",
      lastFour: "4821",
    },

    shippingAddress: {
      name: "Piyush Jha",
      phone: "+91 98XXXXXX21",
      addressLine1: "Example Street",
      addressLine2: "New Delhi",
      city: "Delhi",
      state: "Delhi",
      postalCode: "1100XX",
      country: "India",
    },

    shipment: {
      carrier: "Delhivery",
      trackingNumber: "DEL123456789",
      status: "in_transit",
      estimatedDelivery: "30 August 2026",

      events: [
        {
          status: "placed",
          title: "Order placed",
          description:
            "Your order has been received.",
          timestamp: "24 Aug · 8:21 PM",
          completed: true,
        },
        {
          status: "confirmed",
          title: "Payment confirmed",
          description:
            "Your payment was successfully received.",
          timestamp: "24 Aug · 8:21 PM",
          completed: true,
        },
        {
          status: "packed",
          title: "Order packed",
          description:
            "Your products have been packed.",
          timestamp: "27 Aug · 4:32 PM",
          completed: true,
        },
        {
          status: "shipped",
          title: "Shipped",
          description:
            "Your package has left our warehouse.",
          location: "Delhi",
          timestamp: "28 Aug · 10:15 AM",
          completed: true,
        },
        {
          status: "in_transit",
          title: "In transit",
          description:
            "Your package is moving toward you.",
          location: "Gurgaon",
          timestamp: "28 Aug · 6:20 PM",
          completed: true,
          current: true,
        },
        {
          status: "out_for_delivery",
          title: "Out for delivery",
          description:
            "Your package will be delivered soon.",
          timestamp: "",
          completed: false,
        },
        {
          status: "delivered",
          title: "Delivered",
          description:
            "Your order has been delivered.",
          timestamp: "",
          completed: false,
        },
      ],
    },
  },

  {
    id: "forma-10263",
    orderNumber: "FORMA-10263",
    createdAt: "2026-08-22T14:10:00",
    status: "out_for_delivery",

    items: [fantasyCastle],

    subtotal: 1799,
    shipping: 99,
    tax: 324,
    discount: 0,
    total: 2222,

    paymentMethod: {
      type: "Card",
      label: "Visa",
      lastFour: "4242",
    },

    shippingAddress: {
      name: "Piyush Jha",
      phone: "+91 98XXXXXX21",
      addressLine1: "Example Street",
      addressLine2: "New Delhi",
      city: "Delhi",
      state: "Delhi",
      postalCode: "1100XX",
      country: "India",
    },

    shipment: {
      carrier: "Delhivery",
      trackingNumber: "DEL987654321",
      status: "out_for_delivery",
      estimatedDelivery: "Today",

      events: [
        {
          status: "placed",
          title: "Order placed",
          description:
            "Your order has been received.",
          timestamp: "22 Aug · 2:10 PM",
          completed: true,
        },
        {
          status: "confirmed",
          title: "Payment confirmed",
          description:
            "Payment successfully received.",
          timestamp: "22 Aug · 2:10 PM",
          completed: true,
        },
        {
          status: "packed",
          title: "Order packed",
          description:
            "Your product has been packed.",
          timestamp: "23 Aug · 11:20 AM",
          completed: true,
        },
        {
          status: "shipped",
          title: "Shipped",
          description:
            "Your package has left our warehouse.",
          location: "Delhi",
          timestamp: "24 Aug · 9:10 AM",
          completed: true,
        },
        {
          status: "in_transit",
          title: "In transit",
          description:
            "Your package is moving toward you.",
          location: "Delhi",
          timestamp: "24 Aug · 7:15 PM",
          completed: true,
        },
        {
          status: "out_for_delivery",
          title: "Out for delivery",
          description:
            "Your package is with the delivery partner.",
          location: "New Delhi",
          timestamp: "Today · 8:12 AM",
          completed: true,
          current: true,
        },
        {
          status: "delivered",
          title: "Delivered",
          description:
            "Your order has been delivered.",
          timestamp: "",
          completed: false,
        },
      ],
    },
  },
];

export function getOrderById(
  id: string,
): Order | undefined {
  return orders.find(
    (order) =>
      order.id === id ||
      order.orderNumber === id,
  );
}

export function getOrderStatusLabel(
  status: OrderStatus,
): string {
  const labels: Record<OrderStatus, string> = {
    placed: "Order placed",
    confirmed: "Payment confirmed",
    processing: "Processing",
    packed: "Packed",
    shipped: "Shipped",
    in_transit: "In transit",
    out_for_delivery: "Out for delivery",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };

  return labels[status];
}

export function getOrderStatusDescription(
  status: OrderStatus,
): string {
  const descriptions: Record<OrderStatus, string> = {
    placed: "Your order has been received.",
    confirmed: "Payment has been confirmed.",
    processing: "Your order is being prepared.",
    packed: "Your products have been packed.",
    shipped: "Your package has left our warehouse.",
    in_transit: "Your package is moving toward you.",
    out_for_delivery:
      "Your package is with the delivery partner.",
    delivered: "Your order has been delivered.",
    cancelled: "This order has been cancelled.",
  };

  return descriptions[status];
}