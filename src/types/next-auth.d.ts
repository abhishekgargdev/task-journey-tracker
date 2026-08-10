import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "lead" | "engineer";
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role?: "admin" | "lead" | "engineer";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "admin" | "lead" | "engineer";
  }
}
