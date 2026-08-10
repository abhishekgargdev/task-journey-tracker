import { Session } from "next-auth";
import { redirect } from "next/navigation";

/**
 * Enforces admin-only access at the Server Component or Page level.
 * Redirects the user to the home page if they are not authenticated or lack admin permissions.
 */
export function requireAdmin(session: Session | null) {
  if (!session || session.user?.role !== "admin") {
    redirect("/");
  }
}
