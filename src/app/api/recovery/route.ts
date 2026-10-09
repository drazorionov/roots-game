import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, sameOrigin } from "@/lib/auth";
import {
  completeRecovery,
  sendRecoveryCode,
  verifyRecoveryCode,
} from "@/lib/password-recovery";

const email = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const data = z
      .discriminatedUnion("action", [
        z.object({ action: z.literal("request"), email }),
        z.object({
          action: z.literal("verify"),
          email,
          code: z.string().min(1).max(128),
        }),
        z.object({
          action: z.literal("complete"),
          password: z.string().min(8).max(128),
        }),
      ])
      .parse(await req.json());
    const ip =
      req.headers.get("x-vercel-forwarded-for") ??
      req.headers.get("x-forwarded-for") ??
      "local";
    if (!(await rateLimit(`recovery-ip:${ip}`, 20)))
      return NextResponse.json(
        { error: "Too many attempts. Try again in 15 minutes." },
        { status: 429 },
      );
    if (data.action === "request") {
      await sendRecoveryCode(data.email);
      return NextResponse.json({ ok: true });
    }
    if (data.action === "verify") {
      if (!(await rateLimit(`recovery-verify:${data.email}`, 8)))
        return NextResponse.json(
          { error: "Too many attempts. Try again in 15 minutes." },
          { status: 429 },
        );
      if (!(await verifyRecoveryCode(data.email, data.code)))
        return NextResponse.json(
          {
            error:
              "The temporary code is invalid or expired. Request a new code.",
          },
          { status: 400 },
        );
      return NextResponse.json({ requiresPasswordChange: true });
    }
    if (!(await completeRecovery(data.password)))
      return NextResponse.json(
        { error: "The recovery session has expired. Request a new code." },
        { status: 400 },
      );
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const deliveryError = [
      "Password recovery email is not configured. Please contact the administrator.",
      "Recovery email could not be sent. Please try again later.",
    ].includes(message);
    return NextResponse.json(
      {
        error: deliveryError
          ? message
          : "Could not recover password. Check your details and try again.",
      },
      { status: deliveryError ? 503 : 400 },
    );
  }
}
