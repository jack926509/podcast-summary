'use client';

import { useState } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import { RefreshCw, Trash2 } from 'lucide-react';

interface SwipeableRowProps {
  canRetry?: boolean;
  isRetrying?: boolean;
  onRetry?: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}

const ACTION_WIDTH = 80;

/**
 * Mobile-friendly swipe-to-reveal action row. Drag the card left to expose
 * retry/delete buttons. Clicking the card while it's open closes it instead
 * of triggering the inner link, so the user gets one-tap-to-undo behaviour.
 */
export function SwipeableRow({
  canRetry = false,
  isRetrying = false,
  onRetry,
  onDelete,
  children,
}: SwipeableRowProps) {
  const [open, setOpen] = useState(false);
  const totalWidth = canRetry ? ACTION_WIDTH * 2 : ACTION_WIDTH;

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    setOpen(info.offset.x < -40);
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    if (open) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      {/* Action buttons behind */}
      <div className="absolute inset-y-0 right-0 z-0 flex items-stretch overflow-hidden rounded-xl">
        {canRetry && onRetry && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              onRetry();
            }}
            disabled={isRetrying}
            aria-label="重新處理"
            className="flex w-20 flex-col items-center justify-center gap-1 bg-primary text-primary-foreground active:bg-primary/90 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
            <span className="text-[11px] font-medium">重試</span>
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
            onDelete();
          }}
          aria-label="刪除"
          className="flex w-20 flex-col items-center justify-center gap-1 bg-destructive text-destructive-foreground active:bg-destructive/90"
        >
          <Trash2 className="h-4 w-4" />
          <span className="text-[11px] font-medium">刪除</span>
        </button>
      </div>

      {/* Swipeable foreground */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -totalWidth, right: 0 }}
        dragElastic={0.15}
        dragMomentum={false}
        animate={{ x: open ? -totalWidth : 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        onDragEnd={handleDragEnd}
        onClickCapture={handleClickCapture}
        className="relative z-10 touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}
