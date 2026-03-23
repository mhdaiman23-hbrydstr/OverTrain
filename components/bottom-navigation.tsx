"use client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dumbbell, Calendar, BarChart3, User } from "lucide-react"

interface BottomNavigationProps {
  currentView: string
  onViewChange: (view: string) => void
  hasActiveProgram?: boolean
}

export function BottomNavigation({ currentView, onViewChange, hasActiveProgram }: BottomNavigationProps) {
  const navItems = [
    {
      id: "train",
      label: hasActiveProgram ? "Workout" : "Train",
      icon: Dumbbell,
    },
    {
      id: "programs",
      label: "Programs",
      icon: Calendar,
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
    },
    {
      id: "profile",
      label: "Profile",
      icon: User,
    },
  ]

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background neu-raised z-50">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          // "train" tab should highlight when currentView is "train" OR "workout"
          const isActive = item.id === "train"
            ? (currentView === "train" || currentView === "workout")
            : currentView === item.id
          // Grey out Train tab when no active program — nothing to train with
          const isDisabled = item.id === "train" && !hasActiveProgram

          return (
            <Button
              key={item.id}
              variant="ghost"
              size="touch"
              onClick={() => {
                if (isDisabled) {
                  onViewChange("programs")
                  return
                }
                onViewChange(item.id)
              }}
              className={cn(
                "flex-col gap-1.5",
                isActive && !isDisabled && "text-primary bg-primary/10 shadow-[var(--neu-shadow-pressed)] rounded-lg",
                isDisabled && "opacity-40",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
