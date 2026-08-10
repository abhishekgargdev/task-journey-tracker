import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = pageMetadata(
  "Stories",
  "Browse and filter user stories across tasks, sprints, and pipeline stages."
);

export default function StoriesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
