"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, MoreVertical, Check, Filter } from "lucide-react"
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
}

export function ProgramsSection({ onAddProgram, onProgramStarted, onNavigateToTrain }: ProgramsSectionProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [showSwitchDialog, setShowSwitchDialog] = useState(false)
  const [pendingProgramId, setPendingProgramId] = useState<string | null>(null)
  const [programHistory, setProgramHistory] = useState<any[]>([])
  const [activeProgram, setActiveProgram] = useState<any>(null)
  const [savedTemplates, setSavedTemplates] = useState<any[]>([])
  const [filterOpen, setFilterOpen] = useState(false)

  const [experienceFilter, setExperienceFilter] = useState<string>("all")
  const [daysFilter, setDaysFilter] = useState<string>("all")
  const [genderFilter, setGenderFilter] = useState<string>("all")
  const [durationFilter, setDurationFilter] = useState<string>("all")

  useEffect(() => {
    const history = TemplateStorageManager.getProgramHistory()
    setProgramHistory(history)

    const active = ProgramStateManager.getActiveProgram()
    setActiveProgram(active)

    const saved = TemplateStorageManager.getSavedTemplates()
    setSavedTemplates(saved)
  }, [])

  const getFilteredTemplates = () => {
    const filters: any = {}

    if (experienceFilter !== "all") {
      filters.experience = experienceFilter
    }
    if (daysFilter !== "all") {
      filters.workoutsPerWeek = Number.parseInt(daysFilter)
    }
    if (genderFilter !== "all") {
      filters.gender = genderFilter
    }

    let templates = Object.keys(filters).length === 0 ? GYM_TEMPLATES : getTemplatesByFilter(filters)

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

  const handleStartProgram = (templateId: string) => {
    console.log("[v0] Start Program clicked for:", templateId)

    const activeProgram = ProgramStateManager.getActiveProgram()

    if (activeProgram) {
      console.log("[v0] Active program exists, showing confirmation dialog")
      setPendingProgramId(templateId)
      setShowSwitchDialog(true)
      return
    }

    startNewProgram(templateId)
  }

  const startNewProgram = (templateId: string) => {
    console.log("[v0] Starting program:", templateId)

    const template = GYM_TEMPLATES.find((t) => t.id === templateId)
    if (!template) {
      console.error("[v0] Template not found:", templateId)
      return
    }

    WorkoutLogger.clearCurrentWorkout()

    const activeProgram = ProgramStateManager.setActiveProgram(templateId)

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

  const handleConfirmSwitch = () => {
    if (!pendingProgramId) return

    startNewProgram(pendingProgramId)
    setShowSwitchDialog(false)

    const updatedHistory = TemplateStorageManager.getProgramHistory()
    setProgramHistory(updatedHistory)
  }

  const hasActiveFilters =
    experienceFilter !== "all" || daysFilter !== "all" || genderFilter !== "all" || durationFilter !== "all"

  const filteredTemplates = getFilteredTemplates()

  return (
    <div className="min-h-screen bg-background pb-20">
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
        />
      ) : (
        <div className="w-full">
          <div className="flex items-center justify-between p-4 pt-6 border-b border-border">
            <h1 className="text-2xl font-bold">Programs</h1>
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

              <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white" onClick={onAddProgram}>
                <Plus className="h-4 w-4 mr-1" />
                NEW
              </Button>
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
                    const historyEntry = programHistory.find(
                      (p) => p.templateId === template.id && p.completionRate === 100,
                    )
                    const isCompleted = !!historyEntry

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
                          {isCompleted && !isActive && (
                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                              <Check className="h-4 w-4 text-white" />
                            </div>
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
                      onClick={() => handleTemplateClick(template.id)}
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
                {programHistory.length === 0 ? (
                  <div className="px-4 py-12 text-center text-muted-foreground">
                    <p>No program history yet</p>
                    <p className="text-sm mt-2">Start a program to see your history</p>
                  </div>
                ) : (
                  programHistory.map((entry, index) => {
                    const template = GYM_TEMPLATES.find((t) => t.id === entry.templateId)
                    if (!template) return null

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
                          {entry.completionRate === 100 && (
                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
