import { ChangeEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { AVAILABLE_EXPERIENCE } from '../constants'
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
  type GenderOption = 'all' | 'male' | 'female'

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    onUpdateMetadata({ name: event.target.value })
  }

  const formatLabel = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

  const selectedGenderOption: GenderOption =
    metadata.gender.length === 2 ? 'all' : (metadata.gender[0] as GenderOption) || 'all'

  const handleGenderChange = (option: GenderOption) => {
    if (option === 'all') {
      onUpdateMetadata({ gender: ['male', 'female'] })
      return
    }
    onUpdateMetadata({ gender: [option] })
  }

  const handleExperienceToggle = (value: string, checked: boolean | 'indeterminate') => {
    // Handle indeterminate state - treat as checked (true)
    const isChecked = checked === true
    const current = new Set(metadata.experience)
    if (isChecked) {
      current.add(value)
    } else {
      current.delete(value)
    }

    const next = AVAILABLE_EXPERIENCE.filter(level => current.has(level))
    onUpdateMetadata({ experience: next })
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
          <Label htmlFor="program-name">
            Program name
            <span className="text-destructive ml-1">*</span>
          </Label>
          <Input
            id="program-name"
            value={metadata.name}
            onChange={handleNameChange}
            placeholder="e.g. Custom Push/Pull/Legs"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Gender focus</Label>
            <RadioGroup
              value={selectedGenderOption}
              onValueChange={value => handleGenderChange(value as GenderOption)}
              className="space-y-1"
            >
              {(['all', 'male', 'female'] as GenderOption[]).map(option => {
                const id = `wizard-gender-${option}`
                return (
                  <div key={option} className="flex items-center gap-3">
                    <RadioGroupItem value={option} id={id} />
                    <Label htmlFor={id}>{formatLabel(option)}</Label>
                  </div>
                )
              })}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Experience level</Label>
            <div className="space-y-3">
              {AVAILABLE_EXPERIENCE.map(level => {
                const id = `wizard-experience-${level}`
                const isChecked = metadata.experience.includes(level)
                return (
                  <div key={level} className="flex items-center gap-3">
                    <Checkbox
                      id={id}
                      checked={isChecked}
                      onCheckedChange={checked => handleExperienceToggle(level, checked)}
                    />
                    <Label htmlFor={id}>{formatLabel(level)}</Label>
                  </div>
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
