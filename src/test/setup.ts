import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"

class ResizeObserverMock {
  observe() {}

  unobserve() {}

  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver

Object.defineProperty(HTMLElement.prototype, "scrollTo", {
  configurable: true,
  value(options: ScrollToOptions) {
    if (typeof options.left === "number") {
      this.scrollLeft = options.left
    }
  },
})

afterEach(() => {
  cleanup()
})
