import { Capability } from "@ramp/ride-contracts"

export type CommandKey = Capability | "mode" | "disconnect"

export type CommandCompletion = {
  promise: Promise<void>
  resolve: () => void
  reject: (error: Error) => void
  settled: boolean
}

export const MAX_ATTEMPTS = 6
export const MAX_BACKOFF_MS = 2000

export function backoffFor(attempts: number): number {
  const base = Math.min(MAX_BACKOFF_MS, 100 * Math.pow(2, attempts - 1))
  const jitter = Math.random() * 50
  return base + jitter
}

export function createCompletion(): CommandCompletion {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, resolve, reject, settled: false }
}

export function isCapabilityKey(key: CommandKey): key is Capability {
  return Object.values(Capability).includes(key as Capability)
}
