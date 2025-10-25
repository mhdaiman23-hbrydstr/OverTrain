"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useAuth } from "@/contexts/auth-context"
import { User, Mail, Target, Award, LogOut, Edit2, Check, X, Settings, HelpCircle, MessageSquare } from "lucide-react"
import type { User as UserType } from "@/lib/auth"
import { ProfileSettingsPanel } from "@/components/profile-settings-panel"
import { ProfileHelpSection } from "@/components/profile-help-section"
import { ProfileFeedbackSection } from "@/components/profile-feedback-section"
import { SubscriptionManagement } from "@/components/subscription-management"

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
  const [activeTab, setActiveTab] = useState("profile")
  const [feedbackType, setFeedbackType] = useState("general")
  const [isEditing1RM, setIsEditing1RM] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || "",
    gender: user?.gender || "",
    experience: user?.experience || "",
    goals: user?.goals || [],
    bodyweight: user?.bodyweight || 0,
  })
  const [oneRMData, setOneRMData] = useState({
    squat: user?.oneRepMax?.squat || 0,
    benchPress: user?.oneRepMax?.benchPress || 0,
    deadlift: user?.oneRepMax?.deadlift || 0,
  })
  const [initial1RMData, setInitial1RMData] = useState({
    squat: user?.oneRepMax?.squat || 0,
    benchPress: user?.oneRepMax?.benchPress || 0,
    deadlift: user?.oneRepMax?.deadlift || 0,
  })
  const [preferredUnit, setPreferredUnit] = useState<"metric" | "imperial">(user?.preferredUnit || "metric")
  const [initialPreferredUnit, setInitialPreferredUnit] = useState<"metric" | "imperial">(user?.preferredUnit || "metric")
  const [showSignOutDialog, setShowSignOutDialog] = useState(false)

  // Handle custom events for navigation from sidebar
  useEffect(() => {
    const handleNavigateToHelpTab = () => {
      setActiveTab("help")
    }

    const handleNavigateToFeedbackTab = (event: any) => {
      setActiveTab("help")
      if (event.detail?.type === 'general') {
        setFeedbackType("general")
      }
    }

    window.addEventListener('navigateToHelpTab', handleNavigateToHelpTab)
    window.addEventListener('navigateToFeedbackTab', handleNavigateToFeedbackTab)

    return () => {
      window.removeEventListener('navigateToHelpTab', handleNavigateToHelpTab)
      window.removeEventListener('navigateToFeedbackTab', handleNavigateToFeedbackTab)
    }
  }, [])

  if (!user) return null

  const handleSave = async () => {
    try {
      await updateUser({
        name: formData.name,
        gender: formData.gender as "male" | "female" | "Prefer not say",
        experience: formData.experience as "beginner" | "intermediate" | "advanced",
        goals: formData.goals,
        bodyweight: formData.bodyweight,
        preferredUnit: preferredUnit,
      })
      setInitialPreferredUnit(preferredUnit)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save profile:', error)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: user?.name || "",
      gender: user?.gender || "",
      experience: user?.experience || "",
      goals: user?.goals || [],
      bodyweight: user?.bodyweight || 0,
    })
    setPreferredUnit(initialPreferredUnit)
    setIsEditing(false)
  }

  const handleSave1RM = async () => {
    try {
      await updateUser({
        oneRepMax: oneRMData,
        preferredUnit: preferredUnit,
      })
      setInitial1RMData(oneRMData)
      setInitialPreferredUnit(preferredUnit)
      setIsEditing1RM(false)
    } catch (error) {
      console.error('Failed to save 1RM data:', error)
    }
  }

  const handleCancel1RM = () => {
    setOneRMData(initial1RMData)
    setPreferredUnit(initialPreferredUnit)
    setIsEditing1RM(false)
  }

  const handle1RMChange = (lift: keyof typeof oneRMData, value: string) => {
    const numValue = parseFloat(value) || 0
    setOneRMData(prev => ({
      ...prev,
      [lift]: numValue
    }))
    
    // Auto-enable edit mode if user starts typing
    if (!isEditing1RM && numValue !== initial1RMData[lift]) {
      setIsEditing1RM(true)
    }
  }

  const has1RMChanges = JSON.stringify(oneRMData) !== JSON.stringify(initial1RMData) ||
                       JSON.stringify(preferredUnit) !== JSON.stringify(initialPreferredUnit)

  // Check if at least one 1RM value is set (greater than 0)
  const hasValidOneRMData = oneRMData.squat > 0 || oneRMData.benchPress > 0 || oneRMData.deadlift > 0

  const handleUnitChange = (unit: "metric" | "imperial") => {
    setPreferredUnit(unit)
    // Auto-enable edit mode if user changes unit
    if (!isEditing1RM && unit !== initialPreferredUnit) {
      setIsEditing1RM(true)
    }
  }

  const getUnitLabel = () => {
    return preferredUnit === "metric" ? "kg" : "lbs"
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
    <div className="min-h-screen bg-background pb-20 lg:pb-4">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/50 z-[60] shadow-sm">
        <div className="text-center space-y-1 px-4 py-3 sm:py-4">
          <h1 className="text-xl sm:text-2xl font-bold">Profile</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Manage your account and preferences</p>
        </div>
      </div>

      <div className="p-4 pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="training" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Training</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="help" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Help</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
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

                    <div className="space-y-2">
                      <Label htmlFor="bodyweight">Bodyweight</Label>
                      <Input
                        id="bodyweight"
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder={`Enter your bodyweight in ${preferredUnit === "metric" ? "kg" : "lbs"}`}
                        value={formData.bodyweight || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, bodyweight: parseFloat(e.target.value) || 0 }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Unit: {preferredUnit === "metric" ? "kilograms (kg)" : "pounds (lbs)"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unit-selector">Preferred Unit</Label>
                      <Select value={preferredUnit} onValueChange={handleUnitChange}>
                        <SelectTrigger id="unit-selector" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="metric">Metric (kg)</SelectItem>
                          <SelectItem value="imperial">Imperial (lbs)</SelectItem>
                        </SelectContent>
                      </Select>
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
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Bodyweight</span>
                      <span className="text-sm font-medium">
                        {user.bodyweight ? `${user.bodyweight} ${user.preferredUnit === "metric" ? "kg" : "lbs"}` : "Not set"}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Preferred Unit</span>
                      <span className="text-sm font-medium">
                        {user.preferredUnit === "imperial" ? "Imperial (Lbs)" : "Metric (Kg)"}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Edit Actions - Show immediately after Personal Information */}
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

            {/* Subscription Management */}
            <SubscriptionManagement />

            {/* Account Actions */}
            {!isEditing && (
              <Card>
                <CardHeader>
                  <CardTitle>Account</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setShowSignOutDialog(true)}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Training Tab */}
          <TabsContent value="training" className="space-y-6">
            {/* Fitness Profile */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Fitness Profile
                  </CardTitle>
                  {!isEditing && (
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
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

            {/* Edit Actions for Training - Show immediately after Fitness Profile */}
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

            {/* 1RM Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  One Rep Max (1RM)
                </CardTitle>
                <CardDescription>Enter your current personal records for the main lifts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="squat-1rm">Squat ({getUnitLabel()})</Label>
                    <Input
                      id="squat-1rm"
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="0"
                      value={oneRMData.squat || ""}
                      onChange={(e) => handle1RMChange('squat', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bench-1rm">Bench Press ({getUnitLabel()})</Label>
                    <Input
                      id="bench-1rm"
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="0"
                      value={oneRMData.benchPress || ""}
                      onChange={(e) => handle1RMChange('benchPress', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="deadlift-1rm">Deadlift ({getUnitLabel()})</Label>
                    <Input
                      id="deadlift-1rm"
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="0"
                      value={oneRMData.deadlift || ""}
                      onChange={(e) => handle1RMChange('deadlift', e.target.value)}
                    />
                  </div>
                </div>

                {/* Show save buttons when user makes changes and has at least one valid 1RM value */}
                {has1RMChanges && (
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" className="flex-1" onClick={handleCancel1RM}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 gradient-primary text-primary-foreground"
                      onClick={handleSave1RM}
                      disabled={!hasValidOneRMData}
                      title={!hasValidOneRMData ? "Enter at least one 1RM value to save" : ""}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Save 1RM
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <ProfileSettingsPanel />
          </TabsContent>

          {/* Help Tab */}
          <TabsContent value="help" className="space-y-6">
            <Tabs defaultValue="faq" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="faq" className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  <span>FAQ</span>
                </TabsTrigger>
                <TabsTrigger value="feedback" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Feedback</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="faq">
                <ProfileHelpSection />
              </TabsContent>

              <TabsContent value="feedback">
                <ProfileFeedbackSection initialType={feedbackType} />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>

        {/* App Info */}
        <div className="text-center text-xs text-muted-foreground pb-4 pt-6">
          <p>LiftLog v1.0.0</p>
          <p className="mt-1">Made with 💪 for fitness enthusiasts</p>
        </div>
      </div>

      {/* Sign Out Confirmation Dialog */}
      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You'll need to sign in again to access your account and workout data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={signOut}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
