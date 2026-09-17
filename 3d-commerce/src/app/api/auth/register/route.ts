import { NextResponse } from "next/server";

import { getBackendApiUrl } from "@/lib/backend-api";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      captchaToken?: string;
      captchaAnswer?: string;
    };

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    const captchaToken = body.captchaToken?.trim() ?? "";
    const captchaAnswer = body.captchaAnswer?.trim() ?? "";

    if (!name || !email || password.length < 8 || !captchaToken || !captchaAnswer) {
      return NextResponse.json(
        {
          error:
            "Enter your name, a valid email, a password of at least 8 characters, and complete the CAPTCHA.",
        },
        { status: 400 },
      );
    }

    const backendResponse = await fetch(getBackendApiUrl("auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, captchaToken, captchaAnswer }),
      cache: "no-store",
    });

    const data = (await backendResponse.json()) as {
      user?: { id: string; name: string | null; email: string; role?: string };
      verificationRequired?: boolean;
      message?: string | string[];
      developmentOnly?: { emailVerificationToken?: string };
      emailDeliveryPending?: boolean;
    };

    const message = Array.isArray(data.message) ? data.message[0] : data.message;

    if (!backendResponse.ok || !data.user) {
      return NextResponse.json(
        { error: message ?? "Unable to create your account." },
        { status: backendResponse.status || 502 },
      );
    }

    return NextResponse.json(
      {
        user: {
          id: data.user.id,
          name: data.user.name ?? name,
          email: data.user.email,
        },
        verificationRequired: data.verificationRequired ?? true,
        ...(data.emailDeliveryPending
          ? { emailDeliveryPending: true }
          : {}),
        ...(process.env.NODE_ENV !== "production" && data.developmentOnly
          ? { developmentOnly: data.developmentOnly }
          : {}),
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Authentication service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}
