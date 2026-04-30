import { Link } from "@tanstack/react-router"
import type { RideGameDefinition } from "@/games/types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

export function RideGameTile({ game }: { game: RideGameDefinition }) {
  return (
    <Link to="/ride/$gameId" params={{ gameId: game.id }}>
      <Card
        size="sm"
        className="group cursor-pointer py-0! transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/20"
      >
        <CardContent className="flex flex-col gap-3 px-0!">
          <div
            className="flex h-24 flex-col justify-end gap-1 px-4 py-3"
            style={{
              background: `linear-gradient(145deg, ${game.accent.from}, ${game.accent.to})`,
              color: game.accent.ink,
            }}
          >
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase opacity-75">
              {game.preview.eyebrow}
            </p>
            <h3 className="font-heading text-xl font-semibold tracking-tight">
              {game.displayName}
            </h3>
          </div>
          <div className="flex flex-col gap-2 px-3 pb-3">
            <p className="text-sm text-muted-foreground">{game.description}</p>
            <div className="flex flex-wrap gap-1">
              {game.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[10px]"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
