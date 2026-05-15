import { useEffect, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { Settings } from "lucide-react"
import type { PowerDisplayMode } from "@/lib/workout-utils"
import { api } from "#convex/_generated/api"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { DEFAULT_FTP } from "@/lib/workout-utils"

export function SettingsDialog() {
  const settings = useQuery(api.settings.get)
  const upsertSettings = useMutation(api.settings.upsert)
  const [open, setOpen] = useState(false)
  const [ftp, setFtp] = useState(String(DEFAULT_FTP))
  const [riderWeightKg, setRiderWeightKg] = useState("75")
  const [bikeWeightKg, setBikeWeightKg] = useState("10")
  const [powerDisplayMode, setPowerDisplayMode] =
    useState<PowerDisplayMode>("percentage")

  useEffect(() => {
    setFtp(String(settings?.ftp ?? DEFAULT_FTP))
    setRiderWeightKg(String(settings?.riderWeightKg ?? 75))
    setBikeWeightKg(String(settings?.bikeWeightKg ?? 10))
    setPowerDisplayMode(settings?.powerDisplayMode ?? "percentage")
  }, [settings])

  const handleSave = async () => {
    const ftpValue = parseInt(ftp, 10)
    const riderWeightValue = Number(riderWeightKg)
    const bikeWeightValue = Number(bikeWeightKg)
    if (
      !isNaN(ftpValue) &&
      ftpValue > 0 &&
      ftpValue <= 2000 &&
      Number.isFinite(riderWeightValue) &&
      Number.isFinite(bikeWeightValue)
    ) {
      await upsertSettings({
        ftp: ftpValue,
        powerDisplayMode,
        riderWeightKg: riderWeightValue,
        bikeWeightKg: bikeWeightValue,
      })
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" />}>
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="rider-weight">Rider weight</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="rider-weight"
                  type="number"
                  min={30}
                  max={250}
                  step={0.1}
                  value={riderWeightKg}
                  onChange={(e) => setRiderWeightKg(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave()
                  }}
                  className="max-w-32"
                />
                <span className="text-sm text-muted-foreground">kg</span>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bike-weight">Bike weight</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="bike-weight"
                  type="number"
                  min={5}
                  max={30}
                  step={0.1}
                  value={bikeWeightKg}
                  onChange={(e) => setBikeWeightKg(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave()
                  }}
                  className="max-w-32"
                />
                <span className="text-sm text-muted-foreground">kg</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Stored for route simulation physics settings.
          </p>

          <div className="grid gap-2 pt-2">
            <Label>Power display</Label>
            <ToggleGroup
              variant="outline"
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
