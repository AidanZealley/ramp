export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  reason: string
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout>
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error(reason)), timeoutMs)
    }),
  ]).finally(() => clearTimeout(timeoutHandle!))
}
