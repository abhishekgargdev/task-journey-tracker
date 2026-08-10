import type { Metadata } from "next";

export const SITE_NAME = "Task Journey Tracker";
export const SITE_DESCRIPTION =
  "Enterprise delivery journey and user story tracker for engineering teams.";

export function pageMetadata(title: string, description?: string): Metadata {
  return {
    title,
    description: description ?? SITE_DESCRIPTION,
  };
}
