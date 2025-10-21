'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ProgramWizard } from '@/components/program-wizard/ProgramWizard'
import type { WizardStep } from '@/components/program-wizard/types'
import { STEPPER_STEPS } from '@/components/program-wizard/constants'

const validStepSet = new Set<WizardStep>(Object.keys(STEPPER_STEPS) as WizardStep[])

export default function ProgramWizardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [hasHistoryEntry, setHasHistoryEntry] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const historyState = window.history.state
    if (historyState && typeof historyState.idx === 'number') {
      setHasHistoryEntry(historyState.idx > 0)
    } else {
      setHasHistoryEntry(window.history.length > 1)
    }
  }, [])

  const initialStep = useMemo<WizardStep | undefined>(() => {
    const stepParam = searchParams.get('step')
    if (!stepParam) return undefined
    if (validStepSet.has(stepParam as WizardStep)) {
      return stepParam as WizardStep
    }
    return undefined
  }, [searchParams])

  const returnTo = useMemo(() => searchParams.get('return') ?? '/', [searchParams])
  const completionTab = useMemo(() => searchParams.get('tab') ?? 'my-programs', [searchParams])

  const navigateToReturn = useCallback(
    (options?: { tab?: string }) => {
      const [path, existingQuery = ''] = returnTo.split('?')
      const params = new URLSearchParams(existingQuery)

      if (options?.tab) {
        params.set('tab', options.tab)
      }

      const queryString = params.toString()
      const href = queryString ? `${path}?${queryString}` : path
      router.push(href)
    },
    [returnTo, router],
  )

  const handleClose = useCallback(() => {
    if (hasHistoryEntry) {
      router.back()
      return
    }
    navigateToReturn()
  }, [hasHistoryEntry, navigateToReturn, router])

  const handleComplete = useCallback(
    (_templateId: string) => {
      navigateToReturn({ tab: completionTab || 'my-programs' })
    },
    [completionTab, navigateToReturn],
  )

  const handleStepChange = useCallback(
    (step: WizardStep) => {
      if (searchParams.get('step') === step) return

      const params = new URLSearchParams(searchParams.toString())
      params.set('step', step)

      const queryString = params.toString()
      const href = queryString ? `/program-wizard?${queryString}` : '/program-wizard'
      router.replace(href, { scroll: false })
    },
    [router, searchParams],
  )

  return (
    <div className="min-h-[100svh] pb-16 lg:pb-0">
      <ProgramWizard
        onClose={handleClose}
        onComplete={handleComplete}
        initialStep={initialStep}
        onStepChange={handleStepChange}
      />
    </div>
  )
}
