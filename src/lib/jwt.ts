import * as jose from "jose";

function envNum(key: string, def: number) {
  const v = process.env[key];
  return v ? parseInt(v, 10) : def;
}

export async function signAccess(payload: any) {
  const secret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(envNum("JWT_ACCESS_TTL_SECONDS", 900) + "s")
    .sign(secret);
}

export async function signRefresh(payload: any) {
  const secret = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET!);
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(envNum("JWT_REFRESH_TTL_SECONDS", 1209600) + "s")
    .sign(secret);
}

export async function verifyAccess(token: string) {
  const secret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);
  return jose.jwtVerify(token, secret);
}

export async function verifyRefresh(token: string) {
  const secret = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET!);
  return jose.jwtVerify(token, secret);
}
