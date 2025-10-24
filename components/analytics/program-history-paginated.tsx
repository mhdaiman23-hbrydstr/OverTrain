"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"

interface ProgramHistoryPaginatedProps {
  programHistory: any[]
  formatVolume: (volume: number) => string
}

const ITEMS_PER_PAGE = 5

export function ProgramHistoryPaginated({ programHistory, formatVolume }: ProgramHistoryPaginatedProps) {
  const [expandedAll, setExpandedAll] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const paginatedPrograms = useMemo(() => {
    const itemsToShow = expandedAll ? programHistory.length : ITEMS_PER_PAGE
    return programHistory.slice(0, itemsToShow)
  }, [programHistory, expandedAll])

  const hasMore = programHistory.length > ITEMS_PER_PAGE
  const displayedCount = paginatedPrograms.length
  const totalCount = programHistory.length

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Program History</CardTitle>
          <div className="text-xs text-muted-foreground">
            {displayedCount} of {totalCount}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {paginatedPrograms.map((program: any, idx: number) => (
            <div key={idx} className="p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-sm">{program.name || 'Unnamed Program'}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {program.endDate ? new Date(program.endDate).toLocaleDateString() : 'In Progress'}
                  </p>
                </div>
                <Badge
                  variant={program.completionRate === 100 ? 'default' : 'secondary'}
                  className={program.completionRate === 100 ? 'bg-green-600' : ''}
                >
                  {(program.completionRate || 0).toFixed(2)}%
                </Badge>
              </div>
              <Progress value={program.completionRate || 0} className="h-2" />
              <div className="grid grid-cols-3 gap-3 mt-3 text-xs text-muted-foreground">
                <div>
                  <div className="text-muted-foreground">Duration</div>
                  <div className="font-medium text-foreground">{program.duration || '-'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Workouts</div>
                  <div className="font-medium text-foreground">{program.workoutsCompleted || 0}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Volume</div>
                  <div className="font-medium text-foreground">{formatVolume(program.totalVolume || 0)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

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
                View All {totalCount} Programs
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
