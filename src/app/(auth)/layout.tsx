import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = pageMetadata(
  "Sign In",
  "Sign in to Task Journey Tracker to manage delivery journeys and user stories."
);

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
