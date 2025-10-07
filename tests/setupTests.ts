import "@testing-library/jest-dom"
import { vi } from "vitest"

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.matchMedia = global.matchMedia || function () {
  return {
    matches: false,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }
}

global.HTMLElement.prototype.scrollIntoView = vi.fn()

