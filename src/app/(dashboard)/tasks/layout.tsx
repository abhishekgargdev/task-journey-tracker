import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = pageMetadata(
  "Tasks",
  "Monitor, assign, and organize engineering tasks and map related user stories."
);

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
