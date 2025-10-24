"use client"

import { useMemo } from "react"
import { HelpCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import type { TrainingLoadData } from "@/lib/analytics"

interface VolumeTrendChartProps {
  trainingLoad: TrainingLoadData[]
}

export function VolumeTrendChart({ trainingLoad }: VolumeTrendChartProps) {
  const chartData = useMemo(() => {
    if (!trainingLoad || trainingLoad.length === 0) return []

    return trainingLoad.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      volume: Math.round(item.volume / 1000 * 10) / 10, // Convert to kg
      load: Math.round(item.load),
    }))
  }, [trainingLoad])

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Volume Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <p>No workout data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartConfig = {
    volume: {
      label: "Volume",
      color: "#3b82f6",
    },
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Volume Trend</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Total weight lifted per workout day.</p>
                <p className="text-xs mt-1">Shows your training volume over time to track progression.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent>
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              stroke="var(--color-border)"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="var(--color-border)"
              label={{ value: 'Volume (k kg)', angle: -90, position: 'insideLeft' }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="volume"
              stroke="var(--color-volume)"
              strokeWidth={2}
              dot={{ fill: "var(--color-volume)", r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ChartContainer>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
