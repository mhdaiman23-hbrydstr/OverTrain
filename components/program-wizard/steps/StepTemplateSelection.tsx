import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import type { GymTemplate } from '@/lib/gym-templates'
import { cn } from '@/lib/utils'

interface StepTemplateSelectionProps {
  templates: GymTemplate[]
  loading: boolean
  error: string | null
  selectedTemplateId: string | null
  dayCount: number
  loadingTemplateIds: Set<string>
  onSelectTemplate: (templateId: string) => void
  onBack: () => void
  onNext: () => void
  onRefresh: () => void
}

export function StepTemplateSelection({
  templates,
  loading,
  error,
  selectedTemplateId,
  dayCount,
  loadingTemplateIds,
  onSelectTemplate,
  onBack,
  onNext,
  onRefresh,
}: StepTemplateSelectionProps) {
  const filteredTemplates = dayCount
    ? templates.filter(template => template.days === dayCount)
    : templates

  const skeletonItems = Array.from({ length: 4 })

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-5 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold sm:text-xl">Choose a base template</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Pick the program that best matches your goals. We&apos;ll load all exercises so you can customize them next.
            </p>
          </div>
          <Button variant="outline" size="sm" className="self-start sm:self-auto" onClick={onRefresh}>
            Refresh
          </Button>
        </div>

        {loading && (
          <ScrollArea className="max-h-[50vh] rounded-md border border-border/60 bg-background/40 sm:max-h-[60vh]">
            <span className="sr-only">Loading templates...</span>
            <div className="divide-y divide-border">
              {skeletonItems.map((_, index) => (
                <div key={`template-skeleton-${index}`} className="px-4 py-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="mt-3 h-3 w-1/3" />
                  <Skeleton className="mt-2 h-3 w-1/2" />
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {!loading && error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && filteredTemplates.length === 0 && (
          <div className="rounded-md border border-border/60 bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
            No templates match your day count selection. Try a different day count or refresh the list.
          </div>
        )}

        {!loading && !error && filteredTemplates.length > 0 && (
          <ScrollArea className="max-h-[50vh] rounded-md border border-border/60 sm:max-h-[60vh]">
            <div className="divide-y divide-border">
              {filteredTemplates.map(template => {
                const isLoadingTemplate = loadingTemplateIds.has(template.id)
                const isSelected = selectedTemplateId === template.id

                return (
                  <button
                    key={template.id}
                    type="button"
                    className={cn(
                      'w-full px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                      'hover:bg-muted/40',
                      isSelected && 'bg-primary/5 ring-1 ring-primary/40 hover:bg-primary/5',
                      isLoadingTemplate ? 'cursor-progress opacity-80' : 'cursor-pointer',
                    )}
                    onClick={() => onSelectTemplate(template.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold leading-tight">{template.name}</p>
                        <p className="mt-1 text-xs uppercase text-muted-foreground">
                          {template.weeks} weeks - {template.days} days/week
                        </p>
                      </div>
                      {template.originTemplateId && (
                        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                          Forked template
                        </Badge>
                      )}
                    </div>
                    {isLoadingTemplate && (
                      <div className="mt-3 flex items-center gap-2 text-primary">
                        <Spinner className="size-4" />
                        <span className="text-xs font-medium uppercase tracking-wide">Loading template...</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      <div
        className="sticky bottom-0 z-10 border-t border-border/60 bg-background/95 py-4"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext} disabled={!selectedTemplateId || loadingTemplateIds.size > 0}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}
