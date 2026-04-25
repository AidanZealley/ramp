export interface HistoryState<T> {
  past: T[]
  present: T
  future: T[]
}

export function createHistory<T>(
  initialPresent: T,
  limit: number
): HistoryState<T> {
  void limit
  return {
    past: [],
    present: initialPresent,
    future: [],
  }
}

export function pushHistory<T>(
  history: HistoryState<T>,
  nextPresent: T,
  limit: number
): HistoryState<T> {
  const past = [...history.past, history.present]
  const trimmedPast = limit > 0 ? past.slice(-limit) : []

  return {
    past: trimmedPast,
    present: nextPresent,
    future: [],
  }
}

export function undoHistory<T>(
  history: HistoryState<T>
): HistoryState<T> | null {
  const previous = history.past[history.past.length - 1]
  if (!previous) return null

  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  }
}

export function redoHistory<T>(
  history: HistoryState<T>
): HistoryState<T> | null {
  const next = history.future[0]
  if (!next) return null

  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  }
}

export function resetHistory<T>(nextPresent: T): HistoryState<T> {
  return {
    past: [],
    present: nextPresent,
    future: [],
  }
}
