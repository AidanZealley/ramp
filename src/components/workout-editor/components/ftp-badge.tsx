import type { TimelineScale } from "@/hooks/use-timeline-scale"
import { Badge } from "@/components/ui/badge"
import { type PowerDisplayMode } from "@/lib/workout-utils"

interface FtpBadgeProps {
  scale: TimelineScale
  ftp: number
  displayMode: PowerDisplayMode
  maxPower: number
}

export function FtpBadge({ scale, ftp, displayMode, maxPower }: FtpBadgeProps) {
  const ftpPower = 100
  const showFtpLine = ftpPower <= maxPower && ftpPower > 0

  if (!showFtpLine) {
    return null
  }

  return (
    <Badge
      variant="outline"
      className="absolute right-2"
      style={{ top: scale.powerToY(ftpPower) - 24 }}
    >
      {displayMode === "absolute" ? `${ftp}W FTP` : "100% FTP"}
    </Badge>
  )
}
