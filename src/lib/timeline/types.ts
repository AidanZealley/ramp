import type { Interval } from "@/lib/workout-utils";

// --- Drag types for the custom resize/power interaction system ---
// "move" is handled by dnd-kit, not by the custom drag system
export type DragType =
  | "power-uniform"
  | "power-start"
  | "power-end"
  | "duration"
  | "duration-left";

// --- Editor constants ---
export const EDITOR_HEIGHT = 280;
export const AXIS_HEIGHT = 28;
export const DEFAULT_PIXELS_PER_SECOND = 2; // fallback before container is measured
export const TIMELINE_EDGE_GUTTER = 16;

// Zoom constants
export const MAX_PIXELS_PER_SECOND = 10; // upper cap for fit-to-width
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 10;
export const ZOOM_STEP = 0.25;

// Power constraints
export const MIN_POWER = 0;

// Duration constraints
export const MIN_DURATION = 30; // seconds
export const DURATION_SNAP = 30; // seconds

// Handle sizes (in pixels)
export const HANDLE_SIZE = 10; // diameter of visible corner handles
export const CORNER_HIT_RADIUS = 12; // radius of invisible corner hit area
export const EDGE_HIT_WIDTH = 12; // thickness of invisible edge hit area

// Drag threshold (prevents accidental reorder on click)
export const MOVE_DRAG_THRESHOLD = 5; // px

// --- Derived computation helpers ---

/**
 * Compute the start time (in seconds) of an interval at a given index.
 * This is always derived from the array, never stored.
 */
export function getIntervalStartTime(
  index: number,
  intervals: Interval[]
): number {
  return intervals
    .slice(0, index)
    .reduce((sum, iv) => sum + iv.durationSeconds, 0);
}
