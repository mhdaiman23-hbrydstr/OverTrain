"use client"

import { useState, useMemo } from "react"
import { PersonalRecordsList } from "./personal-records-list"
import { TopExercisesPaginated } from "./top-exercises-paginated"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dumbbell, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AdvancedAnalytics } from "@/lib/analytics"

interface StrengthTabContentProps {
  analytics: AdvancedAnalytics
}

export function StrengthTabContent({ analytics }: StrengthTabContentProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // Filter exercises based on search query
  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) {
      return analytics.topExercises
    }

    const query = searchQuery.toLowerCase()
    return analytics.topExercises.filter(exercise =>
      exercise.exerciseName.toLowerCase().includes(query)
    )
  }, [analytics.topExercises, searchQuery])

  return (
    <div className="space-y-6 mt-4">
      {/* Search Bar */}
      {analytics.topExercises.length > 0 && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {searchQuery && filteredExercises.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              No exercises found matching "{searchQuery}"
            </p>
          )}
        </div>
      )}

      {/* Personal Records */}
      <PersonalRecordsList records={analytics.personalRecords} />

      {/* Top Exercises with Pagination */}
      {filteredExercises.length > 0 && (
        <TopExercisesPaginated topExercises={filteredExercises} />
      )}

      {analytics.topExercises.length === 0 && analytics.personalRecords.length === 0 && (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <h3 className="font-semibold text-muted-foreground mb-1">No strength data yet</h3>
              <p className="text-sm text-muted-foreground">
                Complete workouts to start tracking your strength progress and personal records.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
