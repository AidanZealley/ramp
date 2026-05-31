import { useEffect, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import type { PowerDisplayMode } from "@/lib/workout-utils"
import { api } from "#convex/_generated/api"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { DEFAULT_FTP } from "@/lib/workout-utils"
import {
  displayWeightToKg,
  kgToDisplayWeight,
  type UnitSystem,
} from "@/lib/units"

type UserPreferencesFormProps = {
  onSave?: () => void
}

export const UserPreferencesForm = ({ onSave }: UserPreferencesFormProps) => {
  const preferences = useQuery(api.preferences.get)
  const updatePreferences = useMutation(api.preferences.update)
  const [ftp, setFtp] = useState(String(DEFAULT_FTP))
  const [riderWeight, setRiderWeight] = useState("75")
  const [bikeWeight, setBikeWeight] = useState("10")
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric")
  const [powerDisplayMode, setPowerDisplayMode] =
    useState<PowerDisplayMode>("percentage")

  useEffect(() => {
    const nextUnitSystem = preferences?.unitSystem ?? "metric"
    setFtp(String(preferences?.ftp ?? DEFAULT_FTP))
    setRiderWeight(
      kgToDisplayWeight(
        preferences?.riderWeightKg ?? 75,
        nextUnitSystem
      ).value.toFixed(1)
    )
    setBikeWeight(
      kgToDisplayWeight(
        preferences?.bikeWeightKg ?? 10,
        nextUnitSystem
      ).value.toFixed(1)
    )
    setUnitSystem(nextUnitSystem)
    setPowerDisplayMode(preferences?.powerDisplayMode ?? "percentage")
  }, [preferences])

  const convertWeightInput = (
    value: string,
    fromUnitSystem: UnitSystem,
    toUnitSystem: UnitSystem
  ) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return value
    const kg = displayWeightToKg(parsed, fromUnitSystem)
    return kgToDisplayWeight(kg, toUnitSystem).value.toFixed(1)
  }

  const handleUnitSystemChange = (nextUnitSystem: UnitSystem | undefined) => {
    if (!nextUnitSystem || nextUnitSystem === unitSystem) return
    setRiderWeight((value) =>
      convertWeightInput(value, unitSystem, nextUnitSystem)
    )
    setBikeWeight((value) =>
      convertWeightInput(value, unitSystem, nextUnitSystem)
    )
    setUnitSystem(nextUnitSystem)
  }

  const handleSave = async () => {
    const ftpValue = parseInt(ftp, 10)
    const riderWeightValue = displayWeightToKg(Number(riderWeight), unitSystem)
    const bikeWeightValue = displayWeightToKg(Number(bikeWeight), unitSystem)
    if (
      !isNaN(ftpValue) &&
      ftpValue > 0 &&
      ftpValue <= 2000 &&
      Number.isFinite(riderWeightValue) &&
      Number.isFinite(bikeWeightValue)
    ) {
      await updatePreferences({
        ftp: ftpValue,
        powerDisplayMode,
        riderWeightKg: riderWeightValue,
        bikeWeightKg: bikeWeightValue,
        unitSystem,
      })
      onSave?.()
    }
  }

  return (
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
              value={riderWeight}
              onChange={(e) => setRiderWeight(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave()
              }}
              className="max-w-32"
            />
            <span className="text-sm text-muted-foreground">
              {unitSystem === "imperial" ? "lb" : "kg"}
            </span>
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
              value={bikeWeight}
              onChange={(e) => setBikeWeight(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave()
              }}
              className="max-w-32"
            />
            <span className="text-sm text-muted-foreground">
              {unitSystem === "imperial" ? "lb" : "kg"}
            </span>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Stored for route simulation physics settings.
      </p>

      <div className="grid gap-2 pt-2">
        <Label>Units</Label>
        <ToggleGroup
          variant="outline"
          value={[unitSystem]}
          onValueChange={(values) =>
            handleUnitSystemChange(values[0] as UnitSystem | undefined)
          }
        >
          <ToggleGroupItem value="metric">Metric</ToggleGroupItem>
          <ToggleGroupItem value="imperial">Imperial</ToggleGroupItem>
        </ToggleGroup>
      </div>

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

      <div className="pt-2">
        <Button onClick={handleSave}>Save</Button>
      </div>
    </div>
  )
}
