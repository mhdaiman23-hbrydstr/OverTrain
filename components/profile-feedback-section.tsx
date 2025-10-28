"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { MessageSquare, Bug, Lightbulb, Star, Send, CheckCircle } from "lucide-react"

export function ProfileFeedbackSection({ initialType = "general" }: { initialType?: string }) {
  const [feedbackType, setFeedbackType] = useState(initialType)
  const [rating, setRating] = useState(0)
  const [subject, setSubject] = useState("")
  const [details, setDetails] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [severity, setSeverity] = useState("medium")
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async () => {
    const typeLabel = feedbackType === "bug" ? "Bug Report" : feedbackType === "feature" ? "Feature Request" : "General Feedback"
    const payload = {
      type: typeLabel,
      rating: feedbackType === "general" ? rating : undefined,
      severity: feedbackType === "bug" ? severity : undefined,
      subject,
      details,
      contactEmail,
    }

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await res.text())
      setIsSubmitted(true)
      setRating(0)
      setSubject("")
      setDetails("")
      setContactEmail("")
    } catch (err) {
      const email = "info@overtrain.app"
      const emailSubject = `[OverTrain] ${typeLabel}: ${subject || "New submission"}`
      const lines = [
        `Type: ${typeLabel}`,
        feedbackType === "general" && rating ? `Rating: ${rating}/5` : undefined,
        feedbackType === "bug" ? `Severity: ${severity}` : undefined,
        subject ? `Subject: ${subject}` : undefined,
        details ? `Details:\n${details}` : undefined,
        contactEmail ? `\nContact Email: ${contactEmail}` : undefined,
      ].filter(Boolean) as string[]
      const body = encodeURIComponent(lines.join("\n"))
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(emailSubject)}&body=${body}`
      setIsSubmitted(true)
    }
  }

  if (isSubmitted) {
    return (
      <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
          <h3 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-2">Thank You!</h3>
          <p className="text-green-700 dark:text-green-300 text-center max-w-md">
            Your feedback has been received. We appreciate your input and will use it to improve OverTrain.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Quick Feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Quick Feedback
          </CardTitle>
          <CardDescription>What would you like to share with us?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              variant={feedbackType === "general" ? "secondary" : "outline"}
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
              variant={feedbackType === "bug" ? "secondary" : "outline"}
              className="h-auto p-4 justify-start"
              onClick={() => { setFeedbackType("bug"); setSeverity("medium"); }}
            >
              <Bug className="h-4 w-4 mr-3 flex-shrink-0" />
              <div className="text-left">
                <div className="font-medium text-sm">Bug Report</div>
                <div className="text-xs text-muted-foreground">Report an issue</div>
              </div>
            </Button>

            <Button
              variant={feedbackType === "feature" ? "secondary" : "outline"}
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
            {feedbackType === "general" && "Share your overall experience with OverTrain"}
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
                  <Button key={star} variant="ghost" size="sm" className="p-2" onClick={() => setRating(star)}>
                    <Star className={`h-6 w-6 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                  </Button>
                ))}
              </div>
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
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={
                (feedbackType === "general" && "Brief summary of your feedback") ||
                (feedbackType === "bug" && "Describe the issue in one line") ||
                "Feature you'd like to see"
              }
            />
          </div>

          {/* Detailed Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Details</Label>
            <Textarea
              id="description"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={
                (feedbackType === "general" && "Tell us more about your experience...") ||
                (feedbackType === "bug" && "Please describe the issue, steps to reproduce, and expected behavior...") ||
                "Describe the feature and how it would help you..."
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
                  <RadioGroup value={severity} onValueChange={setSeverity}>
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
            <Input id="email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="your@email.com" />
            <p className="text-xs text-muted-foreground">Only if you'd like us to follow up with you</p>
          </div>

          {/* Submit Button */}
          <Button onClick={handleSubmit} className="w-full">
            <Send className="h-4 w-4 mr-2" />
            Submit Feedback
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
