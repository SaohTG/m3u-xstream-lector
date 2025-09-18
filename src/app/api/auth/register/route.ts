import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import argon2 from "argon2";
import { signAccess, signRefresh } from "@/src/lib/jwt";
import { serialize } from "cookie";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ message: "Champs manquants" }, { status: 400 });
  const hash = await argon2.hash(password);
  try {
    const user = await prisma.user.create({ data: { email, passwordHash: hash } });
    // create device
    const device = await prisma.device.create({ data: { userId: user.id, name: "Web" } });
    const refresh = await signRefresh({ sub: user.id, did: device.id });
    const access = await signAccess({ sub: user.id, did: device.id });
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refresh,
        deviceId: device.id,
        expiresAt: new Date(Date.now() + 1000 * (parseInt(process.env.JWT_REFRESH_TTL_SECONDS || "1209600"))),
      },
    });
    const headers = new Headers();
    headers.append("Set-Cookie", serialize("nova_access", access, { httpOnly: true, secure: false, path: "/", sameSite: "lax" }));
    headers.append("Set-Cookie", serialize("nova_refresh", refresh, { httpOnly: true, secure: false, path: "/", sameSite: "lax" }));
    return new NextResponse(JSON.stringify({ ok: true }), { headers });
  } catch (e: any) {
    return NextResponse.json({ message: "Email déjà utilisé" }, { status: 409 });
  }
}
