import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/app/api/auth/admin/login/route";
import { getBackendApiUrl } from "@/lib/backend-api";

async function proxy(
  request: Request,
  orderId: string,
  method: "GET" | "PATCH",
) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { error: "Authentication is required." },
      { status: 401 },
    );
  }

  try {
    const response = await fetch(
      getBackendApiUrl(
        `shipments/order/${encodeURIComponent(orderId)}`,
      ),
      {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(method === "PATCH"
            ? { "Content-Type": "application/json" }
            : {}),
        },
        ...(method === "PATCH"
          ? { body: await request.text() }
          : {}),
        cache: "no-store",
      },
    );

    const data = await response.json().catch(() => null);

    return NextResponse.json(
      data ?? { error: "Unable to update shipment." },
      { status: response.status },
    );
  } catch {
    return NextResponse.json(
      { error: "Shipment service is unavailable." },
      { status: 503 },
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  return proxy(request, orderId, "GET");
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  return proxy(request, orderId, "PATCH");
}
