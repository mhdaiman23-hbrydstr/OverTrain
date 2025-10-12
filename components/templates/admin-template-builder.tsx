"use client"

import { useEffect, useMemo, useState } from "react"
import { Filter, FolderPlus, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { programTemplateService } from "@/lib/services/program-template-service"
import { useDebounce } from "@/hooks/use-debounce"
import {
  BuilderDay,
  ExerciseLibraryItem,
  GlobalProgressionDefaults,
  ProgramMeta,
  GenderOption,
  ExperienceOption,
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

const LAYOUT_HEIGHT = "h-[calc(100vh-200px)]"

export function AdminTemplateBuilder() {
  const [meta, setMeta] = useState<ProgramMeta>(DEFAULT_META)
  const [progressDefaults, setProgressDefaults] = useState<GlobalProgressionDefaults>(DEFAULT_PROGRESS)
  const [days, setDays] = useState<BuilderDay[]>([
    { id: uniqueId(), dayNumber: 1, dayName: "Day 1", exercises: [] },
  ])
  const [activeDayId, setActiveDayId] = useState<string>(days[0]?.id ?? "")
  const [showLibrary, setShowLibrary] = useState(true)
  const [filters, setFilters] = useState<LibraryFilters>({ search: "", muscleGroup: "", equipment: "" })
  const [library, setLibrary] = useState<ExerciseLibraryItem[]>([])
  const [exerciseError, setExerciseError] = useState<string | null>(null)
  const [isLoadingExercises, setIsLoadingExercises] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const debouncedFilters = useDebounce(filters, 300)
  const { toast } = useToast()

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
        if (debouncedFilters.muscleGroup) params.append("muscleGroup", debouncedFilters.muscleGroup)
        if (debouncedFilters.equipment) params.append("equipment", debouncedFilters.equipment)

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
    if (!days.length) {
      const fallback = { id: uniqueId(), dayNumber: 1, dayName: "Day 1", exercises: [] }
      setDays([fallback])
      setActiveDayId(fallback.id)
    }
  }, [days])

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
    const nextNumber = days.length + 1
    const newDay: BuilderDay = { id: uniqueId(), dayNumber: nextNumber, dayName: `Day ${nextNumber}`, exercises: [] }
    setDays((prev) => [...prev, newDay])
    setActiveDayId(newDay.id)
  }

  const duplicateDay = (id: string) => {
    const original = days.find((day) => day.id === id)
    if (!original) return

    const nextNumber = days.length + 1
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

    setDays((prev) => [...prev, clone])
    setActiveDayId(clone.id)
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

    setDays((prev) =>
      prev
        .filter((day) => day.id !== id)
        .map((day, index) => ({ ...day, dayNumber: index + 1 })),
    )

    if (id === activeDayId) {
      const fallback = days.find((day) => day.id !== id)
      if (fallback) setActiveDayId(fallback.id)
    }
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

  const weeks = useMemo(() => Array.from({ length: totalWeeks }, (_, index) => index + 1), [totalWeeks])

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

    setIsPublishing(true)
    try {
      const response = await fetch("/api/admin/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(buildPayload()),
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }

      const data = await response.json()
      programTemplateService.clearCache()
      toast({
        title: "Template published",
        description: `Template created successfully (ID: ${data.id}).`,
      })
    } catch (error) {
      console.error("[TemplateBuilder] publish failed", error)
      toast({
        title: "Unable to publish template",
        description: "Review the validation messages and try again.",
        variant: "destructive",
      })
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Template Builder</h1>
          <p className="text-sm text-muted-foreground">
            Create admin-only program templates by dragging exercises into your schedule.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setShowLibrary((prev) => !prev)}>
            <Filter className="mr-2 h-4 w-4" />
            {showLibrary ? "Hide Library" : "Show Library"}
          </Button>
          <TemplatePreviewDialog meta={meta} days={days} globalProgress={progressDefaults} totalWeeks={totalWeeks} />
          <Button onClick={publishTemplate} disabled={formHasErrors || isPublishing}>
            {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderPlus className="mr-2 h-4 w-4" />}
            Publish Template
          </Button>
        </div>
      </div>

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

      <div className="flex-1 gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
        <div className="space-y-4 pr-1 lg:pr-4">
          <ProgramSummaryPanel meta={meta} onMetaChange={handleMetaChange} fieldErrors={validation.fieldErrors} />
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
          />
          <ScrollArea className={`${LAYOUT_HEIGHT} mb-6 lg:mb-0`}>
            <div className="space-y-4 pb-4">
              <MetaPanel meta={meta} onMetaChange={handleMetaChange} onToggleOption={handleToggleOption} fieldErrors={validation.fieldErrors} />
              <ProgressionPanel
                meta={meta}
                onMetaChange={handleMetaChange}
                defaults={progressDefaults}
                onDefaultsChange={setProgressDefaults}
                fieldErrors={validation.fieldErrors}
              />
            </div>
          </ScrollArea>
        </div>

        {showLibrary && (
          <ExerciseLibraryPanel
            filters={filters}
            onFiltersChange={setFilters}
            exercises={library}
            isLoading={isLoadingExercises}
            error={exerciseError}
            activeDayName={activeDay?.dayName ?? "Day"}
            listHeightClassName={LAYOUT_HEIGHT}
          />
        )}
      </div>
    </div>
  )
}
