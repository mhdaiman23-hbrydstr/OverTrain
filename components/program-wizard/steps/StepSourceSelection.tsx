import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { ProgramSource } from '../types'

interface StepSourceSelectionProps {
  onSelect: (source: Exclude<ProgramSource, null>) => void
}

export function StepSourceSelection({ onSelect }: StepSourceSelectionProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="border border-border/70 hover:border-primary/60 transition-colors">
        <CardHeader>
          <CardTitle>Start from a template</CardTitle>
          <CardDescription>Pick one of LiftLog&apos;s proven programs and customize it to match your goals.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>Best if you want a structured starting point with pre-built workouts and progressions.</p>
            <ul className="space-y-2 list-disc list-inside">
              <li>Filter by day count, experience, and goals</li>
              <li>Reorder, remove, and swap exercises</li>
              <li>Rename days and tweak rest times</li>
            </ul>
          </div>
          <Button className="mt-6 w-full" onClick={() => onSelect('template')}>
            Customize a template
          </Button>
        </CardContent>
      </Card>

      <Card className="border border-border/70 hover:border-primary/60 transition-colors">
        <CardHeader>
          <CardTitle>Build from scratch</CardTitle>
          <CardDescription>Create a completely custom plan by choosing muscle groups and exercises yourself.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>Perfect when you have a specific split or exercise list in mind.</p>
            <ul className="space-y-2 list-disc list-inside">
              <li>Select target muscle groups per day</li>
              <li>Assign exercises with quick randomize</li>
              <li>Full control over progression setup</li>
            </ul>
          </div>
          <Button className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => onSelect('scratch')}>
            Start from scratch
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

