"use client";

/**
 * SwipeDeleteRow — mobile swipe-to-delete wrapper for a list item.
 *
 * Drag the row left past the 50px threshold to commit; dragging less than
 * that snaps back. Desktop/non-touch users see normal content and can use
 * the trash icon in the row. A red background reveals behind the content
 * so the user sees the delete affordance as they drag.
 */

import { motion, useAnimation, type PanInfo } from "framer-motion";
import { useState } from "react";
import { Trash2 } from "lucide-react";

interface SwipeDeleteRowProps {
  children: React.ReactNode;
  /** Called once the row is dragged past the threshold and confirmed. */
  onDelete: () => void;
  /** Threshold in px. Default 50. */
  threshold?: number;
}

export function SwipeDeleteRow({
  children,
  onDelete,
  threshold = 50,
}: SwipeDeleteRowProps) {
  const controls = useAnimation();
  const [confirming, setConfirming] = useState(false);

  function handleDragEnd(
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) {
    if (info.offset.x < -threshold) {
      // Past threshold: pop up confirm sheet. Keep the row visibly offset
      // so the user sees what they are about to delete.
      controls.start({ x: -80 });
      setConfirming(true);
    } else {
      controls.start({ x: 0 });
    }
  }

  function cancelDelete() {
    controls.start({ x: 0 });
    setConfirming(false);
  }

  function commitDelete() {
    setConfirming(false);
    onDelete();
  }

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-destructive text-destructive-foreground">
        <Trash2 className="h-5 w-5" />
      </div>
      <motion.div
        drag="x"
        dragConstraints={{ left: -80, right: 0 }}
        dragElastic={0.1}
        dragDirectionLock
        onDragEnd={handleDragEnd}
        animate={controls}
        className="relative bg-card"
      >
        {children}
      </motion.div>
      {confirming ? (
        <div
          role="alertdialog"
          aria-label="Confirm delete set"
          className="absolute inset-x-2 bottom-2 z-10 flex items-center justify-between gap-3 rounded-md border bg-background p-2 shadow-md"
        >
          <span className="text-sm font-medium">Delete set?</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelDelete}
              className="h-8 rounded-md border border-input bg-transparent px-3 text-xs font-medium transition-colors hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={commitDelete}
              className="h-8 rounded-md bg-destructive px-3 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
            >
              Delete
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
