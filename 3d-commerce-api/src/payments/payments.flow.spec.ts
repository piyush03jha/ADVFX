/**
 * Payment / checkout behaviour tests: the REAL services against a REAL PostgreSQL database.
 * Only Razorpay's network calls are faked.
 *
 * Run with:
 *   TEST_DATABASE_URL=postgresql://... npm test -- payments.flow
 *
 * The suite is skipped automatically when TEST_DATABASE_URL is unset.
 */
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

import { NotificationsService } from "../notifications/notifications.service";
import { OrdersService } from "../orders/orders.service";
import { PaymentsService } from "./payments.service";
import { PricingService } from "../pricing/pricing.service";
import { PrismaService } from "../prisma/prisma.service";

const describeDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

class FakeRazorpay {
  seq = 0;
  orders = new Map<string, any>();
  payments = new Map<string, Array<any>>();
  refunds: Array<{ paymentId: string; amount?: number }> = [];

  getPublicKeyId() {
    return "rzp_test_fake";
  }

  async createOrder(i: { amountMinor: number; currency: string; receipt: string }) {
    const id = `order_${Date.now()}_${++this.seq}`;
    this.orders.set(id, {
      id,
      entity: "order",
      amount: i.amountMinor,
      currency: i.currency,
      status: "created",
      amount_paid: 0,
      amount_due: i.amountMinor,
      attempts: 0,
    });
    this.payments.set(id, []);
    return {
      id,
      amount: i.amountMinor,
      currency: i.currency,
      receipt: i.receipt,
      status: "created",
    };
  }

  async fetchOrder(id: string) {
    return { ...this.orders.get(id) };
  }

  async fetchPayments(orderId: string) {
    return this.payments.get(orderId) ?? [];
  }

  async refundPayment(paymentId: string, amount?: number) {
    this.refunds.push({ paymentId, amount });
    return { id: "rfnd_1", amount: amount ?? 0, status: "processed" };
  }

  verifyPaymentSignature() {
    return true;
  }

  verifyWebhookSignature() {
    return true;
  }

  addPayment(orderId: string, payment: any) {
    const list = this.payments.get(orderId) ?? [];
    list.push(payment);
    this.payments.set(orderId, list);
  }

  markPaid(orderId: string, paymentId = "pay_real") {
    const order = this.orders.get(orderId);
    if (!order) throw new Error("Unknown Razorpay order");

    order.status = "paid";
    order.amount_paid = order.amount;
    order.amount_due = 0;
    order.attempts += 1;

    this.addPayment(orderId, {
      id: paymentId,
      order_id: orderId,
      status: "captured",
      amount: order.amount,
      currency: order.currency,
    });
  }
}

