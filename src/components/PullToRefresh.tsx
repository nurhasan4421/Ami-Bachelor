import React, { useState, useEffect, useRef } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

const PULL_THRESHOLD = 75; // Safari-style pull distance
const MAX_PULL = 130;      // Max elastic pull

export function PullToRefresh({ onRefresh, disabled = false }: PullToRefreshProps) {
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const isPullingRef = useRef(false);

  const getScrollTop = () => {
    return Math.max(
      window.scrollY || 0,
      window.pageYOffset || 0,
      document.documentElement.scrollTop || 0,
      document.body.scrollTop || 0,
      document.scrollingElement ? document.scrollingElement.scrollTop : 0
    );
  };

  useEffect(() => {
    if (disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Must be strictly at the top of the page
      if (getScrollTop() <= 0 && !isRefreshing) {
        startYRef.current = e.touches[0].clientY;
        startXRef.current = e.touches[0].clientX;
        isPullingRef.current = true;
      } else {
        isPullingRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshing) return;

      // If user has scrolled down anywhere into the page, immediately abort pull
      if (getScrollTop() > 0) {
        isPullingRef.current = false;
        setPullY(0);
        return;
      }

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const diffY = currentY - startYRef.current;
      const diffX = currentX - startXRef.current;

      // Only engage on deliberate vertical downward pull
      if (diffY > 0 && Math.abs(diffY) > 1.8 * Math.abs(diffX)) {
        const damped = Math.min(MAX_PULL, diffY * 0.45);
        setPullY(damped);

        if (damped > 8 && e.cancelable) {
          e.preventDefault();
        }
      } else if (diffY <= 0) {
        setPullY(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPullingRef.current || isRefreshing) return;
      isPullingRef.current = false;

      // If pulled past threshold, trigger Safari-style reload!
      if (pullY >= PULL_THRESHOLD) {
        setIsRefreshing(true);
        setPullY(50); // Hold spinner in view while reloading

        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate(15); } catch {}
        }

        try {
          await onRefresh();
        } catch (err) {
          console.error("Refresh error:", err);
          setIsRefreshing(false);
          setPullY(0);
        }
      } else {
        // Did not pull far enough: snap back smoothly without reloading
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

  // Safari elastic pull effect: smoothly translate page content down with the swipe
  useEffect(() => {
    const mainContent = document.querySelector('main') as HTMLElement | null;
    if (mainContent) {
      if (pullY > 0) {
        mainContent.style.transform = `translateY(${pullY * 0.65}px)`;
        mainContent.style.transition = isRefreshing ? 'transform 0.25s ease-out' : 'none';
      } else {
        mainContent.style.transform = '';
        mainContent.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1)';
      }
    }
    return () => {
      if (mainContent) {
        mainContent.style.transform = '';
      }
    };
  }, [pullY, isRefreshing]);

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
        top: 'calc(64px + env(safe-area-inset-top, 0px) + 8px)',
        transform: `translate(-50%, ${pullY > 0 ? pullY * 0.3 : 0}px)`,
        opacity: Math.min(1, pullY / 25),
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
            const spokeOpacity = isRefreshing ? spoke.opacity : (i / 12 <= progress ? 0.9 : 0.2);
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
    </div>
  );
}
