import { useState, useMemo, useCallback, useEffect } from "react";
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
}

export interface TimelineZoom {
  pixelsPerSecond: number;
  zoomLevel: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
}

/**
 * Manages zoom state for the timeline editor.
 *
 * At zoom level 1 (default), the workout fits the container width.
 * Zooming in increases pixelsPerSecond, causing horizontal scroll.
 *
 * Also attaches a Ctrl+wheel handler to the container for
 * scroll-to-zoom (and trackpad pinch-to-zoom).
 */
export function useTimelineZoom({
  totalDurationSec,
  containerRef,
}: UseTimelineZoomConfig): TimelineZoom {
  const [zoomLevel, setZoomLevel] = useState(MIN_ZOOM);
  const [containerWidth, setContainerWidth] = useState(0);

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
    return Math.min(containerWidth / safeDuration, MAX_PIXELS_PER_SECOND);
  }, [containerWidth, totalDurationSec]);

  const pixelsPerSecond = fitPixelsPerSecond * zoomLevel;

  // Zoom callbacks
  const zoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  }, []);

  const resetZoom = useCallback(() => {
    setZoomLevel(MIN_ZOOM);
  }, []);

  // Ctrl+wheel (and trackpad pinch) zoom handler
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = -e.deltaY * ZOOM_WHEEL_SENSITIVITY;
      setZoomLevel((prev) => clamp(prev + delta, MIN_ZOOM, MAX_ZOOM));
    };

    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [containerRef]);

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
