import { RideExperienceTile } from "./ride-experience-tile"
import type { ReactNode } from "react"
import { rideExperiences } from "@/experiences/catalog"

export function RideExperiencePickerPage({
  children,
  headerAction,
}: {
  children?: ReactNode
  headerAction?: ReactNode
}) {
  return (
    <div className="flex justify-center">
      <div className="flex w-full max-w-5xl flex-col gap-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Ride
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick an experience to ride.
            </p>
          </div>
          {headerAction}
        </div>

        {children ?? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {rideExperiences.map((experience) => (
              <RideExperienceTile key={experience.id} experience={experience} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
