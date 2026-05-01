export class Subject<T> {
  private readonly listeners = new Set<(value: T) => void>()

  subscribe(listener: (value: T) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  emit(value: T): void {
    for (const listener of this.listeners) {
      try {
        listener(value)
      } catch (err) {
        console.error("Subject listener threw", err)
      }
    }
  }

  clear(): void {
    this.listeners.clear()
  }
}
