"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { encrypt, decrypt } from "@/lib/session";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "lead" | "engineer";
}

// Seed helper to set up initial admin and standard user accounts
export async function seedDemoUsers() {
  await dbConnect();
  
  const adminEmail = "admin@company.com";
  const userEmail = "user@company.com";

  const adminExists = await User.findOne({ email: adminEmail });
  if (!adminExists) {
    const hashedAdminPassword = await bcrypt.hash("admin123", 10);
    await User.create({
      name: "Admin User",
      email: adminEmail,
      passwordHash: hashedAdminPassword,
      role: "admin",
    });
    console.log("Seeded admin account:", adminEmail);
  }

  const userExists = await User.findOne({ email: userEmail });
  if (!userExists) {
    const hashedUserPassword = await bcrypt.hash("user123", 10);
    await User.create({
      name: "Standard User",
      email: userEmail,
      passwordHash: hashedUserPassword,
      role: "engineer",
    });
    console.log("Seeded standard user account:", userEmail);
  }
}

export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Please enter both email and password." };
  }

  try {
    await dbConnect();

    // Auto-seed if database contains no users
    const count = await User.countDocuments();
    if (count === 0) {
      await seedDemoUsers();
    }

    const user = await User.findOne({ email });
    if (!user) {
      return { error: "Invalid email or password." };
    }

    const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordsMatch) {
      return { error: "Invalid email or password." };
    }

    const sessionPayload = JSON.stringify({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    });

    const encryptedSession = encrypt(sessionPayload);

    const cookieStore = await cookies();
    cookieStore.set("session", encryptedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
      sameSite: "lax",
    });
  } catch (error: any) {
    console.error("Login action error:", error);
    return { error: "An unexpected database or server error occurred." };
  }

  redirect("/");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  redirect("/login");
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;
    if (!sessionCookie) return null;

    const decrypted = decrypt(sessionCookie);
    return JSON.parse(decrypted) as SessionUser;
  } catch (e) {
    return null;
  }
}
