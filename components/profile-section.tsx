"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/auth-context"
import { User, Mail, Target, Award, LogOut, Edit2, Check, X } from "lucide-react"
import type { User as UserType } from "@/lib/auth"

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

export function ProfileSection() {
  const { user, updateUser, signOut } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || "",
    gender: user?.gender || "",
    experience: user?.experience || "",
    goals: user?.goals || [],
  })

  if (!user) return null

  const handleSave = () => {
    updateUser({
      name: formData.name,
      gender: formData.gender as "male" | "female" | "Prefer not say",
      experience: formData.experience as "beginner" | "intermediate" | "advanced",
      goals: formData.goals,
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setFormData({
      name: user?.name || "",
      gender: user?.gender || "",
      experience: user?.experience || "",
      goals: user?.goals || [],
    })
    setIsEditing(false)
  }

  const handleGoalToggle = (goal: string) => {
    setFormData((prev) => ({
      ...prev,
      goals: prev.goals.includes(goal) ? prev.goals.filter((g) => g !== goal) : [...prev.goals, goal],
    }))
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const availableGoals = formData.gender === "male" ? MALE_GOALS : FEMALE_GOALS

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="space-y-6 pt-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-muted-foreground text-sm">Manage your account and preferences</p>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {getInitials(user.name || user.email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{user.name || "User"}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {user.email}
                  </CardDescription>
                </div>
              </div>
              {!isEditing && (
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Gender</Label>
                  <RadioGroup
                    value={formData.gender}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, gender: value }))}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="male" id="edit-male" />
                      <Label htmlFor="edit-male">Male</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="female" id="edit-female" />
                      <Label htmlFor="edit-female">Female</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Prefer not say" id="edit-prefer" />
                      <Label htmlFor="edit-prefer">Prefer not to say</Label>
                    </div>
                  </RadioGroup>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Name</span>
                  <span className="text-sm font-medium">{user.name || "Not set"}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Gender</span>
                  <span className="text-sm font-medium">{user.gender || "Not set"}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-sm font-medium">{user.email}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fitness Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Fitness Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label>Experience Level</Label>
                  <RadioGroup
                    value={formData.experience}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, experience: value }))}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="beginner" id="edit-beginner" />
                      <Label htmlFor="edit-beginner">Beginner (0-3 years)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="intermediate" id="edit-intermediate" />
                      <Label htmlFor="edit-intermediate">Intermediate (3-7 years)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="advanced" id="edit-advanced" />
                      <Label htmlFor="edit-advanced">Advanced (7+ years)</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Fitness Goals</Label>
                  <div className="space-y-2">
                    {availableGoals.map((goal) => (
                      <div key={goal} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-${goal}`}
                          checked={formData.goals.includes(goal)}
                          onCheckedChange={() => handleGoalToggle(goal)}
                        />
                        <Label htmlFor={`edit-${goal}`} className="text-sm font-normal">
                          {goal}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Experience</span>
                  <span className="text-sm font-medium capitalize">{user.experience || "Not set"}</span>
                </div>
                <Separator />
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Goals</span>
                  <div className="flex flex-wrap gap-2">
                    {user.goals && user.goals.length > 0 ? (
                      user.goals.map((goal) => (
                        <span
                          key={goal}
                          className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                        >
                          {goal}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No goals set</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Actions */}
        {isEditing && (
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button className="flex-1 gradient-primary text-primary-foreground" onClick={handleSave}>
              <Check className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        )}

        {/* Account Actions */}
        {!isEditing && (
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        )}

        {/* App Info */}
        <div className="text-center text-xs text-muted-foreground pb-4">
          <p>LiftLog v1.0.0</p>
          <p className="mt-1">Made with 💪 for fitness enthusiasts</p>
        </div>
      </div>
    </div>
  )
}
