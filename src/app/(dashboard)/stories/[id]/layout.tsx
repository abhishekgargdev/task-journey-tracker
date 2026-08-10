import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = pageMetadata(
  "Story Journey",
  "Track user story progress through the delivery pipeline ladder."
);

export default function StoryDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
