"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, MoreVertical, AlertTriangle, Filter, Check } from "lucide-react"
import { GYM_TEMPLATES, getTemplatesByFilter } from "@/lib/gym-templates"
import { ProgramStateManager } from "@/lib/program-state"
import { TemplateStorageManager } from "@/lib/template-storage"
import { WorkoutLogger } from "@/lib/workout-logger"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { TemplateDetailView } from "@/components/template-detail-view"
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
  const [showSwitchDialog, setShowSwitchDialog] = useState(false)
  const [pendingProgramId, setPendingProgramId] = useState<{ templateId: string; progressionOverride?: any } | null>(null)
  const [programHistory, setProgramHistory] = useState<any[]>([])
  const [activeProgram, setActiveProgram] = useState<any>(null)
  const [savedTemplates, setSavedTemplates] = useState<any[]>([])
  const [workoutHistory, setWorkoutHistory] = useState<any[]>([])
  const [filterOpen, setFilterOpen] = useState(false)

  const [experienceFilter, setExperienceFilter] = useState<string>("all")
  const [daysFilter, setDaysFilter] = useState<string>("all")
  const [genderFilter, setGenderFilter] = useState<string>("all")
  const [durationFilter, setDurationFilter] = useState<string>("all")
  const [allTemplates, setAllTemplates] = useState<any[]>([]) // Combined DB + hardcoded templates
  const [templatesLoading, setTemplatesLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      const history = TemplateStorageManager.getProgramHistory()
      setProgramHistory(history)

      // Refresh template from database on load
      const active = await ProgramStateManager.getActiveProgram({ refreshTemplate: true })
      setActiveProgram(active)

      const saved = TemplateStorageManager.getSavedTemplates()
      setSavedTemplates(saved)

      const workouts = WorkoutLogger.getWorkoutHistory()
      setWorkoutHistory(workouts)

      // Load templates (database + hardcoded)
      setTemplatesLoading(true)
      try {
        const templates = await ProgramStateManager.getAllTemplates()
        setAllTemplates(templates)
      } catch (error) {
        console.error('[ProgramsSection] Failed to load templates:', error)
        // Fallback to hardcoded templates only
        setAllTemplates(GYM_TEMPLATES)
      } finally {
        setTemplatesLoading(false)
      }
    }

    loadData()

    if (typeof window !== "undefined") {
      window.addEventListener("programChanged", loadData)
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("programChanged", loadData)
      }
    }
  }, [])

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

  const handleTemplateClick = (templateId: string, isActive: boolean) => {
    console.log("[v0] Template clicked:", templateId, "isActive:", isActive)

    // If this is the current active program, navigate to train/workout instead of showing details
    if (isActive && onNavigateToTrain) {
      console.log("[v0] Navigating to train for active program")
      onNavigateToTrain()
      return
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

    // Load template from database or hardcoded templates
    const template = await ProgramStateManager.loadTemplate(templateId)
    if (!template) {
      console.error("[v0] Template not found:", templateId)
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
    } else {
      console.error("[v0] Failed to activate program:", templateId)
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
          userProfile={userProfile}
        />
      ) : (
        <div className="w-full min-h-screen pb-20 lg:pb-4">
          {/* Sticky Header */}
          <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/50 z-[60] shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 sm:py-4">
              <h1 className="text-xl sm:text-2xl font-bold">Programs</h1>
              <div className="flex items-center gap-2">
              <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="relative bg-transparent">
                    <Filter className="h-4 w-4" />
                    {hasActiveFilters && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px]">
                  <SheetHeader>
                    <SheetTitle>Filter Programs</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
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
                      <label className="text-sm font-medium">Days per Week</label>
                      <Select value={daysFilter} onValueChange={setDaysFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Days/Week" />
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

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Duration</label>
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

                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        className="w-full bg-transparent"
                        onClick={() => {
                          setExperienceFilter("all")
                          setDaysFilter("all")
                          setGenderFilter("all")
                          setDurationFilter("all")
                        }}
                      >
                        Clear All Filters
                      </Button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>

              <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white h-9 sm:h-10" onClick={onAddProgram}>
                <Plus className="h-4 w-4 mr-1" />
                NEW
              </Button>
              </div>
            </div>
          </div>

          <Tabs defaultValue="templates" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0">
              <TabsTrigger
                value="templates"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Templates
              </TabsTrigger>
              <TabsTrigger
                value="my-templates"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                My Templates
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="mt-0">
              <div className="divide-y divide-border">
                {filteredTemplates.length === 0 ? (
                  <div className="px-4 py-12 text-center text-muted-foreground">
                    <p>No programs match your filters</p>
                    <p className="text-sm mt-2">Try adjusting your filter criteria</p>
                  </div>
                ) : (
                  filteredTemplates.map((template) => {
                    const isActive = activeProgram?.template.id === template.id

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
                            <Badge variant="secondary" className="text-xs font-medium px-2 py-1">
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
                {savedTemplates.length === 0 ? (
                  <div className="px-4 py-12 text-center text-muted-foreground">
                    <p>No saved templates yet</p>
                    <p className="text-sm mt-2">Create your own custom workout programs</p>
                  </div>
                ) : (
                  savedTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="px-4 py-4 hover:bg-muted/30 transition-colors cursor-pointer flex items-center justify-between gap-3"
                      onClick={() => handleTemplateClick(template.id, false)}
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base leading-tight mb-1">{template.name}</h3>
                        <p className="text-xs text-muted-foreground uppercase">
                          {template.weeks} WEEKS - {template.days} DAYS/WEEK
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))
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
                    const template = GYM_TEMPLATES.find((t) => t.id === entry.templateId)
                    if (!template) return null

                    const endedEarly = (entry.endedEarly ?? false) || (entry.completionRate < 100 && entry.endDate)

                    return (
                      <div key={index} className="px-4 py-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base leading-tight mb-1">{template.name}</h3>
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
      )}
    </div>
  )
}
