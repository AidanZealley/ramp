/**
 * rAF shim for Vitest that integrates with fake timers.
 *
 * Each requestAnimationFrame call schedules the callback via setTimeout(cb, 16),
 * so vi.advanceTimersByTimeAsync() drives the animation loop exactly as it would
 * drive real timers — no special rAF mocking needed.
 *
 * Usage:
 *   const rafShim = createRAFShim()
 *   createRideSession({
 *     requestAnimationFrame: rafShim.requestAnimationFrame,
 *     cancelAnimationFrame: rafShim.cancelAnimationFrame,
 *   })
 *   // call rafShim.reset() in afterEach
 */
export function createRAFShim() {
  let nextId = 1
  const callbacks = new Map<number, (timestamp: number) => void>()
  let timestamp = 0

  const requestAnimationFrame = (
    callback: (timestamp: number) => void
  ): number => {
    const id = nextId++
    callbacks.set(id, callback)
    setTimeout(() => {
      const cb = callbacks.get(id)
      if (cb) {
        callbacks.delete(id)
        timestamp += 16
        cb(timestamp)
      }
    }, 16)
    return id
  }

  const cancelAnimationFrame = (id: number): void => {
    callbacks.delete(id)
  }

  const reset = () => {
    callbacks.clear()
    timestamp = 0
    nextId = 1
  }

  return { requestAnimationFrame, cancelAnimationFrame, reset }
}
