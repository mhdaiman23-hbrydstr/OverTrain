"use client"

import { PersonalRecordsList } from "./personal-records-list"
import { TopExercisesPaginated } from "./top-exercises-paginated"
import { Card, CardContent } from "@/components/ui/card"
import { Dumbbell } from "lucide-react"
import type { AdvancedAnalytics } from "@/lib/analytics"

interface StrengthTabContentProps {
  analytics: AdvancedAnalytics
}

export function StrengthTabContent({ analytics }: StrengthTabContentProps) {
  return (
    <div className="space-y-6 mt-4">
      {/* Personal Records */}
      <PersonalRecordsList records={analytics.personalRecords} />

      {/* Top Exercises with Pagination */}
      {analytics.topExercises.length > 0 && (
        <TopExercisesPaginated topExercises={analytics.topExercises} />
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
