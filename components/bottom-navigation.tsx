"use client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dumbbell, Calendar, BarChart3, User } from "lucide-react"

interface BottomNavigationProps {
  currentView: string
  onViewChange: (view: string) => void
}

export function BottomNavigation({ currentView, onViewChange }: BottomNavigationProps) {
  const navItems = [
    {
      id: "train",
      label: "Train",
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
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentView === item.id

          return (
            <Button
              key={item.id}
              variant="ghost"
              size="touch"
              onClick={() => onViewChange(item.id)}
              className={cn(
                "flex-col gap-1.5",
                isActive && "text-primary bg-primary/10",
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
