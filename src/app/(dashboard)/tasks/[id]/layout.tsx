import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = pageMetadata(
  "Task Detail",
  "View task details, attached user stories, and stage planning."
);

export default function TaskDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
