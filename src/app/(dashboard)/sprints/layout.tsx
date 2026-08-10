import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = pageMetadata(
  "Sprints",
  "Manage time-boxed sprints, track hold history, and view linked user stories."
);

export default function SprintsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
