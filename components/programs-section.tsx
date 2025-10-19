"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, MoreVertical, AlertTriangle, Filter, Check, X, GitBranch } from "lucide-react"
import { GYM_TEMPLATES, getTemplatesByFilter } from "@/lib/gym-templates"
import { ProgramStateManager, type MyProgramInfo } from "@/lib/program-state"
import { getHistoricalWorkouts } from "@/lib/history"
import { TemplateStorageManager } from "@/lib/template-storage"
import { MY_PROGRAMS_ENABLED } from "@/lib/feature-flags"
import { WorkoutLogger } from "@/lib/workout-logger"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { TemplateDetailView } from "@/components/template-detail-view"
import { HistoricalProgramViewer } from "@/components/historical-program-viewer"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"

interface ProgramsSectionProps {
  onAddProgram: () => void
  onProgramStarted?: () => void
  onNavigateToTrain?: () => void
  userProfile?: {
    experience: "beginner" | "intermediate" | "advanced"
    gender: "male" | "female"
  }
}

export function ProgramsSection({ onAddProgram, onProgramStarted, onNavigateToTrain, userProfile }: ProgramsSectionProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [selectedHistoricalProgram, setSelectedHistoricalProgram] = useState<any | null>(null)
  const [showSwitchDialog, setShowSwitchDialog] = useState(false)
  const [pendingProgramId, setPendingProgramId] = useState<{ templateId: string; progressionOverride?: any } | null>(null)
  const [programHistory, setProgramHistory] = useState<any[]>([])
  const [activeProgram, setActiveProgram] = useState<any>(null)
  const [myPrograms, setMyPrograms] = useState<MyProgramInfo[]>([])
  const [workoutHistory, setWorkoutHistory] = useState<any[]>([])
  const [filterOpen, setFilterOpen] = useState(false)
  const [isStartingProgram, setIsStartingProgram] = useState(false)
  const [startingTemplateId, setStartingTemplateId] = useState<string | null>(null)

  const [experienceFilter, setExperienceFilter] = useState<string>("all")
  const [daysFilter, setDaysFilter] = useState<string>("all")
  const [genderFilter, setGenderFilter] = useState<string>("all")
  const [durationFilter, setDurationFilter] = useState<string>("all")
  const [allTemplates, setAllTemplates] = useState<any[]>([]) // Combined DB + hardcoded templates
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const { toast } = useToast()

  const loadMyPrograms = useCallback(async (savedLocal?: any[], active?: any) => {
    const activeId = active?.templateId

    const mapLocal = (templates: any[] = []): MyProgramInfo[] =>
      templates.map((t: any) => ({
        id: t.id,
        name: t.name,
        days: t.days ?? t.daysPerWeek ?? t.days_per_week ?? 0,
        weeks: t.weeks ?? t.totalWeeks ?? t.total_weeks ?? 0,
        forkedAt: null,
        originTemplateName: t.originName ?? null,
        originTemplateId: null,
        createdFrom: 'local',
        isActive: activeId === t.id,
      }))

    if (MY_PROGRAMS_ENABLED) {
      try {
        const programs = await ProgramStateManager.getMyPrograms()
        setMyPrograms(programs)
        return
      } catch (error) {
        console.error('[ProgramsSection] Failed to load My Programs from server:', error)
        if (savedLocal) {
          setMyPrograms(mapLocal(savedLocal))
          return
        }
        setMyPrograms([])
        return
      }
    }

    if (savedLocal) {
      setMyPrograms(mapLocal(savedLocal))
    } else {
      setMyPrograms([])
    }
  }, [])

  const loadData = useCallback(async () => {
    // Only show loading spinner if we don't have templates yet (cold start)
    // This prevents spinner flicker when returning to Programs tab with cached data
    if (allTemplates.length === 0) {
      setTemplatesLoading(true)
    }

    const templatesPromise = ProgramStateManager.getAllTemplates()

    const history = TemplateStorageManager.getProgramHistory()
    setProgramHistory(history)

    const active = await ProgramStateManager.getActiveProgram({ refreshTemplate: true })
    setActiveProgram(active)

    const saved = TemplateStorageManager.getSavedTemplates()

    const workouts = WorkoutLogger.getWorkoutHistory()
    setWorkoutHistory(workouts)

    try {
      const templates = await templatesPromise
      setAllTemplates(templates)
      console.log('[ProgramsSection] Loaded', templates.length, 'lightweight templates (metadata only)')
    } catch (error) {
      console.error('[ProgramsSection] Failed to load templates:', error)
      setAllTemplates(GYM_TEMPLATES)
    } finally {
      setTemplatesLoading(false)
    }

    await loadMyPrograms(saved, active)
  }, [loadMyPrograms])

  const handleRenameMyProgram = useCallback(
    async (program: MyProgramInfo) => {
      const nextName = window.prompt("Rename program", program.name)
      if (!nextName) return
      const trimmed = nextName.trim()
      if (!trimmed || trimmed === program.name) return

      try {
        await ProgramStateManager.renameCustomProgram(program.id, trimmed)
        toast({ title: "Program renamed" })
        await loadData()
      } catch (error) {
        console.error("[ProgramsSection] Failed to rename program:", error)
        toast({
          title: "Failed to rename program",
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: "destructive",
        })
      }
    },
    [loadData, toast]
  )

  const handleEndMyProgram = useCallback(
    async (program: MyProgramInfo) => {
      if (!program.isActive) return
      const confirmed = window.confirm("End the current program? Your progress will be finalized.")
      if (!confirmed) return

      try {
        await ProgramStateManager.finalizeActiveProgram(undefined, { endedEarly: true })
        toast({ title: "Program ended" })
        await loadData()
      } catch (error) {
        console.error("[ProgramsSection] Failed to end program:", error)
        toast({
          title: "Failed to end program",
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: "destructive",
        })
      }
    },
    [loadData, toast]
  )

  useEffect(() => {
    loadData()

    const handleProgramEnded = () => {
      console.log("[ProgramsSection] Program ended event received, refreshing program list...")
      loadData()
    }

    if (typeof window !== "undefined") {
      window.addEventListener("programChanged", loadData)
      window.addEventListener("programEnded", handleProgramEnded)
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("programChanged", loadData)
        window.removeEventListener("programEnded", handleProgramEnded)
      }
    }
  }, [loadData])

  const getFilteredTemplates = () => {
    // Use loaded templates (includes both database and hardcoded)
    let templates = allTemplates

    // Apply experience filter
    if (experienceFilter !== "all") {
      templates = templates.filter((t) => t.experience?.includes(experienceFilter as any))
    }

    // Apply days per week filter
    if (daysFilter !== "all") {
      const days = Number.parseInt(daysFilter)
      templates = templates.filter((t) => t.days === days)
    }

    // Apply gender filter
    if (genderFilter !== "all") {
      templates = templates.filter((t) => t.gender?.includes(genderFilter as any))
    }

    // Apply duration filter
    if (durationFilter !== "all") {
      const weeks = Number.parseInt(durationFilter)
      templates = templates.filter((t) => t.weeks === weeks)
    }

    return templates
  }

  const handleTemplateClick = async (templateId: string, isActive: boolean) => {
    console.log("[v0] Template clicked:", templateId, "isActive:", isActive)

    // If this is the current active program, navigate to train/workout instead of showing details
    if (isActive && onNavigateToTrain) {
      console.log("[v0] Navigating to train for active program")
      onNavigateToTrain()
      return
    }

    // OPTIMIZATION: Load full template with exercises on-demand
    // This ensures exercises are cached before showing template detail view
    console.log("[ProgramsSection] Loading full template data for:", templateId)
    try {
      await ProgramStateManager.loadTemplate(templateId)
      console.log("[ProgramsSection] Template loaded successfully, showing detail view")
    } catch (error) {
      console.error("[ProgramsSection] Failed to load template:", error)
      // Continue anyway - TemplateDetailView will handle the error
    }

    setSelectedTemplate(templateId)
  }

  const handleStartProgram = async (templateId: string, progressionOverride?: any) => {
    console.log("[v0] Start Program clicked for:", templateId, "with override:", !!progressionOverride)

    const activeProgram = await ProgramStateManager.getActiveProgram()

    if (activeProgram) {
      console.log("[v0] Active program exists, showing confirmation dialog")
      setPendingProgramId({ templateId, progressionOverride })
      setShowSwitchDialog(true)
      return
    }

    await startNewProgram(templateId, progressionOverride)
  }

  const startNewProgram = async (templateId: string, progressionOverride?: any) => {
    console.log("[v0] Starting program:", templateId, "with override:", !!progressionOverride)
    setIsStartingProgram(true)
    setStartingTemplateId(templateId)

    // Load template from database or hardcoded templates
    const template = await ProgramStateManager.loadTemplate(templateId)
    if (!template) {
      console.error("[v0] Template not found:", templateId)
      setIsStartingProgram(false)
      setStartingTemplateId(null)
      return
    }

    // Clear all in-progress workouts to start fresh
    WorkoutLogger.clearCurrentWorkout()
    
    // Also clear any corrupted workout data
    WorkoutLogger.cleanupCorruptedWorkouts()

    const activeProgram = await ProgramStateManager.setActiveProgram(templateId, progressionOverride)

    if (activeProgram) {
      console.log("[v0] Program activated successfully:", activeProgram)
      setSelectedTemplate(null)
      setPendingProgramId(null)
      setActiveProgram(activeProgram)

      if (onProgramStarted) {
        onProgramStarted()
      }
      setIsStartingProgram(false)
      setStartingTemplateId(null)
    } else {
      console.error("[v0] Failed to activate program:", templateId)
      setIsStartingProgram(false)
      setStartingTemplateId(null)
    }
  }

  const handleConfirmSwitch = async () => {
    if (!pendingProgramId) return

    await startNewProgram(pendingProgramId.templateId, pendingProgramId.progressionOverride)
    setShowSwitchDialog(false)

    const updatedHistory = TemplateStorageManager.getProgramHistory()
    setProgramHistory(updatedHistory)
  }

  const hasActiveFilters =
    experienceFilter !== "all" || daysFilter !== "all" || genderFilter !== "all" || durationFilter !== "all"

  const filteredTemplates = getFilteredTemplates()

  // If viewing a historical program, show the viewer
  if (selectedHistoricalProgram) {
    const historicalWorkouts = getHistoricalWorkouts(
      selectedHistoricalProgram.instanceId || selectedHistoricalProgram.id
    )

    return (
      <HistoricalProgramViewer
        historyEntry={selectedHistoricalProgram}
        workouts={historicalWorkouts}
        onClose={() => setSelectedHistoricalProgram(null)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AlertDialog open={showSwitchDialog} onOpenChange={setShowSwitchDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch Program?</AlertDialogTitle>
            <AlertDialogDescription>
              {activeProgram && (
                <>
                  You're currently {Math.round(activeProgram.progress)}% complete with{" "}
                  <span className="font-semibold">{activeProgram.template.name}</span> (
                  {activeProgram.completedWorkouts}/{activeProgram.totalWorkouts} workouts completed).
                  <br />
                  <br />
                </>
              )}
              Starting a new program will save your current progress to history. Are you sure you want to switch?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSwitch} className="bg-blue-600 hover:bg-blue-700">
              Start New Program
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedTemplate ? (
        <TemplateDetailView
          templateId={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onStartProgram={handleStartProgram}
          isStarting={isStartingProgram && startingTemplateId === selectedTemplate}
          userProfile={userProfile}
        />
      ) : (
        <div className="w-full min-h-screen pb-20 lg:pb-4">
          {/* Sticky Header */}
          <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/50 z-[60] shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 sm:py-4 max-w-4xl mx-auto">
              <h1 className="text-xl sm:text-2xl font-bold">Programs</h1>
              <div className="flex items-center gap-2">
              <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="relative bg-transparent">
                    <Filter className="h-4 w-4" />
                    {hasActiveFilters && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />}
                  </Button>
                </DialogTrigger>
                <DialogContent
                  showCloseButton={false}
                  className="w-full max-w-2xl border border-border/40 bg-background p-0 top-auto bottom-0 left-1/2 translate-x-[-50%] translate-y-0 rounded-t-3xl shadow-2xl sm:rounded-3xl sm:bottom-6"
                >
                  <div className="px-5 pt-4 sm:px-6">
                    <span className="mx-auto block h-1.5 w-12 rounded-full bg-muted" />
                  </div>
                  <DialogHeader className="px-5 pb-2 text-left sm:px-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <DialogTitle className="text-xl font-semibold">Filter Programs</DialogTitle>
                        <DialogDescription>
                          Refine templates by experience, schedule, duration, and gender.
                        </DialogDescription>
                      </div>
                      <DialogClose asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="mt-1 h-8 w-8 rounded-full border border-border/60 bg-background/60 backdrop-blur"
                          aria-label="Close filters"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </DialogClose>
                    </div>
                  </DialogHeader>
                  <div className="flex flex-col gap-6 px-5 pb-6 sm:px-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Experience Level</label>
                        <Select value={experienceFilter} onValueChange={setExperienceFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="Experience" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Levels</SelectItem>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Number of Days</label>
                        <Select value={daysFilter} onValueChange={setDaysFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="Days per Week" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Days</SelectItem>
                            <SelectItem value="3">3 Days</SelectItem>
                            <SelectItem value="4">4 Days</SelectItem>
                            <SelectItem value="6">6 Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Program Duration</label>
                        <Select value={durationFilter} onValueChange={setDurationFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="Duration" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Durations</SelectItem>
                            <SelectItem value="8">8 Weeks</SelectItem>
                            <SelectItem value="12">12 Weeks</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Gender</label>
                        <Select value={genderFilter} onValueChange={setGenderFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="Gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      {hasActiveFilters ? (
                        <Button
                          variant="outline"
                          className="w-full bg-transparent sm:w-auto"
                          onClick={() => {
                            setExperienceFilter("all")
                            setDaysFilter("all")
                            setGenderFilter("all")
                            setDurationFilter("all")
                          }}
                        >
                          Clear All Filters
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">No filters applied</span>
                      )}

                      <DialogClose asChild>
                        <Button className="w-full sm:w-auto">Show Programs</Button>
                      </DialogClose>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white h-9 sm:h-10 px-4 sm:px-6" onClick={onAddProgram}>
                <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                NEW
              </Button>
              </div>
            </div>
          </div>

          <div className="px-2 pt-4">
            <Tabs defaultValue="templates" className="w-full max-w-4xl mx-auto">
              <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/50 rounded-lg">
              <TabsTrigger
                value="templates"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Templates
              </TabsTrigger>
              <TabsTrigger
                value="my-templates"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                My Programs
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="mt-0">
              <div className="divide-y divide-border">
                {templatesLoading ? (
                  <div className="px-4 py-12 text-center">
                    <Spinner size="lg" className="mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">Loading programs...</p>
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="px-4 py-12 text-center text-muted-foreground">
                    <p>No programs match your filters</p>
                    <p className="text-sm mt-2">Try adjusting your filter criteria</p>
                  </div>
                ) : (
                  filteredTemplates.map((template) => {
                    const isActive = activeProgram?.templateId === template.id

                    return (
                      <div
                        key={template.id}
                        className="px-4 py-4 hover:bg-muted/30 transition-colors cursor-pointer flex items-center justify-between gap-3"
                        onClick={() => handleTemplateClick(template.id, isActive)}
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base leading-tight mb-1">{template.name}</h3>
                          <p className="text-xs text-muted-foreground uppercase">
                            {template.weeks} WEEKS - {template.days} DAYS/WEEK
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {isActive && (
                            <Badge className="text-xs font-medium px-2 py-1 bg-green-500 text-white border-transparent">
                              CURRENT
                            </Badge>
                          )}
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="my-templates" className="mt-0">
              <div className="divide-y divide-border">
                {myPrograms.length === 0 ? (
                  <div className="px-4 py-12 text-center text-muted-foreground">
                    <p>No custom programs yet</p>
                    <p className="text-sm mt-2">Create or customize a program to see it here</p>
                  </div>
                ) : (
                  myPrograms.map((program) => {
                    const isActive = program.isActive
                    const forkedLabel = program.originTemplateName
                      ? `Forked from ${program.originTemplateName}${
                          program.forkedAt ? ` • ${new Date(program.forkedAt).toLocaleDateString()}` : ""
                        }`
                      : null

                    return (
                    <div
                      key={program.id}
                      className="px-4 py-4 hover:bg-muted/30 transition-colors cursor-pointer flex items-center justify-between gap-3"
                      onClick={() => handleTemplateClick(program.id, isActive)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <GitBranch className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-semibold text-base leading-tight">{program.name}</h3>
                          {isActive && (
                            <Badge className="text-xs font-medium px-2 py-1 bg-green-500 text-white border-transparent">
                              CURRENT
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground uppercase">
                          {program.weeks} WEEKS - {program.days} DAYS/WEEK
                        </p>
                        {forkedLabel && (
                          <p className="text-xs text-muted-foreground mt-1">{forkedLabel}</p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => handleRenameMyProgram(program)}>
                            Rename Program
                          </DropdownMenuItem>
                          {isActive && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={() => handleEndMyProgram(program)}
                            >
                              End Program
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    )
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <div className="divide-y divide-border">
                {programHistory.filter(entry => !entry.isActive).length === 0 ? (
                  <div className="px-4 py-12 text-center text-muted-foreground">
                    <p>No program history yet</p>
                    <p className="text-sm mt-2">Start a program to see your history</p>
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-3 bg-muted/30 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {programHistory.filter(entry => !entry.isActive).length} completed program{programHistory.filter(entry => !entry.isActive).length !== 1 ? 's' : ''}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Clear all program history? This cannot be undone.')) {
                            // Keep only active programs
                            const activeOnly = programHistory.filter(entry => entry.isActive)
                            localStorage.setItem('liftlog_program_history', JSON.stringify(activeOnly))
                            setProgramHistory(activeOnly)
                            if (typeof window !== "undefined") {
                              window.dispatchEvent(new Event("programChanged"))
                            }
                          }
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        Clear History
                      </Button>
                    </div>
                    {programHistory.filter(entry => !entry.isActive).map((entry, index) => {
                    const endedEarly = (entry.endedEarly ?? false) || (entry.completionRate < 100 && entry.endDate)

                    return (
                      <div
                        key={index}
                        className="px-4 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => setSelectedHistoricalProgram(entry)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base leading-tight mb-1">{entry.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {entry.completedWorkouts} / {entry.totalWorkouts} workouts completed
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(entry.startDate).toLocaleDateString()} -{" "}
                              {entry.endDate ? new Date(entry.endDate).toLocaleDateString() : "In Progress"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {entry.completionRate === 100 && (
                              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                                <Check className="h-4 w-4 text-white" />
                              </div>
                            )}
                            {endedEarly && (
                              <div
                                className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center"
                                title="Program ended early"
                              >
                                <AlertTriangle className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  </>
                )}
              </div>
            </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  )
}
