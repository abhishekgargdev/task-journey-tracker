"use server";

import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
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
    });
    console.log("Seeded standard user account:", userEmail);
  }
}
