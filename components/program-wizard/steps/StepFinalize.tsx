import { ChangeEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  AVAILABLE_EXPERIENCE,
  AVAILABLE_GENDERS,
  AVAILABLE_WEEKS,
} from '../constants'
import type { ProgramMetadata } from '../types'

interface StepFinalizeProps {
  metadata: ProgramMetadata
  validationErrors: string[]
  isSaving: boolean
  onUpdateMetadata: (metadata: Partial<ProgramMetadata>) => void
  onBack: () => void
  onSave: () => void
}

export function StepFinalize({
  metadata,
  validationErrors,
  isSaving,
  onUpdateMetadata,
  onBack,
  onSave,
}: StepFinalizeProps) {
  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    onUpdateMetadata({ name: event.target.value })
  }

  const handleWeeksChange = (weeks: number) => {
    onUpdateMetadata({
      weeks,
      deloadWeek: Math.min(metadata.deloadWeek, weeks),
    })
  }

  const toggleGender = (value: string) => {
    const exists = metadata.gender.includes(value)
    onUpdateMetadata({
      gender: exists ? metadata.gender.filter(item => item !== value) : [...metadata.gender, value].sort(),
    })
  }

  const toggleExperience = (value: string) => {
    const exists = metadata.experience.includes(value)
    onUpdateMetadata({
      experience: exists
        ? metadata.experience.filter(item => item !== value)
        : [...metadata.experience, value].sort(),
    })
  }

  const handleDeloadWeekChange = (week: number) => {
    onUpdateMetadata({ deloadWeek: week })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Finalize program details</h2>
        <p className="text-sm text-muted-foreground">
          Give your program a name and confirm metadata used for filters and future progression.
        </p>
      </div>

      <div className="grid gap-6">
        <div className="space-y-2">
          <Label htmlFor="program-name">Program name</Label>
          <Input
            id="program-name"
            value={metadata.name}
            onChange={handleNameChange}
            placeholder="e.g. Custom Push/Pull/Legs"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Program length (weeks)</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_WEEKS.map(weeks => {
                const isSelected = metadata.weeks === weeks
                return (
                  <Button
                    key={weeks}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleWeeksChange(weeks)}
                  >
                    {weeks} weeks
                  </Button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Deload week</Label>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: metadata.weeks }, (_, index) => index + 1).map(week => {
                const isSelected = metadata.deloadWeek === week
                return (
                  <Button
                    key={week}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleDeloadWeekChange(week)}
                  >
                    Week {week}
                  </Button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Gender focus</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_GENDERS.map(gender => {
                const isSelected = metadata.gender.includes(gender)
                return (
                  <Button
                    key={gender}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleGender(gender)}
                  >
                    {gender}
                  </Button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Experience level</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_EXPERIENCE.map(level => {
                const isSelected = metadata.experience.includes(level)
                return (
                  <Button
                    key={level}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleExperience(level)}
                  >
                    {level}
                  </Button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="rounded border border-border/60 bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
          Public sharing is coming soon. Your program will be saved privately (is_public = false).
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p className="font-semibold">Please resolve the following before saving:</p>
          <ul className="list-disc list-inside space-y-1">
            {validationErrors.map(error => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} disabled={isSaving}>
          Back
        </Button>
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save program'}
        </Button>
      </div>
    </div>
  )
}
