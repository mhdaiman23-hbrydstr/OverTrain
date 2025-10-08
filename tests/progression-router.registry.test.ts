import { describe, expect, it } from "vitest"
import { resolveProgressionStrategy } from "@/lib/progression-router"
import type { GymTemplate } from "@/lib/gym-templates"

const buildTemplate = (overrides: Partial<GymTemplate> & { id: string }): GymTemplate => ({
  id: overrides.id,
  name: overrides.name ?? "Test Template",
  days: overrides.days ?? 1,
  weeks: overrides.weeks ?? 1,
  gender: overrides.gender ?? ["male"],
  experience: overrides.experience ?? ["beginner"],
  schedule: overrides.schedule ?? {},
  progressionConfig: overrides.progressionConfig,
  progressionScheme: overrides.progressionScheme,
})

describe("resolveProgressionStrategy", () => {
  it("returns registry match when template id is known", () => {
    const template = buildTemplate({ id: "ppl-6day-intermediate-male" })

    const decision = resolveProgressionStrategy(template)

    expect(decision.strategy).toBe("hybrid")
    expect(decision.source).toBe("registry")
    expect(decision.note).toBe("Hybrid target example")
  })

  it("prefers progressionConfig type when provided", () => {
    const template = buildTemplate({
      id: "custom-template",
      progressionConfig: {
        type: "percentage",
        deloadWeek: 4,
      },
    })

    const decision = resolveProgressionStrategy(template)

    expect(decision.strategy).toBe("percentage")
    expect(decision.source).toBe("template_config")
    expect(decision.note).toBeUndefined()
  })

  it("falls back to template scheme when config is absent", () => {
    const template = buildTemplate({
      id: "legacy-template",
      progressionScheme: {
        type: "periodized",
        deloadWeek: 3,
        progressionRules: {
          compound: {
            successThreshold: "all_sets_completed",
            weightIncrease: 5,
            failureResponse: "repeat",
          },
          isolation: {
            successThreshold: "all_sets_completed",
            weightIncrease: 2.5,
            failureResponse: "repeat",
          },
        },
      },
    })

    const decision = resolveProgressionStrategy(template)

    expect(decision.strategy).toBe("percentage")
    expect(decision.source).toBe("template_scheme")
  })

  it("returns fallback when template has no guidance", () => {
    const template = buildTemplate({ id: "unknown-template" })

    const decision = resolveProgressionStrategy(template)

    expect(decision.strategy).toBe("linear")
    expect(decision.source).toBe("default")
    expect(decision.note).toBeUndefined()
  })

  it("uses provided fallback when template is missing", () => {
    const decision = resolveProgressionStrategy(null, "percentage")

    expect(decision.strategy).toBe("percentage")
    expect(decision.source).toBe("default")
  })
})
