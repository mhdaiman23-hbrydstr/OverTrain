'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'
import { programForkService } from '@/lib/services/program-fork-service'
import { programTemplateService } from '@/lib/services/program-template-service'
import { ProgramStateManager } from '@/lib/program-state'
import type { Exercise } from '@/lib/services/exercise-library-service'
import { WizardStepper } from './components/WizardStepper'
import { ExitConfirmation } from './components/ConfirmationDialogs'
import { StepSourceSelection } from './steps/StepSourceSelection'
import { StepDayCount } from './steps/StepDayCount'
import { StepTemplateSelection } from './steps/StepTemplateSelection'
import { StepMuscleGroupSelection } from './steps/StepMuscleGroupSelection'
import { StepExerciseAssignment } from './steps/StepExerciseAssignment'
import { StepDayBuilder } from './steps/StepDayBuilder'
import { StepFinalize } from './steps/StepFinalize'
import { useWizardState } from './hooks/useWizardState'
import { useExerciseCache } from './hooks/useExerciseCache'
import { useTemplateCache } from './hooks/useTemplateCache'
import {
  convertTemplateToWizardDays,
  generateProgressionConfig,
  generateTempId,
  inferExerciseCategory,
  validateWizardState,
} from './utils'
import type { ExerciseInWizard, ProgramSource, WizardStep } from './types'

interface ProgramWizardProps {
  onClose: () => void
  onComplete: (templateId: string) => void
  initialStep?: WizardStep
  onStepChange?: (step: WizardStep) => void
}

const wizardOrder: WizardStep[] = [
  'source',
  'dayCount',
  'templateSelect',
  'muscleGroupSelect',
  'exerciseAssign',
  'dayBuilder',
  'finalize',
]

