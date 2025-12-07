import { useState, useRef, useCallback, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useHaptics } from '@/hooks/useHaptics';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  pullThreshold?: number;
}

/**
 * Component that adds pull-to-refresh functionality to any content.
 * Detects touch gestures and triggers a refresh callback when pulled down.
 */
export const PullToRefresh = ({
  onRefresh,
  children,
  pullThreshold = 80,
}: PullToRefreshProps) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canPull, setCanPull] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { lightImpact } = useHaptics();

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only allow pull-to-refresh when scrolled to the top
    const container = containerRef.current;
    if (!container || isRefreshing) return;

    // Check if we're at the top of the page
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    if (scrollTop === 0) {
      setCanPull(true);
      startY.current = e.touches[0].clientY;
      currentY.current = e.touches[0].clientY;
    }
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!canPull || isRefreshing) return;

    currentY.current = e.touches[0].clientY;
    const distance = currentY.current - startY.current;

    if (distance > 0) {
      // Apply resistance effect
      const resistance = 0.5;
      const adjustedDistance = distance * resistance;
      setPullDistance(Math.min(adjustedDistance, pullThreshold * 1.5));

      // Trigger haptic feedback at threshold
      if (adjustedDistance >= pullThreshold && pullDistance < pullThreshold) {
        lightImpact();
      }
    }
  }, [canPull, isRefreshing, pullDistance, pullThreshold, lightImpact]);

  const handleTouchEnd = useCallback(async () => {
    if (!canPull || isRefreshing) {
      setCanPull(false);
      setPullDistance(0);
      return;
    }

    setCanPull(false);

    if (pullDistance >= pullThreshold) {
      setIsRefreshing(true);
      lightImpact();

      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh error:', error);
      } finally {
        // Delay reset for smooth animation
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 300);
      }
    } else {
      setPullDistance(0);
    }
  }, [canPull, isRefreshing, pullDistance, pullThreshold, onRefresh, lightImpact]);

  const pullProgress = Math.min(pullDistance / pullThreshold, 1);
  const showIndicator = pullDistance > 0 || isRefreshing;

  return (
    <div
      ref={containerRef}
      className="relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200"
        style={{
          height: showIndicator ? '60px' : '0px',
          opacity: showIndicator ? 1 : 0,
          transform: `translateY(${showIndicator ? '0' : '-20px'})`,
        }}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2
            className="w-5 h-5"
            style={{
              transform: isRefreshing ? 'none' : `rotate(${pullProgress * 360}deg)`,
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
            }}
          />
          <span className="text-sm font-medium">
            {isRefreshing
              ? 'Actualisation...'
              : pullProgress >= 1
              ? 'Relâchez pour actualiser'
              : 'Tirez pour actualiser'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${pullDistance > 0 ? pullDistance : 0}px)`,
          transition: canPull ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
};
