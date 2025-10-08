import { describe, it, expect } from "vitest"
import { getProgressionType } from "@/lib/progression-router"
import { DEFAULT_ONE_RM_EXERCISES } from "@/lib/one-rm-types"

const MOCK_TEMPLATE = {
  id: "ppl-6day-intermediate-male",
  template: { id: "ppl-6day-intermediate-male" },
}

const MOCK_DEFAULT_TEMPLATE = {
  id: "fullbody-3day-beginner-male",
  template: { id: "fullbody-3day-beginner-male" },
}

describe("progression registry", () => {
  it("returns registered type when available", () => {
    expect(getProgressionType(MOCK_TEMPLATE.id, MOCK_TEMPLATE.template, "linear")).toBe("hybrid")
  })

  it("falls back to template progressionConfig", () => {
    expect(getProgressionType("unknown", { id: "unknown", progressionConfig: { type: "percentage", deloadWeek: 4 } }, "linear")).toBe("percentage")
  })

  it("defaults to provided fallback", () => {
    expect(getProgressionType("unknown", { id: "unknown" }, "linear")).toBe("linear")
  })
})

