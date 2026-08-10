import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = pageMetadata(
  "Stage Catalog",
  "Configure delivery stages, define pipeline sequencing, and control active catalog items."
);

export default function StagesSettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
