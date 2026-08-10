"use client";

import React from "react";
import { motion } from "framer-motion";
import { cardHover } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function AnimatedCard({ children, className }: AnimatedCardProps) {
  return (
    <motion.div {...cardHover} className={cn(className)}>
      {children}
    </motion.div>
  );
}
