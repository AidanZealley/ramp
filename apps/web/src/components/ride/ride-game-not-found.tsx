import { Link } from "@tanstack/react-router"

export function RideGameNotFound({ gameId }: { gameId: string }) {
  return (
    <section className="flex min-h-svh items-center justify-center bg-[linear-gradient(180deg,#101a1d,#1d2e35)] px-4 text-white">
      <div className="w-full max-w-xl rounded-[2rem] border border-white/15 bg-white/10 p-8 shadow-2xl backdrop-blur-md">
        <p className="text-xs font-semibold tracking-[0.3em] text-[#9dc7d4] uppercase">
          Invalid Ride Game
        </p>
        <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight">
          No game found for “{gameId}”.
        </h1>
        <p className="mt-4 text-sm leading-6 text-white/78">
          This ride route does not map to a registered game. Pick a supported
          mode from the launcher instead.
        </p>
        <Link
          to="/ride"
          className="mt-6 inline-flex rounded-full bg-white px-5 py-2.5 font-heading text-sm font-semibold tracking-[0.14em] text-[#14202a] uppercase"
        >
          Back to games
        </Link>
      </div>
    </section>
  )
}
