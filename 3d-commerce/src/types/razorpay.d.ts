export {};

declare global {
  interface RazorpayCheckoutOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description?: string;
    order_id: string;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };
    notes?: Record<string, string>;
    theme?: {
      color?: string;
    };
    modal?: {
      ondismiss?: () => void;
    };
    handler?: (response: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }) => void;
  }

  interface RazorpayInstance {
    open(): void;
    on(event: string, handler: (response: unknown) => void): void;
  }

  interface RazorpayConstructor {
    new (options: RazorpayCheckoutOptions): RazorpayInstance;
  }

  interface Window {
    Razorpay: RazorpayConstructor;
  }
}
