"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { MessageSquare, Bug, Lightbulb, Star, Send, CheckCircle } from "lucide-react"

export function ProfileFeedbackSection() {
  const [feedbackType, setFeedbackType] = useState("general")
  const [rating, setRating] = useState(0)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = () => {
    setIsSubmitted(true)
    // In a real app, this would send the feedback to a backend
    setTimeout(() => {
      setIsSubmitted(false)
      setRating(0)
    }, 3000)
  }

  if (isSubmitted) {
    return (
      <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
          <h3 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-2">
            Thank You!
          </h3>
          <p className="text-green-700 dark:text-green-300 text-center max-w-md">
            Your feedback has been received. We appreciate your input and will use it to improve LiftLog.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Quick Feedback Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Quick Feedback
          </CardTitle>
          <CardDescription>
            What would you like to share with us?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              variant={feedbackType === "general" ? "default" : "outline"}
              className="h-auto p-4 justify-start"
              onClick={() => setFeedbackType("general")}
            >
              <MessageSquare className="h-4 w-4 mr-3 flex-shrink-0" />
              <div className="text-left">
                <div className="font-medium text-sm">General Feedback</div>
                <div className="text-xs text-muted-foreground">Share your thoughts</div>
              </div>
            </Button>
            <Button
              variant={feedbackType === "bug" ? "default" : "outline"}
              className="h-auto p-4 justify-start"
              onClick={() => setFeedbackType("bug")}
            >
              <Bug className="h-4 w-4 mr-3 flex-shrink-0" />
              <div className="text-left">
                <div className="font-medium text-sm">Bug Report</div>
                <div className="text-xs text-muted-foreground">Report an issue</div>
              </div>
            </Button>
            <Button
              variant={feedbackType === "feature" ? "default" : "outline"}
              className="h-auto p-4 justify-start"
              onClick={() => setFeedbackType("feature")}
            >
              <Lightbulb className="h-4 w-4 mr-3 flex-shrink-0" />
              <div className="text-left">
                <div className="font-medium text-sm">Feature Request</div>
                <div className="text-xs text-muted-foreground">Suggest improvements</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Feedback Form */}
      <Card>
        <CardHeader>
          <CardTitle>
            {feedbackType === "general" && "General Feedback"}
            {feedbackType === "bug" && "Bug Report"}
            {feedbackType === "feature" && "Feature Request"}
          </CardTitle>
          <CardDescription>
            {feedbackType === "general" && "Share your overall experience with LiftLog"}
            {feedbackType === "bug" && "Help us identify and fix issues"}
            {feedbackType === "feature" && "Suggest new features or improvements"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Rating Section for General Feedback */}
          {feedbackType === "general" && (
            <div className="space-y-3">
              <Label>Overall Rating</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Button
                    key={star}
                    variant="ghost"
                    size="sm"
                    className="p-2"
                    onClick={() => setRating(star)}
                  >
                    <Star
                      className={`h-6 w-6 ${
                        star <= rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  </Button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {rating === 0 && "Please rate your experience"}
                {rating === 1 && "Very Poor"}
                {rating === 2 && "Poor"}
                {rating === 3 && "Average"}
                {rating === 4 && "Good"}
                {rating === 5 && "Excellent"}
              </p>
            </div>
          )}

          {/* Subject/Title */}
          <div className="space-y-2">
            <Label htmlFor="subject">
              {feedbackType === "general" && "Subject"}
              {feedbackType === "bug" && "Bug Title"}
              {feedbackType === "feature" && "Feature Title"}
            </Label>
            <Input
              id="subject"
              placeholder={
                feedbackType === "general" && "Brief summary of your feedback"
                || feedbackType === "bug" && "Describe the issue in one line"
                || "Feature you'd like to see"
              }
            />
          </div>

          {/* Detailed Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Details</Label>
            <Textarea
              id="description"
              placeholder={
                feedbackType === "general" && "Tell us more about your experience..."
                || feedbackType === "bug" && "Please describe the issue, steps to reproduce, and expected behavior..."
                || "Describe the feature and how it would help you..."
              }
              className="min-h-[120px]"
            />
          </div>

          {/* Additional context for bug reports */}
          {feedbackType === "bug" && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <RadioGroup defaultValue="medium">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="low" id="low" />
                      <Label htmlFor="low">Low - Minor inconvenience</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="medium" />
                      <Label htmlFor="medium">Medium - Affects usability</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="high" id="high" />
                      <Label htmlFor="high">High - Major issue</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="critical" id="critical" />
                      <Label htmlFor="critical">Critical - App unusable</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </>
          )}

          {/* Contact Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
            />
            <p className="text-xs text-muted-foreground">
              Only if you'd like us to follow up with you
            </p>
          </div>

          {/* Submit Button */}
          <Button onClick={handleSubmit} className="w-full">
            <Send className="h-4 w-4 mr-2" />
            Submit Feedback
          </Button>
        </CardContent>
      </Card>

      {/* Recent Feedback Status */}
      <Card>
        <CardHeader>
          <CardTitle>Your Recent Feedback</CardTitle>
          <CardDescription>
            Track the status of your previous submissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Badge variant="outline">Bug Report</Badge>
                <div>
                  <p className="font-medium text-sm">Calendar sync issue</p>
                  <p className="text-xs text-muted-foreground">Submitted 2 days ago</p>
                </div>
              </div>
              <Badge variant="default" className="bg-yellow-500">In Review</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Badge variant="outline">Feature Request</Badge>
                <div>
                  <p className="font-medium text-sm">Add workout reminders</p>
                  <p className="text-xs text-muted-foreground">Submitted 1 week ago</p>
                </div>
              </div>
              <Badge variant="default" className="bg-green-500">Implemented</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
