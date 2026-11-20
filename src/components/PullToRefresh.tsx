import React, { useState, useEffect, useRef } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

const PULL_THRESHOLD = 95;  // Long swipe down distance (Safari style)
const MAX_PULL = 145;       // Max visual pull
const HOLD_REQUIRED_MS = 380; // Must hold down for 380ms past threshold before release to trigger reload

export function PullToRefresh({ onRefresh, disabled = false }: PullToRefreshProps) {
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const isPullingRef = useRef(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isReadyRef = useRef(false);

  useEffect(() => {
    if (disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      const scrollPos = window.scrollY || document.documentElement.scrollTop || 0;
      // Strictly only when page is scrolled completely to the top
      if (scrollPos <= 0 && !isRefreshing) {
        startYRef.current = e.touches[0].clientY;
        startXRef.current = e.touches[0].clientX;
        isPullingRef.current = true;
        isReadyRef.current = false;
        setIsReady(false);
      } else {
        isPullingRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshing) return;

      const scrollPos = window.scrollY || document.documentElement.scrollTop || 0;
      if (scrollPos > 0) {
        // User scrolled down into page, cancel pull gesture
        isPullingRef.current = false;
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
        }
        isReadyRef.current = false;
        setIsReady(false);
        setPullY(0);
        return;
      }

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const diffY = currentY - startYRef.current;
      const diffX = currentX - startXRef.current;

      // Ensure gesture is predominantly downward vertical, not horizontal
      if (diffY > 0 && Math.abs(diffY) > 1.8 * Math.abs(diffX)) {
        const damped = Math.min(MAX_PULL, diffY * 0.42);
        setPullY(damped);

        if (damped > 10 && e.cancelable) {
          e.preventDefault();
        }

        // Check if pulled past threshold
        if (damped >= PULL_THRESHOLD) {
          if (!holdTimerRef.current && !isReadyRef.current) {
            // User must HOLD DOWN for HOLD_REQUIRED_MS past threshold to arm reload
            holdTimerRef.current = setTimeout(() => {
              isReadyRef.current = true;
              setIsReady(true);
              if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                try { navigator.vibrate(18); } catch {}
              }
            }, HOLD_REQUIRED_MS);
          }
        } else {
          // If user moves back up before threshold, cancel hold timer
          if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
          }
          isReadyRef.current = false;
          setIsReady(false);
        }
      } else if (diffY <= 0) {
        setPullY(0);
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
        }
        isReadyRef.current = false;
        setIsReady(false);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPullingRef.current || isRefreshing) return;
      isPullingRef.current = false;

      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }

      // ONLY reload if user pulled down past threshold AND held down until isReady was armed!
      if (isReadyRef.current && pullY >= PULL_THRESHOLD) {
        setIsRefreshing(true);
        setPullY(PULL_THRESHOLD);

        const startTime = Date.now();
        try {
          await onRefresh();
        } catch (err) {
          console.error("Refresh error:", err);
        } finally {
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, 650 - elapsed);
          setTimeout(() => {
            setIsRefreshing(false);
            isReadyRef.current = false;
            setIsReady(false);
            setPullY(0);
          }, remaining);
        }
      } else {
        // Fast swipe or released without holding: immediately snap back without reloading!
        isReadyRef.current = false;
        setIsReady(false);
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
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, [disabled, isRefreshing, pullY, onRefresh]);

  if (pullY <= 0 && !isRefreshing) return null;

  const progress = Math.min(1, pullY / PULL_THRESHOLD);
  const rotationAngle = isRefreshing ? undefined : Math.floor(progress * 360);

  // 12 spokes for authentic Apple iOS Activity Indicator
  const spokes = [
    { opacity: 0.15 },
    { opacity: 0.22 },
    { opacity: 0.30 },
    { opacity: 0.38 },
    { opacity: 0.46 },
    { opacity: 0.54 },
    { opacity: 0.62 },
    { opacity: 0.70 },
    { opacity: 0.78 },
    { opacity: 0.85 },
    { opacity: 0.92 },
    { opacity: 1.00 },
  ];

  return (
    <div
      style={{
        top: 'calc(64px + env(safe-area-inset-top, 0px) + 10px)',
        transform: `translate(-50%, ${pullY > 0 ? pullY * 0.4 : 0}px)`,
        opacity: Math.min(1, pullY / 35),
      }}
      className="fixed left-1/2 z-[60] pointer-events-none transition-transform duration-75 ease-out select-none flex flex-col items-center justify-center gap-1.5"
    >
      {/* Authentic Safari iOS Activity Wheel */}
      <div className={`flex items-center justify-center p-2 rounded-full transition-transform duration-150 ${isReady ? 'scale-110' : ''}`}>
        <svg
          className={`w-7 h-7 text-[#555] ${isRefreshing || isReady ? 'animate-spin' : ''}`}
          style={!isRefreshing && !isReady && rotationAngle !== undefined ? { transform: `rotate(${rotationAngle}deg)` } : undefined}
          viewBox="0 0 24 24"
        >
          {spokes.map((spoke, i) => {
            const angle = i * 30;
            const spokeOpacity = isRefreshing || isReady ? spoke.opacity : (i / 12 <= progress ? 0.9 : 0.2);
            return (
              <line
                key={i}
                x1="12"
                y1="3"
                x2="12"
                y2="6.5"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                opacity={spokeOpacity}
                transform={`rotate(${angle} 12 12)`}
              />
            );
          })}
        </svg>
      </div>

      {/* Subtle indicator hint while pulling */}
      {!isRefreshing && pullY >= PULL_THRESHOLD && (
        <span className={`text-[10px] font-sf-medium tracking-tight px-2 py-0.5 rounded-full transition-all duration-150 ${
          isReady ? 'bg-red-50 text-red-600 font-sf-bold' : 'bg-black/5 text-[#8e8e8e]'
        }`}>
          {isReady ? 'Release to reload' : 'Hold to reload...'}
        </span>
      )}
    </div>
  );
}
