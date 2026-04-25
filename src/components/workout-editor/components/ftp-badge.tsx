import type { TimelineScale } from "@/hooks/use-timeline-scale"
import { Badge } from "@/components/ui/badge"

interface FtpBadgeProps {
  scale: TimelineScale
  ftp: number
  powerMode: "absolute" | "percentage"
  maxPower: number
}

export function FtpBadge({
  scale,
  ftp,
  powerMode,
  maxPower,
}: FtpBadgeProps) {
  const ftpPower = powerMode === "absolute" ? ftp : 100
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
      FTP
    </Badge>
  )
}
