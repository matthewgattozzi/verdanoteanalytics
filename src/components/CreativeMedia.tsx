import { useState, useEffect, useRef } from "react";
import { useCachedMedia, preloadMedia } from "@/hooks/useCachedMedia";
import { Play, ImageIcon } from "lucide-react";

interface CreativeMediaProps {
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  name: string;
  isVideo: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

// Progressive image loading with blur-up effect
export function CreativeThumbnail({
  thumbnailUrl,
  videoUrl,
  name,
  isVideo,
  onLoad,
  onError,
}: CreativeMediaProps) {
  const { url, isLoading, error } = useCachedMedia(thumbnailUrl, {
    placeholderUrl: "/placeholder-creative.png",
  });

  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" } // Start loading 200px before visible
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setHasLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    onError?.();
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-muted rounded-md overflow-hidden group"
    >
      {/* Skeleton loader */}
      {(isLoading || !isVisible) && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
          <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
        </div>
      )}

      {/* Actual image */}
      {isVisible && (
        <>
          <img
            src={url}
            alt={name}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              hasLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={handleLoad}
            onError={handleError}
            loading="lazy"
          />

          {/* Video indicator */}
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                <Play className="w-6 h-6 text-black fill-black ml-0.5" />
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <span className="text-xs text-muted-foreground">Failed to load</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Virtualized grid for large creative lists
interface VirtualizedCreativeGridProps {
  creatives: any[];
  renderItem: (creative: any, index: number) => React.ReactNode;
  itemHeight: number;
  overscan?: number;
}

export function VirtualizedCreativeGrid({
  creatives,
  renderItem,
  itemHeight,
  overscan = 5,
}: VirtualizedCreativeGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;

      const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
      const end = Math.min(
        creatives.length,
        Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
      );

      setVisibleRange({ start, end });
    };

    container.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial calculation

    return () => container.removeEventListener("scroll", handleScroll);
  }, [creatives.length, itemHeight, overscan]);

  // Preload visible items' media
  useEffect(() => {
    const visibleCreatives = creatives.slice(visibleRange.start, visibleRange.end);
    const mediaUrls = visibleCreatives
      .map((c) => c.thumbnail_url || c.thumbnailUrl)
      .filter(Boolean);
    preloadMedia(mediaUrls);
  }, [visibleRange, creatives]);

  const totalHeight = creatives.length * itemHeight;
  const visibleItems = creatives.slice(visibleRange.start, visibleRange.end);

  return (
    <div
      ref={containerRef}
      className="overflow-auto h-full"
      style={{ contain: "strict" }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {visibleItems.map((creative, index) => (
          <div
            key={creative.id || index}
            style={{
              position: "absolute",
              top: (visibleRange.start + index) * itemHeight,
              height: itemHeight,
              left: 0,
              right: 0,
            }}
          >
            {renderItem(creative, visibleRange.start + index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Batch media loader for creative lists
export function useBatchMediaLoader(creatives: any[], batchSize = 10) {
  const [loadedCount, setLoadedCount] = useState(0);

  useEffect(() => {
    if (!creatives.length) return;

    const loadBatch = async (startIndex: number) => {
      const batch = creatives.slice(startIndex, startIndex + batchSize);
      const mediaUrls = batch
        .map((c) => c.thumbnail_url || c.thumbnailUrl)
        .filter(Boolean);

      // Preload this batch
      preloadMedia(mediaUrls);

      // Schedule next batch
      if (startIndex + batchSize < creatives.length) {
        setTimeout(() => {
          setLoadedCount((prev) => Math.min(prev + batchSize, creatives.length));
          loadBatch(startIndex + batchSize);
        }, 100); // Small delay between batches
      }
    };

    // Start loading first batch immediately
    loadBatch(0);
  }, [creatives, batchSize]);

  return { loadedCount, totalCount: creatives.length };
}
