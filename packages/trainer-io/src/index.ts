export type TrainerTelemetry = {
  powerWatts: number | null
  cadenceRpm: number | null
  speedMps: number | null
  timestampMs: number
  source: "simulator" | "web-bluetooth"
}

export interface TrainerSource {
  connect(): Promise<void>
  disconnect(): Promise<void>
  subscribe(listener: (telemetry: TrainerTelemetry) => void): () => void
}

export type MockTrainerSourceOptions = {
  intervalMs?: number
  initialTelemetry?: Partial<Omit<TrainerTelemetry, "source" | "timestampMs">>
  now?: () => number
}

export class MockTrainerSource implements TrainerSource {
  private readonly listeners = new Set<(telemetry: TrainerTelemetry) => void>()
  private readonly intervalMs: number
  private readonly now: () => number
  private timer: ReturnType<typeof setInterval> | null = null
  private telemetry: Omit<TrainerTelemetry, "timestampMs" | "source">

  constructor(options: MockTrainerSourceOptions = {}) {
    this.intervalMs = options.intervalMs ?? 1000
    this.now = options.now ?? (() => Date.now())
    this.telemetry = {
      powerWatts: options.initialTelemetry?.powerWatts ?? 180,
      cadenceRpm: options.initialTelemetry?.cadenceRpm ?? 90,
      speedMps: options.initialTelemetry?.speedMps ?? null,
    }
  }

  async connect(): Promise<void> {
    if (this.timer) return
    this.emit()
    this.timer = setInterval(() => this.emit(), this.intervalMs)
  }

  async disconnect(): Promise<void> {
    if (!this.timer) return
    clearInterval(this.timer)
    this.timer = null
  }

  subscribe(listener: (telemetry: TrainerTelemetry) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  setTelemetry(
    telemetry: Partial<Omit<TrainerTelemetry, "timestampMs" | "source">>
  ): void {
    this.telemetry = {
      ...this.telemetry,
      ...telemetry,
    }
    this.emit()
  }

  private emit(): void {
    const telemetry: TrainerTelemetry = {
      ...this.telemetry,
      timestampMs: this.now(),
      source: "simulator",
    }

    for (const listener of this.listeners) {
      listener(telemetry)
    }
  }
}
