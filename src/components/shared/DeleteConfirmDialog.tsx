"use client";

import React, { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface DeleteConfirmItem {
  id: string;
  name: string;
  subtitle?: string;
}

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: DeleteConfirmItem | null;
  entityLabel?: string;
  description?: string;
  consequences?: string;
  confirmLabel?: string;
  onConfirm: (id: string) => Promise<void>;
}

export default function DeleteConfirmDialog({
  open,
  onOpenChange,
  item,
  entityLabel = "item",
  description,
  consequences,
  confirmLabel = "Delete Permanently",
  onConfirm,
}: DeleteConfirmDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    if (!item || deleting) return;
    try {
      setDeleting(true);
      await onConfirm(item.id);
      onOpenChange(false);
    } catch {
      // Caller handles errors (toast, error dialog, etc.)
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (deleting) return;
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-destructive/20" showCloseButton={!deleting}>
        <AnimatePresence mode="wait">
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header accent strip */}
              <div className="h-1 w-full bg-gradient-to-r from-rose-500 via-red-500 to-orange-500" />

              <div className="p-5 sm:p-6 space-y-5">
                <DialogHeader className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                    <div className="relative shrink-0">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/15 to-red-600/10 ring-1 ring-rose-500/20 shadow-sm">
                        <Trash2 className="h-6 w-6 text-rose-600" />
                      </div>
                      <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 ring-2 ring-background">
                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                      </span>
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <DialogTitle className="text-lg font-bold text-foreground leading-tight">
                        Delete {entityLabel}?
                      </DialogTitle>
                      <DialogDescription className="text-sm leading-relaxed">
                        {description ?? (
                          <>
                            You are about to permanently remove{" "}
                            <strong className="text-foreground font-semibold">{item?.name}</strong>.
                            {item?.subtitle && (
                              <span className="block text-xs text-muted-foreground mt-1">{item.subtitle}</span>
                            )}
                          </>
                        )}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                {/* Item preview card */}
                {item && (
                  <div className="rounded-xl border border-destructive/15 bg-destructive/5 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-destructive/70 mb-1">
                      Item to delete
                    </p>
                    <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                    {item.subtitle && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{item.subtitle}</p>
                    )}
                  </div>
                )}

                {consequences && (
                  <p className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2 rounded-lg bg-muted/50 border border-border/60 px-3 py-2.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>{consequences}</span>
                  </p>
                )}

                <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-1 -mx-0 -mb-0 border-t-0 bg-transparent p-0">
                  <Button
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    disabled={deleting}
                    className="w-full sm:w-auto cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleConfirm}
                    disabled={deleting || !item}
                    className={cn(
                      "w-full sm:w-auto cursor-pointer shadow-sm",
                      "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700"
                    )}
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        {confirmLabel}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
