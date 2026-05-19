import { Settings } from "lucide-react"
import { smoothingLevelToMeters } from "../../../../utils"
import type { RouteMapViewMode } from "../../../../types"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type RouteSettingsPopoverProps = {
  onSmoothingChange: (value: number) => void
  onTerrainEnabledChange: (enabled: boolean) => void
  onViewModeChange: (mode: RouteMapViewMode) => void
  smoothingLevel: number
  terrainEnabled: boolean
  viewMode: RouteMapViewMode
}

export const RouteSettingsPopover = ({
  onSmoothingChange,
  onTerrainEnabledChange,
  onViewModeChange,
  smoothingLevel,
  terrainEnabled,
  viewMode,
}: RouteSettingsPopoverProps) => (
  <Popover>
    <PopoverTrigger
      render={
        <Button size="icon" variant="outline" aria-label="Route settings">
          <Settings />
        </Button>
      }
    />
    <PopoverContent
      side="top"
      sideOffset={24}
      align="center"
      className="w-80 rounded-lg p-4"
    >
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label className="text-xs">View</Label>
          <ToggleGroup
            aria-label="Map view mode"
            value={[viewMode]}
            size="sm"
            variant="outline"
            className="w-full"
          >
            <ToggleGroupItem
              aria-label="Top-down map view"
              className="flex-1"
              value="top-down"
              onPressedChange={(pressed) => {
                if (pressed) onViewModeChange("top-down")
              }}
            >
              Top-down
            </ToggleGroupItem>
            <ToggleGroupItem
              aria-label="Perspective map view"
              className="flex-1"
              value="perspective"
              onPressedChange={(pressed) => {
                if (pressed) onViewModeChange("perspective")
              }}
            >
              Perspective
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <Label className="flex items-center justify-between gap-4 text-xs">
          Terrain
          <Switch
            size="sm"
            checked={terrainEnabled}
            onCheckedChange={(checked) => onTerrainEnabledChange(checked)}
          />
        </Label>
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs">Smoothing</Label>
            <span className="text-xs text-muted-foreground">
              {smoothingLevelToMeters(smoothingLevel) === 0
                ? "Off"
                : `${smoothingLevelToMeters(smoothingLevel)} m`}
            </span>
          </div>
          <Slider
            min={0}
            max={6}
            step={1}
            value={[smoothingLevel]}
            onValueChange={(value) =>
              onSmoothingChange(Array.isArray(value) ? (value[0] ?? 0) : value)
            }
          />
        </div>
      </div>
    </PopoverContent>
  </Popover>
)
