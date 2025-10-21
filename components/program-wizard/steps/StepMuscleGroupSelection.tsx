import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { DayInWizard, MuscleGroupSelection } from '../types'
import { MuscleGroupPicker } from '../components/MuscleGroupPicker'

interface StepMuscleGroupSelectionProps {
  days: DayInWizard[]
  onUpdateDay: (dayIndex: number, groups: MuscleGroupSelection[]) => void
  onNext: () => void
  onBack: () => void
}

export function StepMuscleGroupSelection({ days, onUpdateDay, onNext, onBack }: StepMuscleGroupSelectionProps) {
  const [pickerDayIndex, setPickerDayIndex] = useState<number | null>(null)

  const handleOpenPicker = (index: number) => {
    setPickerDayIndex(index)
  }

  const handleClosePicker = () => {
    setPickerDayIndex(null)
  }

  const activeDayGroups = pickerDayIndex !== null ? (days[pickerDayIndex]?.muscleGroups ?? []) : []
  const allDaysConfigured = days.every(day => (day.muscleGroups?.length ?? 0) > 0)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Select muscle groups for each day</h2>
        <p className="text-sm text-muted-foreground">
          Assign how many exercises you want for each muscle group. This helps the next step recommend exercises.
        </p>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {days.map((day, index) => (
          <div key={day.dayNumber} className="rounded-lg border border-border/60 bg-card px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm sm:text-base font-semibold truncate">{day.dayName}</h3>
                <p className="text-xs text-muted-foreground">
                  {day.muscleGroups && day.muscleGroups.length > 0
                    ? 'Selected muscle groups shown below.'
                    : 'No muscle groups selected yet.'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleOpenPicker(index)} className="text-xs px-2 py-1 h-auto sm:text-sm sm:px-3 sm:py-2 sm:h-8">
                {day.muscleGroups && day.muscleGroups.length > 0 ? (
                  <>
                    <span className="hidden sm:inline">Edit selection</span>
                    <span className="sm:hidden">Edit</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Add muscle groups</span>
                    <span className="sm:hidden">Add groups</span>
                  </>
                )}
              </Button>
            </div>

            {day.muscleGroups && day.muscleGroups.length > 0 && (
              <div className="mt-2 sm:mt-3 flex flex-wrap gap-1 sm:gap-2">
                {day.muscleGroups.map(group => (
                  <Badge key={`${group.category}:${group.group}`} variant="secondary" className="text-xs">
                    {group.group} × {group.count}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!allDaysConfigured}>
          Continue
        </Button>
      </div>

      <MuscleGroupPicker
        open={pickerDayIndex !== null}
        onOpenChange={open => {
          if (!open) {
            handleClosePicker()
          }
        }}
        selection={activeDayGroups}
        onSave={groups => {
          if (pickerDayIndex !== null) {
            onUpdateDay(pickerDayIndex, groups)
          }
        }}
      />
    </div>
  )
}
