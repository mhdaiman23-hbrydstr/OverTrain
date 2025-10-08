"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface IntakeFormData {
  name: string
  gender: "Male" | "Female" | "Prefer not say" | ""
  experience: "Beginner" | "Intermediate" | "Advanced" | ""
  goals: string[]
}

const MALE_GOALS = [
  "Build muscle mass",
  "Increase strength",
  "Lose fat",
  "Improve athletic performance",
  "General fitness",
  "Powerlifting",
  "Bodybuilding",
]

const FEMALE_GOALS = [
  "Tone and sculpt",
  "Build lean muscle",
  "Lose weight",
  "Improve strength",
  "General fitness",
  "Athletic performance",
  "Postural improvement",
]

export function IntakeForm() {
  const { updateUser } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<IntakeFormData>({
    name: "",
    gender: "",
    experience: "",
    goals: [],
  })

  const totalSteps = 3
  const progress = (currentStep / totalSteps) * 100

  const handleInputChange = (field: keyof IntakeFormData, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleGoalToggle = (goal: string) => {
    setFormData((prev) => ({
      ...prev,
      goals: prev.goals.includes(goal) ? prev.goals.filter((g) => g !== goal) : [...prev.goals, goal],
    }))
  }

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleSubmit = async () => {
    console.log('[IntakeForm] Submitting profile:', formData)
    console.log('[IntakeForm] canProceed:', canProceed())

    try {
      await updateUser({
        name: formData.name,
        gender: formData.gender as "male" | "female" | "Prefer not say",
        experience: formData.experience as "beginner" | "intermediate" | "advanced",
        goals: formData.goals,
      })
      console.log('[IntakeForm] Profile saved successfully')
    } catch (error) {
      console.error('[IntakeForm] Failed to save profile:', error)
      // Show error to user
      alert('Failed to save profile. Please try again.')
    }
  }

  const handleSkip = async () => {
    try {
      await updateUser({
        name: "User",
        gender: "male", // Default values for skipped profile
        experience: "beginner",
        goals: ["General fitness"],
      })
    } catch (error) {
      console.error('Failed to save profile:', error)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name && formData.gender
      case 2:
        return formData.experience
      case 3:
        return formData.goals.length > 0
      default:
        return false
    }
  }

  const availableGoals = formData.gender === "Male" ? MALE_GOALS : FEMALE_GOALS

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>Help us create the perfect workout plan for you</CardDescription>
          <div className="mt-4">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2">
              Step {currentStep} of {totalSteps}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <Label>Gender</Label>
                <RadioGroup value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male">Male</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female">Female</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Prefer not say" id="prefer-not-say" />
                    <Label htmlFor="prefer-not-say">Prefer not to say</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Step 2: Experience Level */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Fitness Experience</h3>
              <p className="text-sm text-muted-foreground">
                This helps us recommend the right workout programs for you
              </p>

              <div className="space-y-3">
                <RadioGroup
                  value={formData.experience}
                  onValueChange={(value) => handleInputChange("experience", value)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="beginner" id="beginner" />
                    <Label htmlFor="beginner">Beginner (0-3 years)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="intermediate" id="intermediate" />
                    <Label htmlFor="intermediate">Intermediate (3-7 years)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="advanced" id="advanced" />
                    <Label htmlFor="advanced">Advanced (7+ years)</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Step 3: Goals */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                {formData.gender === "Male" ? "Your Fitness Goals" : "Your Fitness Goals"}
              </h3>
              <p className="text-sm text-muted-foreground">Select all that apply to you</p>

              <div className="grid grid-cols-1 gap-3">
                {availableGoals.map((goal) => (
                  <div key={goal} className="flex items-center space-x-2">
                    <Checkbox
                      id={goal}
                      checked={formData.goals.includes(goal)}
                      onCheckedChange={() => handleGoalToggle(goal)}
                    />
                    <Label htmlFor={goal} className="text-sm font-normal">
                      {goal}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-6">
            <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 1} className="w-full sm:w-auto">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <Button
              variant="ghost"
              onClick={handleSkip}
              className="w-full sm:w-auto text-muted-foreground hover:text-foreground border border-border hover:bg-accent"
            >
              Skip for now
            </Button>

            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="w-full sm:w-auto gradient-primary text-primary-foreground"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed()}
                className="w-full sm:w-auto gradient-primary text-primary-foreground whitespace-nowrap"
              >
                Complete Setup
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
