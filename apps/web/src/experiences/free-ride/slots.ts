/**
 * Stateless "infinite scroll" slot helpers, shared by the chevrons, scenery and
 * floating structures.
 *
 * Each slot is anchored to a fixed world distance (`k * spacing`). Given the
 * current travel distance we only ever look at the contiguous window of slots
 * that fall within [distance - back, distance + ahead]. Because a slot's
 * attributes are derived purely from its integer index `k` (via a seeded RNG),
 * instances can be reassigned to new slots as we move without any per-instance
 * state — and the reassignment only happens once a slot is fully behind the fog,
 * so there is never a visible pop.
 */

export type SlotWindow = {
  spacing: number
  back: number
  ahead: number
}

/** Fixed number of instances needed to cover the window. */
export function slotCount(window: SlotWindow): number {
  return Math.ceil((window.back + window.ahead) / window.spacing) + 1
}

export function firstSlotIndex(distance: number, window: SlotWindow): number {
  return Math.ceil((distance - window.back) / window.spacing)
}

/**
 * Invoke `visit` for each active slot. `k` is the stable integer slot index
 * (use it to seed deterministic per-slot attributes); `distanceAlong` is the
 * world distance of the slot along the track.
 */
export function forEachSlot(
  distance: number,
  window: SlotWindow,
  visit: (slotIndex: number, k: number, distanceAlong: number) => void
): void {
  const first = firstSlotIndex(distance, window)
  const count = slotCount(window)
  for (let i = 0; i < count; i += 1) {
    const k = first + i
    visit(i, k, k * window.spacing)
  }
}
