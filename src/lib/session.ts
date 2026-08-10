import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
}

const SECRET_KEY = process.env.SESSION_SECRET || "default-session-secret-key-at-least-32-chars-long";
const encodedKey = new TextEncoder().encode(SECRET_KEY);

/**
 * Creates and signs a new JWT session token.
 */
export async function createSession(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

/**
 * Verifies a JWT session token and returns the decrypted payload.
 */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Server-only helper to read and verify the session cookie.
 */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("tjt_session")?.value;
    if (!token) return null;
    return await verifySession(token);
  } catch (error) {
    return null;
  }
}
