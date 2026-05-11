import type { RideSessionController } from "@ramp/ride-core"

type CapabilitiesModuleProps = {
  session: RideSessionController
}

export const CapabilitiesModule = ({ session }: CapabilitiesModuleProps) => {
  const capabilities = Array.from(session.controls.getCapabilities()).sort()

  return (
    <section className="min-w-0" aria-label="Capabilities">
      <div className="text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        Capabilities
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {capabilities.length === 0 ? (
          <span className="text-sm font-medium text-muted-foreground">
            None reported
          </span>
        ) : (
          capabilities.map((capability) => (
            <span
              key={capability}
              className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground"
            >
              {capability}
            </span>
          ))
        )}
      </div>
    </section>
  )
}
