import { useCallback, useEffect, useMemo, useState } from 'react'
import { ProgramStateManager } from '@/lib/program-state'
import { programTemplateService } from '@/lib/services/program-template-service'
import type { GymTemplate } from '@/lib/gym-templates'

interface UseTemplateCacheOptions {
  enabled: boolean
}

export const useTemplateCache = ({ enabled }: UseTemplateCacheOptions) => {
  const [templates, setTemplates] = useState<GymTemplate[]>([])
  const [fullTemplates, setFullTemplates] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [loadingTemplateIds, setLoadingTemplateIds] = useState<Set<string>>(new Set())

  const loadTemplates = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const loaded = await ProgramStateManager.getAllTemplates()
      setTemplates(loaded)
      setHasLoaded(true)
    } catch (err) {
      console.error('[ProgramWizard] Failed to load templates', err)
      const message = err instanceof Error ? err.message : 'Failed to load templates'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled || hasLoaded || isLoading) return
    let cancelled = false

    const fetch = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await ProgramStateManager.getAllTemplates()
        if (!cancelled) {
          setTemplates(data)
          setHasLoaded(true)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[ProgramWizard] Failed to load templates', err)
          const message = err instanceof Error ? err.message : 'Failed to load templates'
          setError(message)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetch()
    return () => {
      cancelled = true
    }
  }, [enabled, hasLoaded, isLoading])

  const loadFullTemplate = useCallback(async (templateId: string) => {
    if (fullTemplates[templateId]) {
      return fullTemplates[templateId]
    }

    setLoadingTemplateIds(prev => {
      const updated = new Set(prev)
      updated.add(templateId)
      return updated
    })

    try {
      const template = await programTemplateService.getFullTemplate(templateId)
      if (!template) {
        throw new Error('Template not found')
      }
      setFullTemplates(prev => ({
        ...prev,
        [templateId]: template,
      }))
      return template
    } catch (err) {
      console.error('[ProgramWizard] Failed to load template', err)
      throw err
    } finally {
      setLoadingTemplateIds(prev => {
        const updated = new Set(prev)
        updated.delete(templateId)
        return updated
      })
    }
  }, [fullTemplates])

  const loadingIds = useMemo(() => new Set(loadingTemplateIds), [loadingTemplateIds])

  return {
    templates,
    fullTemplates,
    isLoading,
    error,
    hasLoaded,
    loadingTemplateIds: loadingIds,
    refresh: loadTemplates,
    loadFullTemplate,
  }
}
