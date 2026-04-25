import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { clamp } from "@/lib/workout-utils";
import {
  DEFAULT_PIXELS_PER_SECOND,
  MAX_PIXELS_PER_SECOND,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
} from "@/lib/timeline/types";

const ZOOM_WHEEL_SENSITIVITY = 0.01;

interface UseTimelineZoomConfig {
  totalDurationSec: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  edgeGutterPx: number;
}

export interface TimelineZoom {
  pixelsPerSecond: number;
  zoomLevel: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  /** Zoom in, keeping `contentFocalX` (content-space px) fixed in the viewport. */
  zoomIn: (contentFocalX?: number) => void;
  /** Zoom out, keeping `contentFocalX` (content-space px) fixed in the viewport. */
  zoomOut: (contentFocalX?: number) => void;
  resetZoom: () => void;
}

/**
 * Manages zoom state for the timeline editor.
 *
 * At zoom level 1 (default), the workout fits the container width.
 * Zooming in increases pixelsPerSecond, causing horizontal scroll.
 *
 * Pinch / Ctrl+wheel zooms anchor on the cursor position.
 * Button zooms accept an explicit content-space focal point so the
 * caller can anchor on the selection centre or viewport centre.
 */
export function useTimelineZoom({
  totalDurationSec,
  containerRef,
  edgeGutterPx,
}: UseTimelineZoomConfig): TimelineZoom {
  const [zoomLevel, setZoomLevel] = useState(MIN_ZOOM);
  const [containerWidth, setContainerWidth] = useState(0);

  // Refs so wheel/pinch handler always sees the latest values without
  // being recreated on every render (avoids re-attaching the listener).
  const zoomLevelRef = useRef(zoomLevel);
  // Scroll position to apply after the next layout paint. We store this
  // imperatively so rapid wheel events accumulate correctly even before
  // React has re-rendered.
  const pendingScrollRef = useRef<number | null>(null);

  // Keep zoomLevelRef in sync with committed state.
  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);

  // Measure container width with ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  // Compute the fit-to-width base scale
  const fitPixelsPerSecond = useMemo(() => {
    if (containerWidth <= 0) return DEFAULT_PIXELS_PER_SECOND;
    const safeDuration = Math.max(totalDurationSec, 30);
    const usableWidth = Math.max(containerWidth - edgeGutterPx * 2, 1);
    return Math.min(usableWidth / safeDuration, MAX_PIXELS_PER_SECOND);
  }, [containerWidth, totalDurationSec, edgeGutterPx]);

  const pixelsPerSecond = fitPixelsPerSecond * zoomLevel;

  // Apply any pending scroll adjustment synchronously after the DOM has
  // updated (content width already reflects the new zoom level). Running
  // without a dep array ensures we catch every render; the null-check
  // makes it a no-op unless a zoom just happened.
  useLayoutEffect(() => {
    if (pendingScrollRef.current !== null && containerRef.current) {
      containerRef.current.scrollLeft = pendingScrollRef.current;
      pendingScrollRef.current = null;
    }
  });

  /**
   * Core zoom function. Computes the new scroll position so that
   * `contentFocalX` (a pixel position in content space) stays at the
   * same viewport-relative offset after the zoom.
   *
   * Formula derivation:
   *   viewportOffset = contentFocalX - scrollLeft_old
   *   newScrollLeft  = contentFocalX * (newLevel / oldLevel) - viewportOffset
   *                  = contentFocalX * (newLevel / oldLevel - 1) + scrollLeft_old
   */
  const zoomAroundContentX = useCallback(
    (newLevel: number, contentFocalX?: number) => {
      const el = containerRef.current;
      const clamped = clamp(newLevel, MIN_ZOOM, MAX_ZOOM);

      if (el && contentFocalX !== undefined) {
        const oldLevel = zoomLevelRef.current;
        // Use the already-pending scroll position if the DOM hasn't caught
        // up yet (rapid pinch events arrive faster than React re-renders).
        const currentScrollLeft =
          pendingScrollRef.current ?? el.scrollLeft;
        const viewportOffset = contentFocalX - currentScrollLeft;
        const newScrollLeft =
          contentFocalX * (clamped / oldLevel) - viewportOffset;
        pendingScrollRef.current = Math.max(0, newScrollLeft);
      }

      // Update ref immediately so the next rapid event sees the new level.
      zoomLevelRef.current = clamped;
      setZoomLevel(clamped);
    },
    [containerRef]
  );

  const zoomIn = useCallback(
    (contentFocalX?: number) => {
      zoomAroundContentX(zoomLevelRef.current + ZOOM_STEP, contentFocalX);
    },
    [zoomAroundContentX]
  );

  const zoomOut = useCallback(
    (contentFocalX?: number) => {
      zoomAroundContentX(zoomLevelRef.current - ZOOM_STEP, contentFocalX);
    },
    [zoomAroundContentX]
  );

  const resetZoom = useCallback(() => {
    pendingScrollRef.current = 0;
    zoomLevelRef.current = MIN_ZOOM;
    setZoomLevel(MIN_ZOOM);
  }, []);

  // Ctrl+wheel (and trackpad pinch) zoom handler — anchors on cursor position.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const delta = -e.deltaY * ZOOM_WHEEL_SENSITIVITY;
      const rect = el.getBoundingClientRect();
      const cursorViewportX = e.clientX - rect.left;
      // Use pending scroll if DOM hasn't updated yet (rapid events).
      const scrollLeft = pendingScrollRef.current ?? el.scrollLeft;
      const contentFocalX = scrollLeft + cursorViewportX;

      zoomAroundContentX(zoomLevelRef.current + delta, contentFocalX);
    };

    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [containerRef, zoomAroundContentX]);

  return {
    pixelsPerSecond,
    zoomLevel,
    canZoomIn: zoomLevel < MAX_ZOOM,
    canZoomOut: zoomLevel > MIN_ZOOM,
    zoomIn,
    zoomOut,
    resetZoom,
  };
}
