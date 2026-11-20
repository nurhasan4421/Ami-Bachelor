import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ArrowDown } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

const PULL_THRESHOLD = 65; // Pixels needed to trigger reload
const MAX_PULL = 115;      // Maximum pull distance

export function PullToRefresh({ onRefresh, disabled = false }: PullToRefreshProps) {
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);

  useEffect(() => {
    if (disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      const scrollPos = window.scrollY || document.documentElement.scrollTop || 0;
      if (scrollPos <= 2 && !isRefreshing) {
        startYRef.current = e.touches[0].clientY;
        isPullingRef.current = true;
      } else {
        isPullingRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshing) return;

      const scrollPos = window.scrollY || document.documentElement.scrollTop || 0;
      if (scrollPos > 5) {
        isPullingRef.current = false;
        setPullY(0);
        return;
      }

      const currentY = e.touches[0].clientY;
      const diff = currentY - startYRef.current;

      if (diff > 0) {
        // Apple-style rubber-band resistance
        const damped = Math.min(MAX_PULL, diff * 0.42);
        setPullY(damped);
        if (damped > 6 && e.cancelable) {
          e.preventDefault();
        }
      } else {
        setPullY(0);
        isPullingRef.current = false;
      }
    };

    const handleTouchEnd = async () => {
      if (!isPullingRef.current || isRefreshing) return;
      isPullingRef.current = false;

      if (pullY >= PULL_THRESHOLD) {
        setIsRefreshing(true);
        setPullY(PULL_THRESHOLD);

        // Gentle haptic feedback on iPhone / Android if available
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate(12); } catch {}
        }

        const startTime = Date.now();
        try {
          await onRefresh();
        } catch (err) {
          console.error("Pull to refresh error:", err);
        } finally {
          // Keep spinner visible for at least 550ms for natural iOS feel
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, 550 - elapsed);
          setTimeout(() => {
            setIsRefreshing(false);
            setPullY(0);
          }, remaining);
        }
      } else {
        setPullY(0);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [disabled, isRefreshing, pullY, onRefresh]);

  if (pullY <= 0 && !isRefreshing) return null;

  const progress = Math.min(1, pullY / PULL_THRESHOLD);
  const isReady = pullY >= PULL_THRESHOLD;

  return (
    <div
      style={{
        top: 'calc(64px + env(safe-area-inset-top, 0px) + 8px)',
        transform: `translate(-50%, ${pullY > 0 ? pullY * 0.45 : 0}px)`,
      }}
      className="fixed left-1/2 z-[60] pointer-events-none transition-transform duration-75 ease-out select-none"
    >
      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-white/95 backdrop-blur-md border border-[#d6d6d6] shadow-xl text-[#141414]">
        {isRefreshing ? (
          <Loader2 size={19} className="animate-spin text-red-600" />
        ) : (
          <ArrowDown
            size={18}
            className={`transition-all duration-150 ${isReady ? 'text-red-600 scale-110' : 'text-[#626262]'}`}
            style={{
              transform: isReady ? 'rotate(180deg)' : `rotate(${progress * 180}deg)`,
            }}
          />
        )}
      </div>
    </div>
  );
}
