import { formatDuration } from "@/lib/workout-utils";
import type { TimelineScale } from "@/hooks/use-timeline-scale";
import { EDITOR_HEIGHT } from "@/lib/timeline/types";

interface EditorGridProps {
  scale: TimelineScale;
  ftp: number;
  powerMode: "absolute" | "percentage";
}

/**
 * Renders the background grid: horizontal power lines,
 * vertical time lines, FTP reference line, and baseline.
 * All elements are absolutely positioned DOM divs/spans.
 */
export function EditorGrid({ scale, ftp, powerMode }: EditorGridProps) {
  const ftpPower = powerMode === "absolute" ? ftp : 100;
  const ftpY = scale.powerToY(ftpPower);
  const showFtpLine = ftpPower <= scale.maxPower && ftpPower > 0;

  return (
    <>
      {/* Horizontal power grid lines */}
      {scale.powerTicks.map((power) => (
        <div
          key={`grid-h-${power}`}
          className="pointer-events-none absolute left-0 right-0 border-t border-current opacity-[0.06]"
          style={{ top: scale.powerToY(power) }}
        />
      ))}

      {/* Vertical time grid lines + labels */}
      {scale.timeTicks.map((t) => {
        const x = scale.timeToX(t);
        return (
          <div key={`grid-v-${t}`}>
            <div
              className="pointer-events-none absolute top-0 border-l border-current opacity-[0.06]"
              style={{ left: x, height: EDITOR_HEIGHT }}
            />
            <span
              className="pointer-events-none absolute text-[10px] text-muted-foreground"
              style={{
                left: x,
                top: EDITOR_HEIGHT + 4,
                transform: "translateX(-50%)",
              }}
            >
              {formatDuration(t)}
            </span>
          </div>
        );
      })}

      {/* FTP reference line */}
      {showFtpLine && (
        <div
          className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-current opacity-35"
          style={{ top: ftpY }}
        />
      )}

      {/* Baseline */}
      <div
        className="pointer-events-none absolute left-0 right-0 border-t border-current opacity-[0.12]"
        style={{ top: EDITOR_HEIGHT }}
      />
    </>
  );
}
