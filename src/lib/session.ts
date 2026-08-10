import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const SECRET = process.env.NEXTAUTH_SECRET || "default-secret-key-at-least-32-chars-long";
const KEY = crypto.createHash("sha256").update(SECRET).digest();

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${encrypted}:${authTag}`;
}

export function decrypt(hash: string): string {
  const parts = hash.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid session token format");
  }
  const [ivHex, encryptedHex, authTagHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
