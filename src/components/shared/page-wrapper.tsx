"use client";

import { motion } from "framer-motion";
import React from "react";
import { pageTransition } from "@/lib/motion";

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function PageWrapper({ children, className = "" }: PageWrapperProps) {
  return (
    <motion.div
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      exit={pageTransition.exit}
      transition={pageTransition.transition}
      className={`flex-1 flex flex-col w-full min-w-0 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export default PageWrapper;
