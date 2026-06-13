import { BluetoothOff } from "lucide-react"
import { RideConnectionPanel } from "./RideConnectionPanel"
import { useRideRuntimeContext } from "@/ride/ride-runtime-context"

const backgroundTiles = Array.from({ length: 6 }, (_, index) => index)

export const RideConnectionScreen = () => {
  const runtime = useRideRuntimeContext()

  return (
    <section className="relative flex min-h-88 items-center justify-center overflow-hidden px-4 py-10 text-center sm:min-h-[min(34rem,58svh)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 mx-auto grid max-w-5xl grid-cols-1 gap-6 opacity-45 sm:grid-cols-2"
        style={{
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.55) 45%, transparent 82%, transparent 100%)",
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.55) 45%, transparent 82%, transparent 100%)",
        }}
      >
        {backgroundTiles.map((tile) => (
          <div
            key={tile}
            className="h-40 rounded-3xl border border-border/40 bg-muted/35"
          />
        ))}
      </div>
      <div className="relative z-10 grid w-full max-w-md justify-items-center gap-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 -z-10 size-168 -translate-x-1/2 -translate-y-1/2 bg-radial-[closest-side_at_center] from-background/50 to-transparent"
        />
        <BluetoothOff className="size-10 text-muted-foreground" />
        <div className="grid gap-2">
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Trainer not connected
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Connect to a trainer to begin riding
          </p>
        </div>
        <RideConnectionPanel runtime={runtime} compact hideIntro />
      </div>
    </section>
  )
}
