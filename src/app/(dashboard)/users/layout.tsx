import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = pageMetadata(
  "Users",
  "View team members and their roles in the delivery workspace."
);

export default function UsersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
