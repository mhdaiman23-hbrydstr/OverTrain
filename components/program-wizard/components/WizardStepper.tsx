import { Check } from 'lucide-react'
import { STEPPER_STEPS } from '../constants'
import type { WizardStep } from '../types'
import { cn } from '@/lib/utils'

const orderedSteps = Object.entries(STEPPER_STEPS)
  .sort(([, a], [, b]) => a.order - b.order)
  .map(([key, config]) => ({ key: key as WizardStep, ...config }))

interface WizardStepperProps {
  currentStep: WizardStep
}

export function WizardStepper({ currentStep }: WizardStepperProps) {
  const currentOrder = STEPPER_STEPS[currentStep]?.order ?? 0

  return (
    <div className="min-w-0 w-full flex items-center gap-2 overflow-x-auto overflow-y-hidden py-2 pr-3 sm:gap-3 sm:py-3 scrollbar-hide">
      {orderedSteps.map(step => {
        const status =
          step.order < currentOrder ? 'complete'
          : step.order === currentOrder ? 'current'
          : 'upcoming'

        return (
          <div key={step.key} className="flex items-center gap-2 min-w-fit sm:gap-3">
            <div
              className={cn(
                'size-7 sm:size-8 rounded-full border flex items-center justify-center text-[11px] sm:text-xs font-semibold transition-colors',
                status === 'complete' && 'bg-primary text-primary-foreground border-primary',
                status === 'current' && 'bg-primary/10 text-primary border-primary/40',
                status === 'upcoming' && 'text-muted-foreground border-muted',
              )}
            >
              {status === 'complete' ? <Check className="size-4" /> : step.order}
            </div>
            <div className="flex flex-col">
              <span
                className={cn(
                  'text-[11px] font-medium leading-tight sm:text-sm',
                  status === 'upcoming' && 'text-muted-foreground',
                  status === 'current' && 'text-primary',
                  // Completed labels should remain readable on the page background
                  status === 'complete' && 'text-foreground',
                  'whitespace-nowrap sm:whitespace-normal'
                )}
              >
                {step.label}
              </span>
            </div>
            {step.order < orderedSteps.length && (
              <div className="w-10 h-px bg-border/70 hidden sm:block" />
            )}
          </div>
        )
      })}
    </div>
  )
}
