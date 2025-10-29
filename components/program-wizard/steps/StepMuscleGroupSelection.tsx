import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { BottomActionBar } from '@/components/ui/bottom-action-bar'
import { DetailCard } from '@/components/ui/detail-card'
import type { DayInWizard, MuscleGroupSelection } from '../types'
import { MuscleGroupPicker } from '../components/MuscleGroupPicker'
import { getMuscleGroupBadgeClass, getMuscleGroupLabel } from '@/lib/exercise-muscle-groups'
import { cn } from '@/lib/utils'

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
          <DetailCard
            key={day.dayNumber}
            title={day.dayName}
            description={
              day.muscleGroups && day.muscleGroups.length > 0
                ? 'Selected muscle groups shown below.'
                : 'No muscle groups selected yet.'
            }
            size="md"
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenPicker(index)}
              >
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
            }
          >
            {day.muscleGroups && day.muscleGroups.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {day.muscleGroups.map(group => (
                  <span
                    key={`${group.category}:${group.group}`}
                    className={cn(
                      'rounded border px-2 py-1 text-sm font-medium',
                      getMuscleGroupBadgeClass(group.group),
                    )}
                  >
                    {getMuscleGroupLabel(group.group)} × {group.count}
                  </span>
                ))}
              </div>
            )}
          </DetailCard>
        ))}
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

      <BottomActionBar
        leftContent={
          <Button variant="ghost" onClick={onBack} className="w-full">
            Back
          </Button>
        }
        rightContent={
          <Button
            className="w-full gradient-primary text-primary-foreground h-auto py-2 px-4 text-center"
            onClick={onNext}
            disabled={!allDaysConfigured}
          >
            Continue
          </Button>
        }
        showFixed={false}
      />
    </div>
  )
}
