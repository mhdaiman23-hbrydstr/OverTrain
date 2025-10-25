"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, ChevronDown, ChevronUp } from "lucide-react"
import type { PersonalRecord } from "@/lib/analytics"

interface PersonalRecordsListProps {
  records: PersonalRecord[]
}

const ITEMS_PER_PAGE = 10

export function PersonalRecordsList({ records }: PersonalRecordsListProps) {
  const [expandedAll, setExpandedAll] = useState(false)

  const paginatedRecords = useMemo(() => {
    const itemsToShow = expandedAll ? records.length : ITEMS_PER_PAGE
    return records.slice(0, itemsToShow)
  }, [records, expandedAll])

  const hasMore = records.length > ITEMS_PER_PAGE
  const displayedCount = paginatedRecords.length
  const totalCount = records.length

  if (records.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Personal Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <p>No personal records yet. Log workouts to start tracking PRs!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Personal Records
          </CardTitle>
          <div className="text-xs text-muted-foreground">
            {displayedCount} of {totalCount}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {paginatedRecords.map((record) => (
            <div key={`${record.exerciseId}-${record.weight}-${record.date}-${record.reps}`} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-foreground truncate">
                  {record.exerciseName}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {record.date}
                </div>
              </div>
              <div className="flex items-center gap-3 ml-3">
                <Badge variant="default" className="whitespace-nowrap">
                  {record.weight} kg
                </Badge>
                {record.reps > 0 && (
                  <Badge variant="secondary" className="whitespace-nowrap">
                    {record.reps} reps
                  </Badge>
                )}
              </div>
            </div>
          ))}

          {hasMore && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpandedAll(!expandedAll)}
              className="w-full mt-4"
            >
              {expandedAll ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  View All {totalCount} Records
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
