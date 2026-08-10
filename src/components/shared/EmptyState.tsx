"use client";

import React from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { fadeIn } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      {...fadeIn}
      className={cn(
        "rounded-xl border border-dashed border-border bg-card p-8 sm:p-12 text-center max-w-lg mx-auto space-y-4",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Icon className="h-10 w-10 text-muted-foreground mx-auto" aria-hidden="true" />
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground leading-normal">{description}</p>
      {action && <div className="pt-1">{action}</div>}
    </motion.div>
  );
}
