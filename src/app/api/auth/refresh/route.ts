import { NextRequest, NextResponse } from "next/server";
import { verifyRefresh, signAccess } from "@/src/lib/jwt";
import { prisma } from "@/src/lib/db";
import { serialize } from "cookie";

export async function POST(req: NextRequest) {
  const cookie = req.headers.get("cookie") || "";
  const refresh = cookie.split(";").map(v=>v.trim()).find(x=>x.startsWith("nova_refresh="))?.split("=")[1];
  if (!refresh) return NextResponse.json({ message: "No refresh" }, { status: 401 });
  try {
    const { payload } = await verifyRefresh(refresh);
    const rec = await prisma.refreshToken.findUnique({ where: { token: refresh } });
    if (!rec) return NextResponse.json({ message: "Invalid refresh" }, { status: 401 });
    const access = await signAccess({ sub: payload.sub, did: payload.did });
    const headers = new Headers();
    headers.append("Set-Cookie", serialize("nova_access", access, { httpOnly: true, secure: false, path: "/", sameSite: "lax" }));
    return new NextResponse(JSON.stringify({ ok: true }), { headers });
  } catch (e) {
    return NextResponse.json({ message: "Invalid refresh" }, { status: 401 });
  }
}
