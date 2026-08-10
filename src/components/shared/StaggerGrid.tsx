"use client";

import React from "react";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface StaggerGridProps {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "ul";
}

export default function StaggerGrid({ children, className, as = "div" }: StaggerGridProps) {
  const Component = motion[as];

  return (
    <Component
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={cn(className)}
    >
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return (
          <motion.div variants={staggerItem} className="contents min-w-0">
            {child}
          </motion.div>
        );
      })}
    </Component>
  );
}
