"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, Target, Dumbbell, Users, ChevronRight, ArrowLeft } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { type Program, ProgramRecommendationEngine } from "@/lib/programs"

interface ProgramRecommendationsProps {
  onBack?: () => void
}

export function ProgramRecommendations({ onBack }: ProgramRecommendationsProps) {
  const { user } = useAuth()
  const [recommendations, setRecommendations] = useState<Program[]>([])
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)

  useEffect(() => {
    if (user && user.gender && user.experience && user.goals) {
      // Only provide recommendations if user has selected a specific gender
      if (user.gender === "Prefer not say") {
        setRecommendations([])
        return
      }

      const userProfile = {
        gender: user.gender as "male" | "female",
        experience: user.experience,
        goals: user.goals,
        equipment: ["Full gym access"], // This should come from user profile
        workoutDays: "3-4", // This should come from user profile
      }

      const programs = ProgramRecommendationEngine.recommendPrograms(userProfile)
      setRecommendations(programs)
    }
  }, [user])

  const handleSelectProgram = (program: Program) => {
    setSelectedProgram(program)
    // Here you would typically save the selected program to the user's profile
    console.log("Selected program:", program.name)
  }

  if (selectedProgram) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setSelectedProgram(null)}>
              ← Back to Recommendations
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{selectedProgram.name}</h1>
              <p className="text-muted-foreground">{selectedProgram.description}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="font-semibold">{selectedProgram.duration}</div>
                <div className="text-sm text-muted-foreground">Duration</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Target className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="font-semibold">{selectedProgram.difficulty}</div>
                <div className="text-sm text-muted-foreground">Level</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Dumbbell className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="font-semibold">{selectedProgram.daysPerWeek} days</div>
                <div className="text-sm text-muted-foreground">Per Week</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="font-semibold">{selectedProgram.gender}</div>
                <div className="text-sm text-muted-foreground">Target</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Workout Schedule</CardTitle>
              <CardDescription>Your weekly training plan</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={selectedProgram.workoutDays[0]?.id} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  {selectedProgram.workoutDays.map((day) => (
                    <TabsTrigger key={day.id} value={day.id}>
                      {day.name}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {selectedProgram.workoutDays.map((day) => (
                  <TabsContent key={day.id} value={day.id} className="space-y-4">
                    <h3 className="text-lg font-semibold">{day.name}</h3>
                    <div className="space-y-3">
                      {day.exercises.map((exercise, index) => {
                        const exerciseData = ProgramRecommendationEngine.getExerciseById(exercise.exerciseId)
                        return (
                          <Card key={index}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                  <h4 className="font-semibold">{exerciseData?.name || exercise.exerciseId}</h4>
                                  <div className="flex gap-4 text-sm text-muted-foreground">
                                    <span>{exercise.sets} sets</span>
                                    <span>{exercise.reps} reps</span>
                                    <span>{exercise.rest} rest</span>
                                  </div>
                                  {exerciseData && (
                                    <div className="flex gap-2 mt-2">
                                      {exerciseData.muscleGroups.slice(0, 3).map((muscle) => (
                                        <Badge key={muscle} variant="secondary" className="text-xs">
                                          {muscle}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button size="lg" className="gradient-primary text-primary-foreground">
              Start This Program
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          )}
          <div className="text-center space-y-2 flex-1">
            <h1 className="text-3xl font-bold">Recommended Programs</h1>
            <p className="text-muted-foreground">
              Based on your goals and preferences, here are the best programs for you
            </p>
          </div>
        </div>

        {recommendations.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Complete your profile to get personalized program recommendations</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {recommendations.map((program) => (
              <Card key={program.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <CardTitle className="text-xl">{program.name}</CardTitle>
                      <CardDescription>{program.description}</CardDescription>
                    </div>
                    <Badge variant={program.difficulty === "beginner" ? "secondary" : "default"}>
                      {program.difficulty}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{program.duration}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dumbbell className="h-4 w-4 text-muted-foreground" />
                      <span>{program.daysPerWeek} days/week</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span>{program.gender}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{program.workoutDays.length} workouts</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Goals:</h4>
                    <div className="flex flex-wrap gap-2">
                      {program.goals.slice(0, 3).map((goal) => (
                        <Badge key={goal} variant="outline" className="text-xs">
                          {goal}
                        </Badge>
                      ))}
                      {program.goals.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{program.goals.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4">
                    <Button variant="outline" onClick={() => setSelectedProgram(program)}>
                      View Details
                    </Button>
                    <Button
                      className="gradient-primary text-primary-foreground"
                      onClick={() => handleSelectProgram(program)}
                    >
                      Select Program
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
