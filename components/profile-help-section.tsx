"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { HelpCircle, Book, MessageCircle, Mail, ExternalLink } from "lucide-react"

export function ProfileHelpSection() {
  const faqs = [
    {
      question: "How do I start a new workout program?",
      answer: "Navigate to the Programs section from the sidebar, browse available programs, and select one that matches your goals and experience level. Click 'Start Program' to begin your fitness journey."
    },
    {
      question: "Can I customize my workout programs?",
      answer: "Yes! While in a program, you can modify exercises, adjust weights, and change rep ranges. Your customizations are saved and will apply to future workout sessions."
    },
    {
      question: "How is my progress tracked?",
      answer: "LiftLog automatically tracks your workout history, personal records, strength gains, and consistency. View detailed analytics in the Analytics section to monitor your progress over time."
    },
    {
      question: "What if I miss a workout day?",
      answer: "Don't worry! The program will automatically adjust. You can either skip the missed day or make it up on your rest day. Consistency is key, but occasional misses are normal."
    },
    {
      question: "How do I change my fitness goals?",
      answer: "Go to your Profile section and click 'Edit' on your fitness profile. You can update your goals, experience level, and preferences at any time."
    },
    {
      question: "Is my data backed up?",
      answer: "Yes, all your workout data is automatically backed up to the cloud and synced across your devices. You can also export your data at any time from the Settings section."
    }
  ]

  const quickLinks = [
    { title: "User Guide", description: "Complete guide to using LiftLog", icon: Book },
    { title: "Contact Support", description: "Get help from our team", icon: Mail }
  ]

  return (
    <div className="space-y-6">
      {/* Quick Help */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Quick Help
          </CardTitle>
          <CardDescription>
            Get answers to common questions and find resources
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quickLinks.map((link, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 justify-start"
              >
                <link.icon className="h-4 w-4 mr-3 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-medium text-sm">{link.title}</div>
                  <div className="text-xs text-muted-foreground">{link.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Frequently Asked Questions */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
          <CardDescription>
            Common questions about using LiftLog
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Support Status */}
      <Card>
        <CardHeader>
          <CardTitle>Support Status</CardTitle>
          <CardDescription>
            Current system status and support availability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">System Status</span>
            <Badge variant="default" className="bg-green-500">All Systems Operational</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Support Response Time</span>
            <Badge variant="outline">Usually within 2 hours</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Last Update</span>
            <span className="text-sm text-muted-foreground">Version 1.0.0 - Current</span>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Help */}
      <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
        <CardHeader>
          <CardTitle className="text-orange-800 dark:text-orange-200">
            Need Immediate Help?
          </CardTitle>
          <CardDescription className="text-orange-700 dark:text-orange-300">
            If you're experiencing technical issues or have urgent questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/20">
              <Mail className="h-4 w-4 mr-2" />
              Email Support
            </Button>
            <Button variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/20">
              <MessageCircle className="h-4 w-4 mr-2" />
              Live Chat
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
