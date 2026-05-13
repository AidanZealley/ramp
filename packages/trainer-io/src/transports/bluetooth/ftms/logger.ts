export type TrainerIoLogger = {
  debug: (...args: Array<unknown>) => void
  error: (...args: Array<unknown>) => void
  info: (...args: Array<unknown>) => void
  warn: (...args: Array<unknown>) => void
}

const noop = () => undefined

export const noopTrainerIoLogger: TrainerIoLogger = {
  debug: noop,
  error: noop,
  info: noop,
  warn: noop,
}
