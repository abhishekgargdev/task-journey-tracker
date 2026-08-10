"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import PageWrapper from "@/components/shared/page-wrapper";

interface AnimateWrapperProps {
  children: React.ReactNode;
}

export default function AnimateWrapper({ children }: AnimateWrapperProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <PageWrapper key={pathname} className="flex flex-col flex-1">
        {children}
      </PageWrapper>
    </AnimatePresence>
  );
}
