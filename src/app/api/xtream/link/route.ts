import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { encrypt } from "@/src/lib/crypto";
import { getUserIdFromAccess } from "../../xtream/util";

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromAccess(req);
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { host, port, username, password } = await req.json();
  if (!host || !username || !password) return NextResponse.json({ message: "Informations incomplètes" }, { status: 400 });

  const data = {
    hostEnc: encrypt(host.trim()),
    portEnc: encrypt((port || "80").trim()),
    usernameEnc: encrypt(username.trim()),
    passwordEnc: encrypt(password.trim()),
  };

  const existing = await prisma.xtreamLink.findUnique({ where: { userId } });
  if (existing) {
    await prisma.xtreamLink.update({ where: { userId }, data });
  } else {
    await prisma.xtreamLink.create({ data: { ...data, userId } });
  }

  // Optional: do a quick connectivity probe (skipped in build-time)
  return NextResponse.json({ ok: true });
}
