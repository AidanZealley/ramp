import { describe, expect, it } from "vitest"
import { defaultGameId, gameRegistry } from "./registry"

describe("game registry", () => {
  it("returns the default game", () => {
    expect(gameRegistry[defaultGameId]?.id).toBe(defaultGameId)
  })
})
