"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CheckCircle2, FolderPlus, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { programTemplateService } from "@/lib/services/program-template-service"
import { useDebounce } from "@/hooks/use-debounce"
import {
  BuilderDay,
  ExerciseLibraryItem,
  GlobalProgressionDefaults,
  ProgramMeta,
  GenderOption,
  ExperienceOption,
  ProgramTemplateSummary,
  ProgramTemplateDetail,
} from "./types"
import { ProgramSummaryPanel } from "./program-summary-panel"
import { MetaPanel } from "./meta-panel"
import { ProgressionPanel } from "./progression-panel"
import { SchedulePanel } from "./schedule-panel"
import { ExerciseLibraryPanel, type LibraryFilters } from "./exercise-library-panel"
import { TemplatePreviewDialog } from "./template-preview-dialog"

const uniqueId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

const DEFAULT_META: ProgramMeta = {
  name: "",
  description: "",
  daysPerWeek: 4,
  totalWeeks: 8,
  progressionType: "linear",
  gender: ["male", "female"],
  experienceLevel: ["intermediate"],
  applyGlobalProgression: true,
  isActive: true,
}

const DEFAULT_PROGRESS: GlobalProgressionDefaults = {
  workingSets: 3,
  workingRepRange: "8-10",
  deloadSets: 2,
  deloadRepRange: "8-10",
  restTimeSeconds: 90,
  tier: "tier1",
  autoProgressionEnabled: true,
  progressionMode: "weight_based",
}

const LIBRARY_SCROLL_HEIGHT = "max-h-[640px]"

const createEmptyDay = (position: number): BuilderDay => ({
  id: uniqueId(),
  dayNumber: position,
  dayName: `Day ${position}`,
  exercises: [],
})

