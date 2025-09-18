import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

function getKey() {
  const b64 = process.env.NOVA_CRYPT_KEY_BASE64;
  if (!b64) throw new Error("NOVA_CRYPT_KEY_BASE64 missing");
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) throw new Error("NOVA_CRYPT_KEY_BASE64 must be 32 bytes base64");
  return key;
}

export function encrypt(text: string) {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decrypt(payload: string) {
  const key = getKey();
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0,12);
  const tag = buf.subarray(12,28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString("utf8");
}
