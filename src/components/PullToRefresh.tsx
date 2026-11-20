import React, { useState, useEffect, useRef } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

const PULL_THRESHOLD = 90; // Long swipe down threshold like Safari
const MAX_PULL = 140;      // Maximum drag distance

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
        // iOS rubber-band resistance physics
        const damped = Math.min(MAX_PULL, diff * 0.44);
        setPullY(damped);
        if (damped > 8 && e.cancelable) {
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

        // Apple gentle haptic feedback
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate(15); } catch {}
        }

        const startTime = Date.now();
        try {
          await onRefresh();
        } catch (err) {
          console.error("Safari refresh error:", err);
        } finally {
          // Keep wheel spinning for at least 650ms for natural iOS feel
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, 650 - elapsed);
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
        opacity: Math.min(1, pullY / 30),
      }}
      className="fixed left-1/2 z-[60] pointer-events-none transition-transform duration-75 ease-out select-none flex items-center justify-center"
    >
      {/* Authentic Safari iOS Activity Wheel */}
      <div className="flex items-center justify-center p-2 rounded-full">
        <svg
          className={`w-7 h-7 text-[#555] ${isRefreshing ? 'animate-spin' : ''}`}
          style={!isRefreshing && rotationAngle !== undefined ? { transform: `rotate(${rotationAngle}deg)` } : undefined}
          viewBox="0 0 24 24"
        >
          {spokes.map((spoke, i) => {
            const angle = i * 30;
            // When pulling down, spokes light up progressively
            const spokeProgress = isRefreshing ? spoke.opacity : (i / 12 <= progress ? 0.9 : 0.2);
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
                opacity={spokeProgress}
                transform={`rotate(${angle} 12 12)`}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