describeDb("AUDIT: checkout -> payment behaviour (real DB)", () => {
  jest.setTimeout(60_000);

  const prisma = new PrismaService();
  const razorpay = new FakeRazorpay();
  const notifications = new NotificationsService(prisma);
  const pricing = new PricingService(prisma);
  const observability = {
    captureException: async () => undefined,
    captureMessage: async () => undefined,
  } as any;

  const orders = new OrdersService(
    prisma,
    notifications,
    pricing,
    razorpay as any,
    observability,
  );
  const payments = new PaymentsService(prisma, razorpay as any, notifications);
  let n = 0;

  beforeAll(async () => {
    await prisma.$connect();

    if (
      !(await prisma.shippingRule.findFirst({
        where: { name: "audit-free" },
      }))
    ) {
      await prisma.shippingRule.create({
        data: { name: "audit-free", type: "FREE", priority: 100 },
      });
    }
  });

  afterAll(async () => prisma.$disconnect());

  async function user(tag: string) {
    const u = await prisma.user.create({
      data: {
        email: `u-${tag}@audit.dev`,
        name: "T",
        role: "CUSTOMER",
        emailVerifiedAt: new Date(),
      },
    });

    const a = await prisma.address.create({
      data: {
        userId: u.id,
        fullName: "T",
        phone: "9999999999",
        line1: "1 Rd",
        city: "Mumbai",
        state: "MH",
        postalCode: "400001",
        country: "IN",
      },
    });

    return { u, a };
  }

  async function product(
    name: string,
    stock: number,
    price: number,
    tag: string,
  ) {
    return prisma.product.create({
      data: {
        name,
        slug: `${name}-${tag}`,
        status: "ACTIVE",
        inventory: {
          create: { stock, reserved: 0, trackStock: true },
        },
        prices: {
          create: { amountMinor: price, currency: "INR", isActive: true },
        },
      },
    });
  }

  async function shop(stockA = 10) {
    const tag = `${Date.now()}-${++n}`;
    const { u, a } = await user(tag);

    return {
      tag,
      u,
      a,
      A: await product("a", stockA, 10000, tag),
      B: await product("b", 10, 20000, tag),
    };
  }

  async function fillCart(
    userId: string,
    lines: Array<{ productId: string; quantity: number }>,
  ) {
    const cart = await prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    for (const line of lines) {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: line.productId,
          quantity: line.quantity,
        },
      });
    }
  }

  const cart = async (userId: string) =>
    (
      await prisma.cartItem.findMany({
        where: { cart: { userId } },
      })
    ).map((i) => ({ p: i.productId, q: i.quantity }));

  const inv = (productId: string) =>
    prisma.productInventory.findUniqueOrThrow({ where: { productId } });

  const ord = (id: string) =>
    prisma.order.findUniqueOrThrow({
      where: { id },
      include: { payment: true },
    });

  const checkout = (
    uid: string,
    addr: string,
    items?: Array<{ productId: string; quantity: number }>,
  ) =>
    orders.createFromCart(
      uid,
      addr,
      undefined,
      `k-${Date.now()}-${++n}`,
      undefined,
      items,
    );

  const verify = (
    uid: string,
    orderId: string,
    razorpayOrderId: string,
    pid = "pay_ok",
  ) =>
    payments.verifyRazorpayPayment(uid, {
      orderId,
      razorpayOrderId,
      razorpayPaymentId: pid,
      razorpaySignature: "sig",
    });

  const hook = (event: string, entity: Record<string, unknown>) =>
    payments.handleWebhook(
      JSON.stringify({
        event,
        payload: { payment: { entity } },
      }),
      "sig",
    );

  it("1 HAPPY PATH: pay -> order confirmed, purchased line leaves the cart, stock consumed", async () => {
    const { u, a, A, B } = await shop();

    await fillCart(u.id, [
      { productId: A.id, quantity: 2 },
      { productId: B.id, quantity: 1 },
    ]);

    const o = await checkout(u.id, a.id);
    const rz = await payments.createRazorpayOrder(u.id, o.id);

    await verify(u.id, o.id, rz.razorpayOrderId!);

    expect((await ord(o.id)).status).toBe("CONFIRMED");
    expect(await cart(u.id)).toEqual([]);
    expect((await inv(A.id)).stock).toBe(8);
  });

  it("2 ABANDON: order created keeps the cart; closing Razorpay (nothing paid) releases stock, cart intact", async () => {
    const { u, a, A } = await shop();

    await fillCart(u.id, [{ productId: A.id, quantity: 2 }]);

    const o = await checkout(u.id, a.id);
    await payments.createRazorpayOrder(u.id, o.id);
    await payments.cancelRazorpayPayment(u.id, o.id);

    expect((await ord(o.id)).status).toBe("CANCELLED");
    expect((await inv(A.id)).reserved).toBe(0);
    expect(await cart(u.id)).toEqual([{ p: A.id, q: 2 }]);
  });

  it("3 BUY NOW: direct item never touches an existing cart", async () => {
    const { u, a, A, B } = await shop();

    await fillCart(u.id, [{ productId: B.id, quantity: 1 }]);

    const o = await checkout(u.id, a.id, [{ productId: A.id, quantity: 1 }]);
    const rz = await payments.createRazorpayOrder(u.id, o.id);

    await verify(u.id, o.id, rz.razorpayOrderId!);

    expect((await ord(o.id)).status).toBe("CONFIRMED");
    expect(await cart(u.id)).toEqual([{ p: B.id, q: 1 }]);
  });

  it("4 DECLINE THEN PAY (browser confirms): card declines, UPI succeeds in the same window -> order is confirmed", async () => {
    const { u, a, A } = await shop();

    await fillCart(u.id, [{ productId: A.id, quantity: 1 }]);

    const o = await checkout(u.id, a.id);
    const rz = await payments.createRazorpayOrder(u.id, o.id);

    await hook("payment.failed", {
      id: "pay_declined",
      order_id: rz.razorpayOrderId,
    });

    await verify(u.id, o.id, rz.razorpayOrderId!, "pay_upi_ok");

    const after = await ord(o.id);
    expect(after.status).toBe("CONFIRMED");
    expect(after.payment?.status).toBe("CAPTURED");
  });

  it("5 DECLINE THEN PAY (tab closed, webhook only): captured webhook confirms the order", async () => {
    const { u, a, A } = await shop();

    await fillCart(u.id, [{ productId: A.id, quantity: 1 }]);

    const o = await checkout(u.id, a.id);
    const rz = await payments.createRazorpayOrder(u.id, o.id);

    await hook("payment.failed", {
      id: "pay_declined",
      order_id: rz.razorpayOrderId,
    });

    await hook("payment.captured", {
      id: "pay_ok",
      order_id: rz.razorpayOrderId,
      amount: o.totalMinor,
      currency: "INR",
    });

    expect((await ord(o.id)).status).toBe("CONFIRMED");
  });

  it("6 PAID THEN WINDOW CLOSED: dismiss must not cancel a provider-paid order", async () => {
    const { u, a, A } = await shop();

    await fillCart(u.id, [{ productId: A.id, quantity: 1 }]);

    const o = await checkout(u.id, a.id);
    const rz = await payments.createRazorpayOrder(u.id, o.id);

    razorpay.markPaid(rz.razorpayOrderId!);

    await payments.cancelRazorpayPayment(u.id, o.id);

    const after = await ord(o.id);
    expect(after.status).toBe("CONFIRMED");
    expect(razorpay.refunds).toHaveLength(0);
  });

  it("7 LATE PAYMENT after the checkout expired: captured money must be refunded, never silently kept", async () => {
    const { u, a, A } = await shop();

    await fillCart(u.id, [{ productId: A.id, quantity: 1 }]);

    const o = await checkout(u.id, a.id);
    const rz = await payments.createRazorpayOrder(u.id, o.id);

    razorpay.markPaid(rz.razorpayOrderId!);

    await prisma.inventoryReservation.updateMany({
      where: { orderId: o.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await orders.expireReservations();

    expect((await ord(o.id)).status).toBe("CANCELLED");
    expect(razorpay.refunds.map((r) => r.paymentId)).toContain("pay_real");
  });

  it("8 DUPLICATE PAYMENT: a second captured payment is refunded", async () => {
    const { u, a, A } = await shop();

    await fillCart(u.id, [{ productId: A.id, quantity: 1 }]);

    const o = await checkout(u.id, a.id);
    const rz = await payments.createRazorpayOrder(u.id, o.id);

    await verify(u.id, o.id, rz.razorpayOrderId!, "pay_first");

    await hook("payment.captured", {
      id: "pay_second",
      order_id: rz.razorpayOrderId,
      amount: o.totalMinor,
      currency: "INR",
    });

    expect(razorpay.refunds.map((r) => r.paymentId)).toContain("pay_second");
  });

  it("9 LAST UNIT RACE: two customers, one unit -> exactly one wins", async () => {
    const { u, a, A } = await shop(1);
    const other = await user(`race-${Date.now()}-${++n}`);

    await fillCart(u.id, [{ productId: A.id, quantity: 1 }]);
    await fillCart(other.u.id, [{ productId: A.id, quantity: 1 }]);

    const r = await Promise.allSettled([
      checkout(u.id, a.id),
      checkout(other.u.id, other.a.id),
    ]);

    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect((await inv(A.id)).reserved).toBe(1);
  });

  it("10 CONCURRENT confirm (browser verify + webhook at once): stock consumed exactly once", async () => {
    const { u, a, A } = await shop();

    await fillCart(u.id, [{ productId: A.id, quantity: 2 }]);

    const o = await checkout(u.id, a.id);
    const rz = await payments.createRazorpayOrder(u.id, o.id);

    await Promise.allSettled([
      verify(u.id, o.id, rz.razorpayOrderId!),
      hook("payment.captured", {
        id: "pay_ok",
        order_id: rz.razorpayOrderId,
        amount: o.totalMinor,
        currency: "INR",
      }),
    ]);

    const i = await inv(A.id);
    expect([i.stock, i.reserved]).toEqual([8, 0]);
    expect((await ord(o.id)).status).toBe("CONFIRMED");
  });
});
