import { useMemo, useState } from 'react'
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
  const daysWithoutGroups = useMemo(
    () =>
      days.reduce<number[]>((acc, day, index) => {
        if (!day.muscleGroups || day.muscleGroups.length === 0) {
          acc.push(index + 1)
        }
        return acc
      }, []),
    [days],
  )

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Select muscle groups for each day</h2>
        <p className="text-sm text-muted-foreground">
          Assign how many exercises you want for each muscle group. This helps the next step recommend exercises.
        </p>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {days.map((day, index) => {
          const hasGroups = (day.muscleGroups?.length ?? 0) > 0
          return (
            <DetailCard
              key={day.dayNumber}
              title={day.dayName}
              description={
                hasGroups
                  ? 'Selected muscle groups shown below.'
                  : 'No muscle groups planned yet — exercises can still be added manually later.'
              }
              size="md"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenPicker(index)}
                >
                  {hasGroups ? (
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
              {hasGroups ? (
                <div className="flex flex-wrap gap-2">
                  {day.muscleGroups?.map(group => (
                    <span
                      key={`${group.category}:${group.group}`}
                      className={cn(
                        'rounded border px-2 py-1 text-sm font-medium',
                        getMuscleGroupBadgeClass(group.group),
                      )}
                    >
                      {getMuscleGroupLabel(group.group)} • {group.count}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="rounded border border-dashed border-border/60 px-2 py-1 text-xs text-muted-foreground">
                  No muscle groups planned for this day.
                </div>
              )}
            </DetailCard>
          )
        })}
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
          <div className="flex flex-col gap-2 w-full">
            {daysWithoutGroups.length > 0 && (
              <span className="text-xs text-muted-foreground text-center">
                Day{daysWithoutGroups.length > 1 ? 's' : ''} {daysWithoutGroups.join(', ')} have no muscle groups planned.
                You can continue, but exercise suggestions for those days will be limited.
              </span>
            )}
            <Button
              className="w-full gradient-primary text-primary-foreground h-auto py-2 px-4 text-center"
              onClick={onNext}
              disabled={days.length === 0}
            >
              Continue
            </Button>
          </div>
        }
        showFixed={false}
      />
    </div>
  )
}