const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function ProgramWizard({ onClose, onComplete, initialStep, onStepChange }: ProgramWizardProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const {
    state,
    isDirty,
    setSource,
    setStep,
    setDayCount,
    setSelectedTemplateId,
    setMetadata,
    replaceDays,
    setDayMuscleGroups,
    setDayExercises,
    addExerciseToDay,
    updateExerciseOrder,
    removeExerciseFromDay,
    updateDayName,
    addDay,
    removeDay,
    setLoading,
    setError,
    reset,
    markSaved,
  } = useWizardState()

  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)

  const [initialized, setInitialized] = useState(false)
  const lastInitialStepRef = useRef<WizardStep | undefined>(undefined)

  const exerciseCache = useExerciseCache({ enabled: true })
  const templateCache = useTemplateCache({ enabled: state.source === 'template' })
  const {
    refresh: refreshTemplates,
    hasLoaded: templateCacheLoaded,
    isLoading: templateCacheLoading,
  } = templateCache

  const currentStep = state.step

  useEffect(() => {
    reset()
    setValidationErrors([])
    setIsSaving(false)
    setInitialized(true)

    return () => {
      reset()
      setValidationErrors([])
      setIsSaving(false)
      setInitialized(false)
    }
  }, [reset])

  useEffect(() => {
    if (!initialized) return

    if (!initialStep) {
      lastInitialStepRef.current = undefined
      return
    }

    if (!wizardOrder.includes(initialStep)) return

    if (lastInitialStepRef.current === initialStep) {
      return
    }

    lastInitialStepRef.current = initialStep

    if (state.step !== initialStep) {
      setStep(initialStep)
    }
  }, [initialStep, initialized, setStep, state.step])

  useEffect(() => {
    if (!initialized) return
    onStepChange?.(currentStep)
  }, [currentStep, initialized, onStepChange])

  useEffect(() => {
    if (!initialized) return
    if (state.source !== 'template') return
    if (currentStep !== 'templateSelect') return
    if (templateCacheLoaded || templateCacheLoading) return

    void refreshTemplates()
  }, [
    initialized,
    state.source,
    currentStep,
    templateCacheLoaded,
    templateCacheLoading,
    refreshTemplates,
  ])

  const attemptClose = () => {
    if (isSaving) return
    if (isDirty && state.step !== 'source') {
      setExitConfirmOpen(true)
      return
    }
    handleClose()
  }

  const handleClose = () => {
    reset()
    setValidationErrors([])
    setIsSaving(false)
    onClose()
  }

  const handleSelectSource = (source: Exclude<ProgramSource, null>) => {
    setSource(source)
    // Pre-load templates if creating from template to avoid waiting on template selection step
    if (source === 'template') {
      void templateCache.refresh()
    }
    setStep('dayCount')
  }

  const goToStep = (nextStep: WizardStep) => {
    setStep(nextStep)
  }

  const handleSelectWeekCount = (weeks: number) => {
    const nextDeloadWeek =
      state.metadata.deloadWeek > 0 ? Math.min(state.metadata.deloadWeek, weeks) : weeks

    setMetadata({
      weeks,
      deloadWeek: nextDeloadWeek,
    })
  }

  const handleDayCountContinue = () => {
    if (state.source === 'template') {
      setStep('templateSelect')
    } else {
      setStep('muscleGroupSelect')
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId)
    setError(null)
  }

  const handleTemplateContinue = async () => {
    if (!state.selectedTemplateId) return
    try {
      setLoading(true)
      setError(null)
      const template = await templateCache.loadFullTemplate(state.selectedTemplateId)
      const wizardDays = convertTemplateToWizardDays(template)
      replaceDays(wizardDays)
      setDayCount(wizardDays.length)
      setMetadata({
        name: `${template.name} (Custom)`,
        weeks: template.total_weeks ?? template.weeks ?? state.metadata.weeks,
        deloadWeek: template.deload_week ?? template.total_weeks ?? state.metadata.deloadWeek,
        gender: Array.isArray(template.gender) ? template.gender : state.metadata.gender,
        experience: Array.isArray(template.experience_level ?? template.experience)
          ? (template.experience_level ?? template.experience)
          : state.metadata.experience,
      })
      setStep('dayBuilder')
    } catch (error) {
      console.error('[ProgramWizard] Failed to load template', error)
      const message = error instanceof Error ? error.message : 'Failed to load template. Please try again.'
      setError(message)
      toast({
        title: 'Failed to load template',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const randomizeDay = (dayIndex: number) => {
    const day = state.days[dayIndex]
    if (!day) return

    // Prefer explicit muscle group selections when present; otherwise
    // derive a fallback distribution from the current exercises so
    // templates (which often lack selections) can still randomize.
    const selections = (day.muscleGroups && day.muscleGroups.length > 0)
      ? day.muscleGroups
      : (() => {
          const counts = new Map<string, number>()
          day.exercises.forEach(ex => {
            const key = ex.muscleGroup?.toLowerCase?.() || ''
            if (!key) return
            counts.set(key, (counts.get(key) || 0) + 1)
          })
          return Array.from(counts.entries()).map(([groupLower, count]) => ({
            category: 'accessories' as const,
            group: groupLower.replace(/\b\w/g, c => c.toUpperCase()),
            count,
          }))
        })()

    if (selections.length === 0) return

    const newExercises: ExerciseInWizard[] = []
    selections.forEach(selection => {
      const pool = exerciseCache.exercises.filter(
        exercise => exercise.muscleGroup.toLowerCase() === selection.group.toLowerCase(),
      )
      
      // If no exercises found for this muscle group, keep existing exercises for this group
      if (pool.length === 0) {
        console.warn(`[ProgramWizard] No exercises found for muscle group: ${selection.group}`)
        const existingInGroup = day.exercises.filter(ex => 
          ex.muscleGroup?.toLowerCase() === selection.group.toLowerCase()
        )
        existingInGroup.forEach(exercise => {
          newExercises.push({
            ...exercise,
            order: newExercises.length,
          })
        })
        return
      }
      
      const chosen = shuffle(pool).slice(0, selection.count)
      chosen.forEach(exercise => {
        newExercises.push({
          tempId: generateTempId(),
          exerciseLibraryId: exercise.id,
          exerciseName: exercise.name,
          muscleGroup: exercise.muscleGroup,
          equipmentType: exercise.equipmentType,
          order: newExercises.length,
          category: inferExerciseCategory(exercise.name, exercise.muscleGroup),
          restTime: 90,
        })
      })
    })

    // Ensure we don't end up with an empty exercise list
    if (newExercises.length === 0) {
      console.warn('[ProgramWizard] Randomize resulted in no exercises, keeping original exercises')
      return // Don't update if we'd end up with no exercises
    }

    // If we have fewer exercises than before, log a warning but still proceed
    if (newExercises.length < day.exercises.length) {
      console.warn(`[ProgramWizard] Randomize reduced exercises from ${day.exercises.length} to ${newExercises.length}`)
    }

    setDayExercises(dayIndex, newExercises)
  }

  const handleAddExercise = (dayIndex: number, exercise: Exercise) => {
    addExerciseToDay(dayIndex, {
      exerciseLibraryId: exercise.id,
      exerciseName: exercise.name,
      muscleGroup: exercise.muscleGroup,
      equipmentType: exercise.equipmentType,
      category: inferExerciseCategory(exercise.name, exercise.muscleGroup),
      restTime: 90,
    })
  }

  const handleReplaceExercise = (dayIndex: number, tempId: string, exercise: Exercise) => {
    const day = state.days[dayIndex]
    if (!day) return

    const updatedExercises = day.exercises.map(existing => {
      if (existing.tempId !== tempId) return existing

      return {
        ...existing,
        exerciseLibraryId: exercise.id,
        exerciseName: exercise.name,
        muscleGroup: exercise.muscleGroup,
        equipmentType: exercise.equipmentType,
        category: inferExerciseCategory(exercise.name, exercise.muscleGroup),
        restTime: existing.restTime ?? 90,
      }
    })

    setDayExercises(dayIndex, updatedExercises)
  }

  const handleFinalizeSave = async () => {
    const { isValid, errors } = validateWizardState({
      ...state,
      metadata: {
        ...state.metadata,
        name: state.metadata.name.trim(),
      },
    })
    setValidationErrors(errors)
    if (!isValid) {
      toast({
        title: 'Incomplete configuration',
        description: 'Fix the highlighted issues before saving your program.',
        variant: 'destructive',
      })
      return
    }

    if (!user?.id) {
      toast({
        title: 'Authentication required',
        description: 'Sign in to save custom programs.',
        variant: 'destructive',
      })
      return
    }

    if (!supabase) {
      toast({
        title: 'Supabase unavailable',
        description: 'Database client not configured. Check environment settings.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    setLoading(true)
    try {
      const userId = user.id
      let templateId: string
      if (state.source === 'scratch') {
        templateId = await programForkService.createBlankProgram(
          userId, 
          state.metadata.name,
          state.metadata.weeks,
          state.metadata.deloadWeek
        )
      } else {
        if (!state.selectedTemplateId) {
          throw new Error('Template not selected.')
        }
        templateId = await programForkService.forkTemplateToMyProgram(state.selectedTemplateId, userId, {
          nameOverride: state.metadata.name,
        })
      }

      // Clear existing days/exercises and recreate
      const { data: existingDays, error: fetchDayError } = await supabase
        .from('program_template_days')
        .select('id')
        .eq('program_template_id', templateId)

      if (fetchDayError) throw fetchDayError

      const existingDayIds = existingDays?.map(day => day.id) ?? []

      if (existingDayIds.length > 0) {
        const { error: deleteExercisesError } = await supabase
          .from('program_template_exercises')
          .delete()
          .in('template_day_id', existingDayIds)
        if (deleteExercisesError) throw deleteExercisesError
      }

      const { error: deleteDaysError } = await supabase
        .from('program_template_days')
        .delete()
        .eq('program_template_id', templateId)
      if (deleteDaysError) throw deleteDaysError

      // Update template metadata
      await programTemplateService.updateTemplate(templateId, {
        days_per_week: state.days.length,
        total_weeks: state.metadata.weeks,
        deload_week: state.metadata.deloadWeek,
        gender: state.metadata.gender,
        experience_level: state.metadata.experience,
        is_public: state.metadata.isPublic,
        owner_user_id: userId,
        updated_at: new Date().toISOString(),
      })

      const dayInserts = state.days.map(day => ({
        program_template_id: templateId,
        day_number: day.dayNumber,
        day_name: day.dayName,
      }))

      const { data: insertedDays, error: insertDayError } = await supabase
        .from('program_template_days')
        .insert(dayInserts)
        .select('id, day_number')

      if (insertDayError) throw insertDayError
      if (!insertedDays) throw new Error('Failed to create program days.')

      const dayIdMap = new Map<number, string>()
      insertedDays.forEach(day => {
        dayIdMap.set(day.day_number, day.id)
      })

      const exercisePayload = state.days.flatMap(day => {
        const dayId = dayIdMap.get(day.dayNumber)
        if (!dayId) return []

        // Sort exercises by current order and normalize to sequential 1-based indexing
        const sortedExercises = [...day.exercises]
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((exercise, index) => ({
            ...exercise,
            normalizedOrder: index + 1 // Ensure 1-based sequential ordering
          }))

        console.log('[ProgramWizard] Day', day.dayNumber, 'exercises:', sortedExercises.map(ex => ({
          name: ex.exerciseName,
          originalOrder: ex.order,
          normalizedOrder: ex.normalizedOrder
        })))

        return sortedExercises.map(exercise => ({
          template_day_id: dayId,
          exercise_id: exercise.exerciseLibraryId,
          exercise_order: exercise.normalizedOrder,
          category: exercise.category,
          rest_time_seconds: exercise.restTime,
          progression_config: generateProgressionConfig(exercise, state.metadata.weeks),
        }))
      })

      if (exercisePayload.length > 0) {
        const { error: insertExercisesError } = await supabase
          .from('program_template_exercises')
          .insert(exercisePayload)
        if (insertExercisesError) throw insertExercisesError
      }

      programTemplateService.clearCache()
      await ProgramStateManager.getMyPrograms()
      window.dispatchEvent(new Event('programChanged'))

      markSaved()
      toast({
        title: 'Program saved',
        description: 'Your custom program is ready in My Programs.',
      })
      onComplete(templateId)
      handleClose()
    } catch (error) {
      console.error('[ProgramWizard] Save failed:', error)
      let message = 'Failed to save program. Please try again.'

      if (error instanceof Error) {
        message = error.message
      } else if (typeof error === 'object' && error !== null) {
        // Handle Supabase errors and other objects
        message = (error as any).message || (error as any).details || JSON.stringify(error)
      }

      toast({
        title: 'Save failed',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
      setLoading(false)
    }
  }

  const currentContent = useMemo(() => {
    switch (currentStep) {
      case 'source':
        return <StepSourceSelection onSelect={handleSelectSource} />
      case 'dayCount':
        return (
          <StepDayCount
            key={`dayCount-${state.metadata.weeks}-${state.dayCount}`}
            selectedWeekCount={state.metadata.weeks}
            selectedDayCount={state.dayCount}
            onSelectWeek={handleSelectWeekCount}
            onSelectDay={count => setDayCount(count)}
            onNext={handleDayCountContinue}
            onBack={() => setStep('source')}
          />
        )
      case 'templateSelect':
        return (
          <StepTemplateSelection
            templates={templateCache.templates}
            loading={state.isLoading || templateCache.isLoading}
            error={state.error ?? templateCache.error}
            selectedTemplateId={state.selectedTemplateId}
            dayCount={state.dayCount}
            loadingTemplateIds={templateCache.loadingTemplateIds}
            onSelectTemplate={handleTemplateSelect}
            onBack={() => setStep('dayCount')}
            onNext={handleTemplateContinue}
            onRefresh={templateCache.refresh}
          />
        )
      case 'muscleGroupSelect':
        return (
          <StepMuscleGroupSelection
            days={state.days}
            onUpdateDay={(dayIndex, groups) => setDayMuscleGroups(dayIndex, groups)}
            onBack={() => setStep('dayCount')}
            onNext={() => setStep('exerciseAssign')}
          />
        )
      case 'exerciseAssign':
        return (
          <StepExerciseAssignment
            days={state.days}
            exercises={exerciseCache.exercises}
            isLoading={exerciseCache.isLoading}
            error={exerciseCache.error}
            onAddExercise={handleAddExercise}
            onRemoveExercise={removeExerciseFromDay}
            onRandomizeDay={randomizeDay}
            onReplaceExercise={handleReplaceExercise}
            onRenameDay={updateDayName}
            onRemoveDay={removeDay}
            onBack={() => setStep('muscleGroupSelect')}
            onNext={() => setStep('dayBuilder')}
          />
        )
      case 'dayBuilder':
        return (
          <StepDayBuilder
            days={state.days}
            onRenameDay={updateDayName}
            onRandomizeDay={randomizeDay}
            onRemoveDay={removeDay}
            onRemoveExercise={removeExerciseFromDay}
            onReorderExercise={updateExerciseOrder}
            onAddDay={addDay}
            onAddExercise={handleAddExercise}
            exercises={exerciseCache.exercises}
            isExerciseLoading={exerciseCache.isLoading}
            exerciseError={exerciseCache.error}
            onReplaceExercise={handleReplaceExercise}
            onBack={() => {
              if (state.source === 'scratch') {
                setStep('exerciseAssign')
              } else {
                setStep('templateSelect')
              }
            }}
            onNext={() => setStep('finalize')}
          />
        )
      case 'finalize':
        return (
          <StepFinalize
            metadata={state.metadata}
            validationErrors={validationErrors}
            isSaving={isSaving}
            onUpdateMetadata={setMetadata}
            onBack={() => setStep('dayBuilder')}
            onSave={handleFinalizeSave}
          />
        )
      default:
        return null
    }
  }, [
    currentStep,
    state,
    templateCache,
    exerciseCache,
    setDayCount,
    setStep,
    setDayMuscleGroups,
    removeExerciseFromDay,
    randomizeDay,
    updateDayName,
    removeDay,
    updateExerciseOrder,
    addDay,
    handleAddExercise,
    handleReplaceExercise,
    setMetadata,
    validationErrors,
    isSaving,
  ])

  const showStepper = wizardOrder.indexOf(currentStep) >= 0 && currentStep !== 'source'

  return (
    <div className="min-h-[100svh] bg-background text-foreground relative">
      <div className="flex min-h-[100svh] flex-col">
        <header
          className="border-b border-border/60"
          style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
        >
          <div className="mx-auto flex w-full max-w-3xl items-start justify-between gap-4 px-6 py-5 sm:px-10 sm:py-6">
            <div>
              <h1 className="text-lg font-semibold">Custom Program Builder</h1>
              <p className="text-xs text-muted-foreground">
                Build your ideal custom training plan based of our existing templates.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 sm:size-10"
              onClick={attemptClose}
              aria-label="Close wizard"
            >
              <X className="size-4" />
            </Button>
          </div>
        </header>

        {showStepper && (
          <div
            className="border-b border-border/60"
            style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
          >
            <div className="mx-auto w-full max-w-3xl px-6 py-3 sm:px-10 sm:py-4">
              <WizardStepper currentStep={currentStep} />
            </div>
          </div>
        )}

        {state.error && (
          <div className="mx-auto mt-4 w-full max-w-3xl px-6 sm:px-10">
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </div>
          </div>
        )}

        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto flex w-full max-w-3xl flex-col px-6 py-6 sm:px-10 sm:py-8">
            <div className="space-y-6">
              {state.isLoading && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Spinner className="size-4" />
                  Loading...
                </div>
              )}
              {currentContent}
            </div>
          </div>
        </main>
      </div>

      <ExitConfirmation
        open={exitConfirmOpen}
        onStay={() => setExitConfirmOpen(false)}
        onLeave={() => {
          setExitConfirmOpen(false)
          markSaved()
          handleClose()
        }}
      />
    </div>
  )
}
