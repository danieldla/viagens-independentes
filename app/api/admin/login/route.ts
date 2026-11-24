import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken } from "@/lib/auth";

export async function POST(req: Request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !process.env.ADMIN_SESSION_SECRET) {
    return NextResponse.json({ error: "Admin não configurado." }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const sha = (s: string) => crypto.createHash("sha256").update(s).digest();
  const ok = crypto.timingSafeEqual(sha(String(body.password ?? "")), sha(expected));

  if (!ok) {
    await new Promise((r) => setTimeout(r, 800)); // abranda tentativas por força bruta
    return NextResponse.json({ error: "Password incorreta." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
