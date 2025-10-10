"use client"

import { useEffect, useMemo, useState } from "react"
import { Filter, FolderPlus, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { programTemplateService } from "@/lib/services/program-template-service"
import {
  BuilderDay,
  ExerciseLibraryItem,
  GlobalProgressionDefaults,
  ProgramMeta,
  GenderOption,
  ExperienceOption,
} from "./types"
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
    const debounce = setTimeout(async () => {
      try {
        setExerciseError(null)
        setIsLoadingExercises(true)
        const params = new URLSearchParams()
        if (filters.search) params.append("search", filters.search)
        if (filters.muscleGroup) params.append("muscleGroup", filters.muscleGroup)
        if (filters.equipment) params.append("equipment", filters.equipment)

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
          setExerciseError("Unable to load exercises. Check your credentials or network connection.")
        }
      } finally {
        setIsLoadingExercises(false)
      }
    }, 250)

    return () => {
      controller.abort()
      clearTimeout(debounce)
    }
  }, [accessToken, filters])

  useEffect(() => {
    if (!days.length) {
      const fallback = { id: uniqueId(), dayNumber: 1, dayName: "Day 1", exercises: [] }
      setDays([fallback])
      setActiveDayId(fallback.id)
    }
  }, [days])

  const activeDay = days.find((day) => day.id === activeDayId) ?? days[0]

  const warnings = useMemo(() => {
    const issues: string[] = []
    if (!meta.name.trim()) {
      issues.push("Program name is required.")
    }
    if (days.length !== meta.daysPerWeek) {
      issues.push(`Days per week (${meta.daysPerWeek}) does not match the number of configured days (${days.length}).`)
    }
    if (days.some((day) => day.exercises.length === 0)) {
      issues.push("Each day should include at least one exercise.")
    }
    const missingDetails = days.some((day) =>
      day.exercises.some(
        (exercise) =>
          !exercise.exerciseId ||
          !exercise.exerciseName ||
          exercise.restTimeSeconds <= 0 ||
          (exercise.useGlobalProgression ? progressDefaults.workingSets : exercise.workingSets) <= 0
      )
    )
    if (missingDetails) {
      issues.push("Some exercises are missing sets, rest time, or identifiers.")
    }
    return issues
  }, [days, meta, progressDefaults])

  const handleMetaChange = <K extends keyof ProgramMeta>(key: K, value: ProgramMeta[K]) => {
    setMeta((prev) => ({ ...prev, [key]: value }))
  }

  const handleToggleOption = (key: "gender" | "experienceLevel", value: GenderOption | ExperienceOption) => {
    setMeta((prev) => {
      const next = prev[key].includes(value as never)
        ? prev[key].filter((item) => item !== value)
        : [...prev[key], value]
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
        .map((day, index) => ({ ...day, dayNumber: index + 1 }))
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

  const totalWeeks = meta.totalWeeks
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
            const deloadWeek = week === totalWeeks
            acc[`week${week}`] = {
              sets: deloadWeek ? deloadSets : workingSets,
              repRange: deloadWeek ? deloadRepRange : workingRepRange,
              intensity: deloadWeek ? "deload" : "working",
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

  async function publishTemplate() {
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
        description: "Review warnings and try again.",
        variant: "destructive",
      })
    } finally {
      setIsPublishing(false)
    }
  }

  const canPublish = warnings.length === 0 && days.every((day) => day.exercises.length > 0)

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
          <Button onClick={publishTemplate} disabled={!canPublish || isPublishing}>
            {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderPlus className="mr-2 h-4 w-4" />}
            Publish Template
          </Button>
        </div>
      </div>

      <div className="flex flex-1 gap-4">
        <div className={cn("flex-1 space-y-4", showLibrary ? "lg:w-[calc(100%-20rem)]" : "w-full")}>
          <MetaPanel meta={meta} onMetaChange={handleMetaChange} onToggleOption={handleToggleOption} />
          <ProgressionPanel
            meta={meta}
            onMetaChange={handleMetaChange}
            defaults={progressDefaults}
            onDefaultsChange={setProgressDefaults}
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
            onAddExercise={addExerciseToDay}
            onLibraryDrop={handleLibraryDrop}
            availableExercises={library}
          />
          {warnings.length > 0 && (
            <Alert variant="destructive">
              <AlertTitle>Warnings detected</AlertTitle>
              <AlertDescription>
                <ul className="list-inside list-disc space-y-1">
                  {warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {showLibrary && (
          <ExerciseLibraryPanel
            filters={filters}
            onFiltersChange={setFilters}
            exercises={library}
            isLoading={isLoadingExercises}
            error={exerciseError}
            activeDayName={activeDay?.dayName ?? "Day"}
            onAddExercise={(exercise) => activeDay && addExerciseToDay(activeDay.id, exercise)}
          />
        )}
      </div>
    </div>
  )
}
