'use client'

import { AVAILABLE_DAY_COUNTS, AVAILABLE_WEEKS } from '../constants'
import { Button } from '@/components/ui/button'

interface StepDayCountProps {
  selectedWeekCount: number
  selectedDayCount: number
  onSelectWeek: (weeks: number) => void
  onSelectDay: (count: number) => void
  onNext: () => void
  onBack?: () => void
}

export function StepDayCount({
  selectedWeekCount,
  selectedDayCount,
  onSelectWeek,
  onSelectDay,
  onNext,
  onBack,
}: StepDayCountProps) {
  // Log state changes
  console.log('=== StepDayCount rendered ===', { selectedWeekCount, selectedDayCount })

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="space-y-3 sm:space-y-4">
        <div className="space-y-1 pr-2">
          <h2 className="text-sm font-semibold sm:text-base">How long is your training block?</h2>
          <p className="text-xs text-muted-foreground leading-relaxed break-words">
            Choose the number of weeks for your training block, including <strong>Deload week</strong>.
          </p>
        </div>

        <div className="flex flex-col gap-2 px-3">
          {AVAILABLE_WEEKS.map(weeks => {
            const isSelected = selectedWeekCount === weeks
            return (
              <Button
                key={weeks}
                size="sm"
                variant={isSelected ? "default" : "outline"}
                className="w-full justify-center text-center transition-colors font-medium"
                onClick={(e) => {
                  const btn = e.currentTarget as HTMLButtonElement
                  const styles = window.getComputedStyle(btn)
                  console.log(`✓ Week ${weeks} clicked | Selected: ${isSelected}`)
                  console.log(`  Color: ${styles.color} | BG: ${styles.backgroundColor}`)
                  console.log(`  Display: ${styles.display} | Visibility: ${styles.visibility} | Opacity: ${styles.opacity}`)
                  console.log(`  Position: ${styles.position} | zIndex: ${styles.zIndex}`)

                  // Check what elements are covering this button
                  const rect = btn.getBoundingClientRect()
                  const topElement = document.elementFromPoint(rect.left + 5, rect.top + 5)
                  console.log(`  Element at click point: ${topElement?.tagName}.${topElement?.className}`)

                  onSelectWeek(weeks)
                }}
              >
                {weeks} weeks
              </Button>
            )
          })}
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <div className="space-y-1 pr-2">
          <h2 className="text-sm font-semibold sm:text-base">How many days per week?</h2>
          <p className="text-xs text-muted-foreground leading-relaxed break-words">
            Choose the number of training days you plan to complete each week. You can adjust later if needed.
          </p>
        </div>

        <div className="flex flex-col gap-2 px-3">
          {AVAILABLE_DAY_COUNTS.map(count => {
            const isSelected = selectedDayCount === count
            return (
              <Button
                key={count}
                size="sm"
                variant={isSelected ? "default" : "outline"}
                className="w-full justify-center text-center transition-colors font-medium"
                onClick={(e) => {
                  const btn = e.currentTarget as HTMLButtonElement
                  const styles = window.getComputedStyle(btn)
                  console.log(`✓ Day ${count} clicked | Selected: ${isSelected}`)
                  console.log(`  Color: ${styles.color} | BG: ${styles.backgroundColor}`)
                  console.log(`  Display: ${styles.display} | Visibility: ${styles.visibility} | Opacity: ${styles.opacity}`)
                  console.log(`  Position: ${styles.position} | zIndex: ${styles.zIndex}`)

                  // Check what elements are covering this button
                  const rect = btn.getBoundingClientRect()
                  const topElement = document.elementFromPoint(rect.left + 5, rect.top + 5)
                  console.log(`  Element at click point: ${topElement?.tagName}.${topElement?.className}`)

                  onSelectDay(count)
                }}
              >
                {count} days/week
              </Button>
            )
          })}
        </div>
      </div>

      <div className="flex justify-between gap-2 pt-2">
        {onBack ? (
          <Button variant="ghost" size="sm" onClick={onBack}>
            Back
          </Button>
        ) : (
          <div />
        )}
        <Button size="sm" onClick={onNext} disabled={selectedWeekCount === 0 || selectedDayCount === 0}>
          Continue
        </Button>
      </div>
    </div>
  )
}
