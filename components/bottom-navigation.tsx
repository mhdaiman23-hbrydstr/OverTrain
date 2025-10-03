"use client"
import { cn } from "@/lib/utils"
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
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-4 rounded-lg transition-colors min-h-[48px] min-w-[48px]",
                isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