export function AdminTemplateBuilder() {
  const [meta, setMeta] = useState<ProgramMeta>(DEFAULT_META)
  const [progressDefaults, setProgressDefaults] = useState<GlobalProgressionDefaults>(DEFAULT_PROGRESS)
  const initialDays = useMemo(
    () => Array.from({ length: DEFAULT_META.daysPerWeek }, (_, index) => createEmptyDay(index + 1)),
    [],
  )
  const [days, setDays] = useState<BuilderDay[]>(initialDays)
  const [activeDayId, setActiveDayId] = useState<string>(initialDays[0]?.id ?? "")
  const [sidebarTab, setSidebarTab] = useState<"settings" | "progression">("settings")
  const [filters, setFilters] = useState<LibraryFilters>({ search: "", muscleGroups: [], equipmentTypes: [] })
  const [library, setLibrary] = useState<ExerciseLibraryItem[]>([])
  const [exerciseError, setExerciseError] = useState<string | null>(null)
  const [isLoadingExercises, setIsLoadingExercises] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState<
    { id?: string | number; name: string; timestamp: number; action: "created" | "updated" } | null
  >(null)
  const [templates, setTemplates] = useState<ProgramTemplateSummary[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [templateError, setTemplateError] = useState<string | null>(null)
  const [templateSearch, setTemplateSearch] = useState("")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [isLoadingTemplateDetail, setIsLoadingTemplateDetail] = useState(false)
  const librarySearchRef = useRef<HTMLInputElement | null>(null)
  const debouncedFilters = useDebounce(filters, 300)
  const debouncedTemplateSearch = useDebounce(templateSearch, 300)
  const { toast } = useToast()

  const syncDaysToCount = useCallback((desiredCount: number) => {
    const target = Math.max(1, Math.floor(Number.isFinite(desiredCount) ? desiredCount : 1))
    setDays((prev) => {
      if (prev.length === target) {
        return prev
      }

      if (prev.length < target) {
        const additions = Array.from({ length: target - prev.length }, (_, index) =>
          createEmptyDay(prev.length + index + 1),
        )
        return [...prev, ...additions]
      }

      return prev.slice(0, target).map((day, index) => ({
        ...day,
        dayNumber: index + 1,
      }))
    })
  }, [])

  const initializeNewTemplate = useCallback(() => {
    const baseDays = Array.from({ length: DEFAULT_META.daysPerWeek }, (_, index) => createEmptyDay(index + 1))
    setMeta({ ...DEFAULT_META })
    setProgressDefaults({ ...DEFAULT_PROGRESS })
    setDays(baseDays)
    setActiveDayId(baseDays[0]?.id ?? "")
    setSidebarTab("settings")
    setEditingTemplateId(null)
    setSelectedTemplateId(null)
    setTemplateError(null)
  }, [])

  const mapExerciseConfigToBuilder = useCallback((exercise: any) => {
    const config = (exercise.progressionConfig ?? {}) as Record<string, any>
    const metadata = (config?.metadata ?? {}) as Record<string, any>
    const progressionTemplate = (config?.progressionTemplate ?? {}) as Record<
      string,
      { sets: number; repRange: string; intensity?: string }
    >

    const weeks = Object.entries(progressionTemplate)
      .map(([key, value]) => {
        const match = key.match(/week(\d+)/i)
        const weekNumber = match ? Number(match[1]) : 0
        return { weekNumber, ...value }
      })
      .sort((a, b) => a.weekNumber - b.weekNumber)

    const workingWeek =
      weeks.find((week) => week.intensity?.toLowerCase() !== "deload") ?? weeks[0] ?? { sets: DEFAULT_PROGRESS.workingSets, repRange: DEFAULT_PROGRESS.workingRepRange }

    const deloadWeek =
      [...weeks].reverse().find((week) => week.intensity?.toLowerCase() === "deload") ??
      weeks[weeks.length - 1] ??
      workingWeek

    const workingSets = metadata.workingSets ?? workingWeek.sets ?? DEFAULT_PROGRESS.workingSets
    const workingRepRange = metadata.workingRepRange ?? workingWeek.repRange ?? DEFAULT_PROGRESS.workingRepRange
    const deloadSets = metadata.deloadSets ?? deloadWeek?.sets ?? DEFAULT_PROGRESS.deloadSets
    const deloadRepRange = metadata.deloadRepRange ?? deloadWeek?.repRange ?? DEFAULT_PROGRESS.deloadRepRange
    const autoProgressionEnabled =
      metadata.autoProgressionEnabled ?? (config?.autoProgression?.enabled ?? DEFAULT_PROGRESS.autoProgressionEnabled)
    const progressionMode =
      metadata.progressionMode ?? config?.autoProgression?.progressionType ?? DEFAULT_PROGRESS.progressionMode
    const tier = metadata.tier ?? (config?.tier === "tier2" ? "tier2" : "tier1")
    const useGlobalProgression = metadata.useGlobalProgression ?? false

    return {
      id: exercise.id ?? uniqueId(),
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      category: exercise.category,
      restTimeSeconds: exercise.restTimeSeconds,
      order: exercise.order,
      tier: tier === "tier2" ? "tier2" : "tier1",
      useGlobalProgression,
      workingSets,
      workingRepRange,
      deloadSets,
      deloadRepRange,
      autoProgressionEnabled,
      progressionMode: progressionMode === "rep_based" ? "rep_based" : "weight_based",
    } satisfies BuilderDay["exercises"][number]
  }, [])

  const mapTemplateDetailToState = useCallback(
    (detail: ProgramTemplateDetail) => {
      const mappedDays = detail.days.length
        ? detail.days.map((day) => ({
            id: day.id ?? uniqueId(),
            dayNumber: day.dayNumber,
            dayName: day.dayName,
            exercises: (day.exercises ?? []).map((exercise) =>
              mapExerciseConfigToBuilder({
                id: exercise.id,
                exerciseId: exercise.exerciseId,
                exerciseName: exercise.exerciseName,
                category: exercise.category,
                restTimeSeconds: exercise.restTimeSeconds,
                order: exercise.order,
                progressionConfig: exercise.progressionConfig,
              }),
            ),
          }))
        : Array.from({ length: detail.daysPerWeek }, (_, index) => createEmptyDay(index + 1))

      const allExercises = mappedDays.flatMap((day) => day.exercises)
      const firstExercise = allExercises[0]

      const derivedDefaults: GlobalProgressionDefaults = {
        workingSets: firstExercise?.workingSets ?? DEFAULT_PROGRESS.workingSets,
        workingRepRange: firstExercise?.workingRepRange ?? DEFAULT_PROGRESS.workingRepRange,
        deloadSets: firstExercise?.deloadSets ?? DEFAULT_PROGRESS.deloadSets,
        deloadRepRange: firstExercise?.deloadRepRange ?? DEFAULT_PROGRESS.deloadRepRange,
        restTimeSeconds: firstExercise?.restTimeSeconds ?? DEFAULT_PROGRESS.restTimeSeconds,
        tier: firstExercise?.tier ?? DEFAULT_PROGRESS.tier,
        autoProgressionEnabled: firstExercise?.autoProgressionEnabled ?? DEFAULT_PROGRESS.autoProgressionEnabled,
        progressionMode: firstExercise?.progressionMode ?? DEFAULT_PROGRESS.progressionMode,
      }

      const applyGlobalProgression = detail.days.every((day) =>
        day.exercises.every((exercise) => {
          const metadata = (exercise.progressionConfig as Record<string, any> | undefined)?.metadata
          if (metadata?.useGlobalProgression === false) {
            return false
          }
          return true
        }),
      )

      return {
        meta: {
          name: detail.name ?? "",
          description: detail.description ?? "",
          daysPerWeek: detail.daysPerWeek,
          totalWeeks: detail.totalWeeks,
          progressionType: detail.progressionType,
          gender: (detail.gender ?? []) as GenderOption[],
          experienceLevel: (detail.experienceLevel ?? []) as ExperienceOption[],
          applyGlobalProgression,
          isActive: detail.isActive,
        } satisfies ProgramMeta,
        progressDefaults: derivedDefaults,
        days: mappedDays,
      }
    },
    [mapExerciseConfigToBuilder],
  )

  const applyTemplateDetail = useCallback(
    (detail: ProgramTemplateDetail) => {
      const mapped = mapTemplateDetailToState(detail)
      setMeta(mapped.meta)
      setProgressDefaults(mapped.progressDefaults)
      setDays(mapped.days)
      setActiveDayId(mapped.days[0]?.id ?? "")
      setSidebarTab("settings")
      setEditingTemplateId(detail.id)
    },
    [mapTemplateDetailToState],
  )

  const loadTemplates = useCallback(
    async (searchTerm?: string) => {
      if (!accessToken) return
      const params = new URLSearchParams()
      if (searchTerm) {
        params.set("search", searchTerm)
      }

      setIsLoadingTemplates(true)
      setTemplateError(null)
      try {
        const response = await fetch(`/api/admin/templates${params.toString() ? `?${params.toString()}` : ""}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        if (!response.ok) {
          throw new Error(await response.text())
        }

        const data = await response.json()
        const mapped: ProgramTemplateSummary[] = (data.templates ?? []).map((template: any) => ({
          id: template.id,
          name: template.name,
          description: template.description ?? null,
          daysPerWeek: template.days_per_week,
          totalWeeks: template.total_weeks,
          gender: template.gender ?? [],
          experienceLevel: template.experience_level ?? [],
          isActive: template.is_active,
          updatedAt: template.updated_at ?? null,
        }))

        setTemplates(mapped)
      } catch (error) {
        console.error("[TemplateBuilder] template list fetch failed", error)
        setTemplateError("Unable to load templates. Please try again.")
      } finally {
        setIsLoadingTemplates(false)
      }
    },
    [accessToken],
  )

  const loadTemplateDetail = useCallback(
    async (templateId: string) => {
      if (!accessToken) return

      setIsLoadingTemplateDetail(true)
      setTemplateError(null)
      try {
        const response = await fetch(`/api/admin/templates/${templateId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        if (!response.ok) {
          throw new Error(await response.text())
        }

        const data = await response.json()
        if (!data?.template) {
          throw new Error("Template not found")
        }

        applyTemplateDetail(data.template as ProgramTemplateDetail)
        setSelectedTemplateId(templateId)
      } catch (error) {
        console.error("[TemplateBuilder] template detail fetch failed", error)
        setTemplateError("Unable to load template details. Please try again.")
      } finally {
        setIsLoadingTemplateDetail(false)
      }
    },
    [accessToken, applyTemplateDetail],
  )

  const handleSelectTemplate = useCallback(
    (templateId: string) => {
      setSelectedTemplateId(templateId)
      void loadTemplateDetail(templateId)
    },
    [loadTemplateDetail],
  )

  const handleCreateNewTemplate = useCallback(() => {
    initializeNewTemplate()
  }, [initializeNewTemplate])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setAccessToken(data.session?.access_token ?? null))
    const subscription = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null)
    })
    return () => subscription?.data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!accessToken) return
    const controller = new AbortController()

    void (async () => {
      try {
        setExerciseError(null)
        setIsLoadingExercises(true)
        const params = new URLSearchParams()
        if (debouncedFilters.search) params.append("search", debouncedFilters.search)
        debouncedFilters.muscleGroups.forEach((group) => {
          if (group) params.append("muscleGroup", group)
        })
        debouncedFilters.equipmentTypes.forEach((equipment) => {
          if (equipment) params.append("equipment", equipment)
        })

        const response = await fetch(`/api/admin/templates/exercises?${params.toString()}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(await response.text())
        }

        const data = await response.json()
        setLibrary(data.exercises ?? [])
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("[TemplateBuilder] exercise fetch failed", error)
          setExerciseError("Unable to load exercises. Check your connection or credentials.")
        }
      } finally {
        setIsLoadingExercises(false)
      }
    })()

    return () => {
      controller.abort()
    }
  }, [accessToken, debouncedFilters])

  useEffect(() => {
    if (!accessToken) return
    void loadTemplates(debouncedTemplateSearch)
  }, [accessToken, debouncedTemplateSearch, loadTemplates])

  useEffect(() => {
    syncDaysToCount(meta.daysPerWeek)
  }, [meta.daysPerWeek, syncDaysToCount])

  useEffect(() => {
    if (!days.length) return
    if (!days.some((day) => day.id === activeDayId)) {
      setActiveDayId(days[days.length - 1]?.id ?? "")
    }
  }, [days, activeDayId])

  const activeDay = days.find((day) => day.id === activeDayId) ?? days[0]
  const totalWeeks = meta.totalWeeks

  const validation = useMemo(() => {
    const issues: string[] = []
    const fieldErrors: Record<string, string> = {}

    if (!meta.name.trim()) {
      fieldErrors["meta.name"] = "Program name is required."
    }

    if (meta.daysPerWeek < 1) {
      fieldErrors["meta.daysPerWeek"] = "Days per week must be at least 1."
    }

    if (!Number.isInteger(meta.daysPerWeek)) {
      fieldErrors["meta.daysPerWeek"] = "Days per week must be a whole number."
    }

    if (meta.totalWeeks < 1) {
      fieldErrors["meta.totalWeeks"] = "Total weeks must be at least 1."
    }

    if (!Number.isInteger(meta.totalWeeks)) {
      fieldErrors["meta.totalWeeks"] = "Total weeks must be a whole number."
    }

    if (days.length !== meta.daysPerWeek) {
      issues.push(
        `Program has ${days.length} configured day${days.length === 1 ? "" : "s"} but days per week is set to ${meta.daysPerWeek}.`,
      )
    }

    if (progressDefaults.workingSets < 1) {
      fieldErrors["progress.workingSets"] = "Working sets must be at least 1."
    }

    if (!progressDefaults.workingRepRange.trim()) {
      fieldErrors["progress.workingRepRange"] = "Working rep range is required."
    }

    if (progressDefaults.deloadSets < 0) {
      fieldErrors["progress.deloadSets"] = "Deload sets cannot be negative."
    }

    if (!progressDefaults.deloadRepRange.trim()) {
      fieldErrors["progress.deloadRepRange"] = "Deload rep range is required."
    }

    if (progressDefaults.restTimeSeconds < 30) {
      fieldErrors["progress.restTimeSeconds"] = "Rest time must be at least 30 seconds."
    }
    if (!progressDefaults.progressionMode) {
      fieldErrors["progress.progressionMode"] = "Select a progression mode."
    }

    days.forEach((day, dayIndex) => {
      const dayLabel = day.dayName.trim() || `Day ${dayIndex + 1}`

      if (!day.dayName.trim()) {
        fieldErrors[`day.${day.id}.name`] = "Day name is required."
      }

      if (day.dayNumber < 1 || !Number.isInteger(day.dayNumber)) {
        fieldErrors[`day.${day.id}.number`] = "Day order must be a positive whole number."
      }

      if (day.exercises.length === 0) {
        fieldErrors[`day.${day.id}.exercises`] = "Add at least one exercise to this day."
        issues.push(`${dayLabel} does not contain any exercises.`)
      }

      day.exercises.forEach((exercise, exerciseIndex) => {
        const exercisePath = `day.${day.id}.exercise.${exercise.id}`
        const exerciseLabel = exercise.exerciseName || `Exercise ${exerciseIndex + 1}`

        if (!exercise.exerciseId) {
          fieldErrors[`${exercisePath}.name`] = "Select an exercise."
        }

        if (exercise.restTimeSeconds <= 0) {
          fieldErrors[`${exercisePath}.rest`] = "Rest time must be greater than zero."
        }

        const workingSets = exercise.useGlobalProgression ? progressDefaults.workingSets : exercise.workingSets
        if (workingSets <= 0) {
          fieldErrors[`${exercisePath}.workingSets`] = `${exerciseLabel}: working sets must be at least 1.`
        }

        const workingRepRange = exercise.useGlobalProgression ? progressDefaults.workingRepRange : exercise.workingRepRange
        if (!workingRepRange.trim()) {
          fieldErrors[`${exercisePath}.workingRepRange`] = `${exerciseLabel}: working rep range is required.`
        }

        const deloadSets = exercise.useGlobalProgression ? progressDefaults.deloadSets : exercise.deloadSets
        if (deloadSets < 0) {
          fieldErrors[`${exercisePath}.deloadSets`] = `${exerciseLabel}: deload sets cannot be negative.`
        }

        const deloadRepRange = exercise.useGlobalProgression ? progressDefaults.deloadRepRange : exercise.deloadRepRange
        if (!deloadRepRange.trim()) {
          fieldErrors[`${exercisePath}.deloadRepRange`] = `${exerciseLabel}: deload rep range is required.`
        }
      })
    })

    return { issues, fieldErrors }
  }, [meta, days, progressDefaults])

  const summaryMessages = useMemo(() => {
    const messages = new Set<string>()
    validation.issues.forEach((message) => messages.add(message))
    Object.values(validation.fieldErrors).forEach((message) => messages.add(message))
    return Array.from(messages)
  }, [validation])

  const handleMetaChange = <K extends keyof ProgramMeta>(key: K, value: ProgramMeta[K]) => {
    if (key === "daysPerWeek") {
      const numericValue = typeof value === "number" ? value : Number(value)
      const sanitized = Math.max(1, Math.floor(Number.isFinite(numericValue) ? numericValue : 1))
      setMeta((prev) => ({ ...prev, daysPerWeek: sanitized }))
      syncDaysToCount(sanitized)
      return
    }

    setMeta((prev) => ({ ...prev, [key]: value }))
  }

  const handleToggleOption = (key: "gender" | "experienceLevel", value: GenderOption | ExperienceOption) => {
    setMeta((prev) => {
      const exists = prev[key].includes(value as never)
      const next = exists ? prev[key].filter((entry) => entry !== value) : [...prev[key], value]
      return { ...prev, [key]: next as ProgramMeta[typeof key] }
    })
  }

  const updateDay = (id: string, updater: (day: BuilderDay) => BuilderDay) => {
    setDays((prev) => prev.map((day) => (day.id === id ? updater(day) : day)))
  }

  const addDay = () => {
    setDays((prev) => {
      const nextNumber = prev.length + 1
      const newDay = createEmptyDay(nextNumber)
      setMeta((prevMeta) => ({ ...prevMeta, daysPerWeek: nextNumber }))
      setActiveDayId(newDay.id)
      return [...prev, newDay]
    })
  }

  const duplicateDay = (id: string) => {
    setDays((prev) => {
      const original = prev.find((day) => day.id === id)
      if (!original) {
        return prev
      }

      const nextNumber = prev.length + 1
      const clone: BuilderDay = {
        id: uniqueId(),
        dayNumber: nextNumber,
        dayName: `${original.dayName} Copy`,
        exercises: original.exercises.map((exercise, index) => ({
          ...exercise,
          id: uniqueId(),
          order: index + 1,
        })),
      }

      setMeta((prevMeta) => ({ ...prevMeta, daysPerWeek: nextNumber }))
      setActiveDayId(clone.id)
      return [...prev, clone]
    })
  }

  const removeDay = (id: string) => {
    if (days.length === 1) {
      toast({
        title: "At least one day required",
        description: "Templates must keep at least one training day.",
        variant: "destructive",
      })
      return
    }

    setDays((prev) => {
      const filtered = prev.filter((day) => day.id !== id)
      if (filtered.length === prev.length) {
        return prev
      }

      const normalized = filtered.map((day, index) => ({ ...day, dayNumber: index + 1 }))
      setMeta((prevMeta) => ({ ...prevMeta, daysPerWeek: normalized.length }))

      if (!normalized.some((day) => day.id === activeDayId)) {
        setActiveDayId(normalized[normalized.length - 1]?.id ?? "")
      }

      return normalized
    })
  }

  const addExerciseToDay = (dayId: string, exercise: ExerciseLibraryItem) => {
    updateDay(dayId, (day) => ({
      ...day,
      exercises: [
        ...day.exercises,
        {
          id: uniqueId(),
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          category: "compound",
          restTimeSeconds: progressDefaults.restTimeSeconds,
          order: day.exercises.length + 1,
          tier: progressDefaults.tier,
          useGlobalProgression: meta.applyGlobalProgression,
          workingSets: progressDefaults.workingSets,
          workingRepRange: progressDefaults.workingRepRange,
          deloadSets: progressDefaults.deloadSets,
          deloadRepRange: progressDefaults.deloadRepRange,
          autoProgressionEnabled: progressDefaults.autoProgressionEnabled,
          progressionMode: progressDefaults.progressionMode,
        },
      ],
    }))
  }

  const updateExercise = (
    dayId: string,
    exerciseId: string,
    updater: (exercise: BuilderDay["exercises"][0]) => BuilderDay["exercises"][0],
  ) => {
    updateDay(dayId, (day) => ({
      ...day,
      exercises: day.exercises.map((exercise) => (exercise.id === exerciseId ? updater(exercise) : exercise)),
    }))
  }

  const removeExercise = (dayId: string, exerciseId: string) => {
    updateDay(dayId, (day) => ({
      ...day,
      exercises: day.exercises
        .filter((exercise) => exercise.id !== exerciseId)
        .map((exercise, index) => ({ ...exercise, order: index + 1 })),
    }))
  }

  const reorderExercise = (dayId: string, exerciseId: string, direction: "up" | "down") => {
    updateDay(dayId, (day) => {
      const currentIndex = day.exercises.findIndex((exercise) => exercise.id === exerciseId)
      if (currentIndex === -1) return day

      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
      if (targetIndex < 0 || targetIndex >= day.exercises.length) return day

      const updated = [...day.exercises]
      const [moved] = updated.splice(currentIndex, 1)
      updated.splice(targetIndex, 0, moved)

      return {
        ...day,
        exercises: updated.map((exercise, index) => ({ ...exercise, order: index + 1 })),
      }
    })
  }

  const handleLibraryDrop = (dayId: string, payload: { exercise: ExerciseLibraryItem }) => {
    addExerciseToDay(dayId, payload.exercise)
  }

  const handleAddExerciseRequest = () => {
    if (librarySearchRef.current) {
      librarySearchRef.current.focus()
      librarySearchRef.current.select()
      librarySearchRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }

  const weeks = useMemo(() => Array.from({ length: totalWeeks }, (_, index) => index + 1), [totalWeeks])
  const metaSummary = `${meta.daysPerWeek} days/week | ${totalWeeks} weeks`
  const progressionSummary = `${progressDefaults.workingSets}x${progressDefaults.workingRepRange} | ${progressDefaults.restTimeSeconds}s rest | ${meta.progressionType}`

  const buildPayload = () => ({
    name: meta.name.trim(),
    description: meta.description.trim() || undefined,
    gender: meta.gender,
    experienceLevel: meta.experienceLevel,
    daysPerWeek: meta.daysPerWeek,
    totalWeeks,
    deloadWeek: totalWeeks,
    progressionType: meta.progressionType,
    isActive: meta.isActive,
    days: days.map((day) => ({
      dayNumber: day.dayNumber,
      dayName: day.dayName,
      exercises: day.exercises.map((exercise) => {
        const useGlobal = exercise.useGlobalProgression
        const workingSets = useGlobal ? progressDefaults.workingSets : exercise.workingSets
        const workingRepRange = useGlobal ? progressDefaults.workingRepRange : exercise.workingRepRange
        const deloadSets = useGlobal ? progressDefaults.deloadSets : exercise.deloadSets
        const deloadRepRange = useGlobal ? progressDefaults.deloadRepRange : exercise.deloadRepRange
        const autoEnabled = useGlobal ? progressDefaults.autoProgressionEnabled : exercise.autoProgressionEnabled
        const progressionMode = useGlobal ? progressDefaults.progressionMode : exercise.progressionMode
        const tier = useGlobal ? progressDefaults.tier : exercise.tier

        const progressionTemplate = weeks.reduce<Record<string, { sets: number; repRange: string; intensity: string }>>(
          (acc, week) => {
            const isDeload = week === totalWeeks
            acc[`week${week}`] = {
              sets: isDeload ? deloadSets : workingSets,
              repRange: isDeload ? deloadRepRange : workingRepRange,
              intensity: isDeload ? "deload" : "working",
            }
            return acc
          },
          {},
        )

        return {
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName,
          category: exercise.category,
          restTimeSeconds: exercise.restTimeSeconds,
          order: exercise.order,
          progressionConfig: {
            progressionTemplate,
            autoProgression: {
              enabled: autoEnabled,
              progressionType: progressionMode,
              rules: {
                if_all_sets_completed: "increase_weight_5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            tier,
          },
        }
      }),
    })),
  })

  const formHasErrors = summaryMessages.length > 0

  async function publishTemplate() {
    if (formHasErrors) {
      toast({
        title: "Please fix the highlighted fields",
        description: "Resolve validation errors before publishing the template.",
        variant: "destructive",
      })
      return
    }

    if (!accessToken) {
      toast({
        title: "Authentication required",
        description: "Sign in to manage templates.",
        variant: "destructive",
      })
      return
    }

    setPublishSuccess(null)
    setIsPublishing(true)
    try {
      const payload = buildPayload()
      const isEditing = Boolean(editingTemplateId)
      const endpoint = isEditing ? `/api/admin/templates/${editingTemplateId}` : "/api/admin/templates"
      const response = await fetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      })

      const responseText = await response.text()
      if (!response.ok) {
        throw new Error(responseText || "Publishing failed with an unknown error.")
      }

      let data: { id?: string | number } | null = null
      if (responseText) {
        try {
          data = JSON.parse(responseText) as { id?: string | number }
        } catch (parseError) {
          console.warn("[TemplateBuilder] publish response was not JSON", parseError)
        }
      }

      programTemplateService.clearCache()

      const templateName = meta.name.trim() || "Untitled template"
      const publishedId = data?.id ?? editingTemplateId ?? undefined
      setPublishSuccess({
        id: publishedId,
        name: templateName,
        timestamp: Date.now(),
        action: isEditing ? "updated" : "created",
      })

      toast({
        title: isEditing ? "Template updated" : "Template published",
        description: publishedId
          ? `Template ${isEditing ? "updated" : "created"} successfully (ID: ${publishedId}).`
          : `Template ${isEditing ? "updated" : "created"} successfully.`,
      })

      await loadTemplates(templateSearch ? templateSearch : undefined)

      if (isEditing) {
        if (publishedId) {
          void loadTemplateDetail(String(publishedId))
        }
      } else {
        initializeNewTemplate()
      }
    } catch (error) {
      console.error("[TemplateBuilder] publish failed", error)
      setPublishSuccess(null)
      toast({
        title: "Unable to publish template",
        description:
          error instanceof Error ? error.message : "Review the validation messages and try again.",
        variant: "destructive",
      })
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Template Builder</h1>
          <p className="text-sm text-muted-foreground">
            Create admin-only program templates by dragging exercises into your schedule.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TemplatePreviewDialog meta={meta} days={days} globalProgress={progressDefaults} totalWeeks={totalWeeks} />
          <Button onClick={publishTemplate} disabled={formHasErrors || isPublishing}>
            {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderPlus className="mr-2 h-4 w-4" />}
            {editingTemplateId ? "Save Changes" : "Publish Template"}
          </Button>
        </div>
      </div>

      {publishSuccess && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>
            {publishSuccess.action === "updated" ? "Template updated" : "Template published"}
          </AlertTitle>
          <AlertDescription>
            {publishSuccess.action === "updated"
              ? `Updates to "${publishSuccess.name}" are live.`
              : `"${publishSuccess.name}" is live.`}
            {publishSuccess.id ? ` ID: ${publishSuccess.id}` : ""}
          </AlertDescription>
        </Alert>
      )}

      {formHasErrors && (
        <Alert variant="destructive">
          <AlertTitle>Validation required</AlertTitle>
          <AlertDescription>
            <ul className="list-inside list-disc space-y-1">
              {summaryMessages.map((message, index) => (
                <li key={index}>{message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {templateError && (
        <Alert variant="destructive">
          <AlertTitle>Template error</AlertTitle>
          <AlertDescription>{templateError}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-1 flex-col gap-4 lg:grid lg:grid-cols-[minmax(18rem,2.5fr)_minmax(0,7.5fr)] lg:gap-4">
        <aside className="order-1 flex flex-col lg:order-1">
          <Card className="h-full">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Templates</CardTitle>
                <Button size="sm" variant="outline" onClick={handleCreateNewTemplate}>
                  New Template
                </Button>
              </div>
              <Input
                value={templateSearch}
                onChange={(event) => setTemplateSearch(event.target.value)}
                placeholder="Search templates"
              />
            </CardHeader>
            <CardContent className="flex h-full flex-col gap-3">
              {isLoadingTemplates ? (
                <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading templates...
                </div>
              ) : templates.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
                  <p>No templates found.</p>
                  <p>Click “New Template” to start from scratch.</p>
                </div>
              ) : (
                <ScrollArea className="h-[28rem] rounded-md border border-border/40">
                  <div className="divide-y divide-border/40">
                    {templates.map((template) => {
                      const isSelected = selectedTemplateId === template.id
                      return (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => handleSelectTemplate(template.id)}
                          className={cn(
                            "flex w-full flex-col gap-1 px-4 py-3 text-left transition",
                            isSelected ? "bg-muted/60 text-foreground" : "hover:bg-muted/40",
                          )}
                        >
                          <span className="text-sm font-semibold leading-tight">{template.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {template.daysPerWeek} days · {template.totalWeeks} weeks
                          </span>
                          {!template.isActive && (
                            <span className="text-xs font-medium text-amber-600">Inactive</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </aside>

        <div className="order-2 flex flex-1 flex-col gap-4">
          {editingTemplateId && (
            <div className="rounded-md border border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
              Editing template: {meta.name.trim() || "Untitled template"}
            </div>
          )}
          {isLoadingTemplateDetail && (
            <Alert className="border-border/60 bg-background/60">
              <AlertDescription className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading template details...
              </AlertDescription>
            </Alert>
          )}
          <div className="flex flex-1 flex-col gap-4 lg:grid lg:grid-cols-[minmax(16rem,2fr)_minmax(24rem,5fr)_minmax(18rem,3fr)] lg:gap-4">
            <aside className="order-2 flex h-full flex-col rounded-xl border border-border/60 bg-background/60 lg:order-1">
              <Tabs
                value={sidebarTab}
                onValueChange={(value) => setSidebarTab(value as typeof sidebarTab)}
                className="flex h-full flex-col"
              >
                <div className="border-b border-border/60 px-4 py-3">
                  <h2 className="text-sm font-semibold text-foreground">Program Controls</h2>
                  <p className="text-xs text-muted-foreground">Tune settings, defaults, and overview.</p>
                </div>
                <TabsList className="grid h-auto gap-2 bg-transparent px-4 pt-4 pb-2 sm:grid-cols-2 lg:flex lg:flex-col">
                  <TabsTrigger
                    value="settings"
                    className="flex flex-col items-start gap-1 rounded-lg border border-transparent bg-transparent px-3 py-2 text-left text-xs font-medium transition data-[state=active]:border-primary data-[state=active]:bg-muted/40"
                  >
                    <span className="text-sm font-semibold">Settings</span>
                    <span className="max-w-[14rem] truncate text-xs text-muted-foreground">{metaSummary}</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="progression"
                    className="flex flex-col items-start gap-1 rounded-lg border border-transparent bg-transparent px-3 py-2 text-left text-xs font-medium transition data-[state=active]:border-primary data-[state=active]:bg-muted/40"
                  >
                    <span className="text-sm font-semibold">Progression</span>
                    <span className="max-w-[14rem] truncate text-xs text-muted-foreground">{progressionSummary}</span>
                  </TabsTrigger>
                </TabsList>
                <div className="flex-1 overflow-hidden">
                  <TabsContent value="settings" className="h-full data-[state=inactive]:hidden">
                    <ScrollArea className="h-full px-4 pb-4 pr-6">
                      <div className="space-y-4 pb-2">
                        <MetaPanel
                          meta={meta}
                          onMetaChange={handleMetaChange}
                          onToggleOption={handleToggleOption}
                          fieldErrors={validation.fieldErrors}
                        />
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="progression" className="h-full data-[state=inactive]:hidden">
                    <ScrollArea className="h-full px-4 pb-4 pr-6">
                      <div className="space-y-4 pb-2">
                        <ProgressionPanel
                          meta={meta}
                          onMetaChange={handleMetaChange}
                          defaults={progressDefaults}
                          onDefaultsChange={setProgressDefaults}
                          fieldErrors={validation.fieldErrors}
                        />
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </div>
              </Tabs>
            </aside>

            <section className="order-1 flex min-h-[24rem] flex-col lg:order-2">
              <div className="space-y-4">
                <ProgramSummaryPanel
                  meta={meta}
                  onMetaChange={handleMetaChange}
                  fieldErrors={validation.fieldErrors}
                />
                <SchedulePanel
                  activeDayId={activeDay?.id ?? ""}
                  onActiveDayChange={setActiveDayId}
                  days={days}
                  onAddDay={addDay}
                  onDuplicateDay={duplicateDay}
                  onRemoveDay={removeDay}
                  onUpdateDay={updateDay}
                  onUpdateExercise={updateExercise}
                  onRemoveExercise={removeExercise}
                  onReorderExercise={reorderExercise}
                  onLibraryDrop={handleLibraryDrop}
                  fieldErrors={validation.fieldErrors}
                  onAddExerciseRequest={handleAddExerciseRequest}
                />
              </div>
            </section>

            <aside className="order-3 flex h-full flex-col lg:order-3">
              <ExerciseLibraryPanel
                filters={filters}
                onFiltersChange={setFilters}
                exercises={library}
                isLoading={isLoadingExercises}
                error={exerciseError}
                activeDayName={activeDay?.dayName ?? "Day"}
                searchInputRef={librarySearchRef}
                listHeightClassName={LIBRARY_SCROLL_HEIGHT}
              />
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
