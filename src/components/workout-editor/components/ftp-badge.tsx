import type { TimelineScale } from "@/hooks/use-timeline-scale"
import { Badge } from "@/components/ui/badge"

interface FtpBadgeProps {
  scale: TimelineScale
  ftp: number
  maxPower: number
}

export function FtpBadge({ scale, ftp, maxPower }: FtpBadgeProps) {
  const ftpPower = 100
  const showFtpLine = ftpPower <= maxPower

  if (!showFtpLine) {
    return null
  }

  return (
    <Badge
      variant="outline"
      className="absolute right-2"
      style={{ top: scale.powerToY(ftpPower) - 24 }}
    >
      {`FTP ${ftp}W`}
    </Badge>
  )
}
