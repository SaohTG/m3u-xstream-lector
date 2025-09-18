import { NextRequest } from "next/server";
import { verifyAccess } from "@/src/lib/jwt";
import { prisma } from "@/src/lib/db";
import { decrypt } from "@/src/lib/crypto";

export async function getUserIdFromAccess(req: NextRequest) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const token = cookie.split(";").map(v=>v.trim()).find(x=>x.startsWith("nova_access="))?.split("=")[1];
    if (!token) return null;
    const { payload } = await verifyAccess(token);
    return payload.sub as string;
  } catch {
    return null;
  }
}

export async function getXtreamCreds(userId: string) {
  const link = await prisma.xtreamLink.findUnique({ where: { userId } });
  if (!link) return null;
  return {
    host: decrypt(link.hostEnc),
    port: decrypt(link.portEnc),
    username: decrypt(link.usernameEnc),
    password: decrypt(link.passwordEnc),
  };
}

export function buildXtreamBase({host, port}:{host:string, port:string}) {
  const proto = host.startsWith("http") ? "" : "http://";
  const h = host.replace(/\/$/, "");
  return `${proto}${h}:${port}`;
}
