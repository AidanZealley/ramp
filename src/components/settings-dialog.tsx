import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { DEFAULT_FTP, type PowerDisplayMode } from "@/lib/workout-utils"
import { Settings } from "lucide-react"

export function SettingsDialog() {
  const settings = useQuery(api.settings.get)
  const upsertSettings = useMutation(api.settings.upsert)
  const [open, setOpen] = useState(false)
  const [ftp, setFtp] = useState(String(DEFAULT_FTP))
  const [powerDisplayMode, setPowerDisplayMode] =
    useState<PowerDisplayMode>("percentage")

  useEffect(() => {
    setFtp(String(settings?.ftp ?? DEFAULT_FTP))
    setPowerDisplayMode(settings?.powerDisplayMode ?? "percentage")
  }, [settings])

  const handleSave = async () => {
    const value = parseInt(ftp, 10)
    if (!isNaN(value) && value > 0 && value <= 2000) {
      await upsertSettings({ ftp: value, powerDisplayMode })
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <Settings className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your training profile.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Label htmlFor="ftp">Functional Threshold Power (FTP)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="ftp"
              type="number"
              min={50}
              max={2000}
              value={ftp}
              onChange={(e) => setFtp(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave()
              }}
              className="max-w-32"
            />
            <span className="text-sm text-muted-foreground">watts</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Your FTP is used to calculate power zones for interval colouring.
          </p>

          <div className="grid gap-2 pt-2">
            <Label>Power display</Label>
            <ToggleGroup
              value={[powerDisplayMode]}
              onValueChange={(values) =>
                setPowerDisplayMode(values[0] as PowerDisplayMode)
              }
            >
              <ToggleGroupItem value="absolute">Watts</ToggleGroupItem>
              <ToggleGroupItem value="percentage">% FTP</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
