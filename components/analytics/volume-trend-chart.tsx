"use client"

import { useMemo, useState, useEffect } from "react"
import { HelpCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MobileTooltip } from "@/components/ui/mobile-tooltip"
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

/**
 * Custom animated dot component for the line chart
 */
function AnimatedDot(props: any) {
  const { cx, cy, index, dataLength } = props
  
  // Stagger animation based on index
  const delay = Math.min(index * 50, 500)
  
  return (
    <circle
      cx={cx}
      cy={cy}
      r={3}
      fill="var(--color-volume)"
      className="animate-scale-in"
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: 'both',
        transformOrigin: `${cx}px ${cy}px`,
      }}
    />
  )
}

/**
 * Custom active dot with spring animation
 */
function AnimatedActiveDot(props: any) {
  const { cx, cy } = props
  
  return (
    <g>
      {/* Pulse ring */}
      <circle
        cx={cx}
        cy={cy}
        r={12}
        fill="none"
        stroke="var(--color-volume)"
        strokeWidth={2}
        opacity={0.3}
        className="animate-timer-pulse"
      />
      {/* Main dot */}
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill="var(--color-volume)"
        className="animate-bounce-in"
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />
    </g>
  )
}

export function VolumeTrendChart({ trainingLoad }: VolumeTrendChartProps) {
  const [isVisible, setIsVisible] = useState(false)
  
  // Trigger animation when component mounts
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])
  
  const chartData = useMemo(() => {
    if (!trainingLoad || trainingLoad.length === 0) return []

    return trainingLoad.map((item, index) => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      volume: Math.round(item.volume / 1000 * 10) / 10, // Convert to kg
      load: Math.round(item.load),
      index, // For staggered animations
    }))
  }, [trainingLoad])

  if (chartData.length === 0) {
    return (
      <Card className="animate-fade-in">
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
    <Card className={`transition-all duration-300 ${isVisible ? 'animate-slide-up' : 'opacity-0'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Volume Trend</CardTitle>
          <MobileTooltip
            content={
              <div className="space-y-1">
                <p>Total weight lifted per workout day.</p>
                <p className="text-xs">Shows your training volume over time to track progression.</p>
              </div>
            }
          >
            <button
              type="button"
              className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              aria-label="Volume trend explanation"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </MobileTooltip>
        </div>
      </CardHeader>
      <CardContent>
      <ChartContainer config={chartConfig} className="h-64 w-full gpu-accelerated">
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="var(--color-border)"
            className={isVisible ? 'animate-fade-in stagger-1' : 'opacity-0'}
          />
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
            dot={<AnimatedDot dataLength={chartData.length} />}
            activeDot={<AnimatedActiveDot />}
            isAnimationActive={true}
            animationBegin={200}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </LineChart>
      </ChartContainer>
      </CardContent>
    </Card>
  )
}
