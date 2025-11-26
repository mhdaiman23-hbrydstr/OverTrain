"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { HelpCircle, Book, Mail } from "lucide-react"
import { APP_VERSION } from "@/lib/version"

export function ProfileHelpSection() {
  const [supportOpen, setSupportOpen] = useState(false)
  const [supportSubject, setSupportSubject] = useState("")
  const [supportMessage, setSupportMessage] = useState("")
  const [supportEmail, setSupportEmail] = useState("")
  const [sending, setSending] = useState(false)

  const faqs = [
    {
      question: "How do I start a new program?",
      answer: "Go to Programs from the sidebar. Pick a template or recommended plan based on your goals and experience, then select Start Program. OverTrain will create your first week automatically."
    },
    {
      question: "Can I customize my workouts?",
      answer: "Yes. Edit exercises, sets, reps, rest and notes on any day. You can swap exercises and save layouts as templates. You can also create full programs from built-in templates, or build your own templates from scratch and start a program from them."
    },
    {
      question: "How is progress tracked?",
      answer: "OverTrain tracks PRs, weekly volume, intensity, and consistency. Analytics includes progress charts and a consistency heatmap so you can spot trends quickly."
    },
    {
      question: "What if I miss a workout?",
      answer: "You can reschedule or skip with one tap. The plan rolls forward so you never lose your place."
    },
    {
      question: "How do I change my goals or units?",
      answer: "Open Profile → Training to update goals and experience, and Profile → Settings to switch between Metric (kg) and Imperial (lbs)."
    },
    {
      question: "Is my data synced and backed up?",
      answer: "Yes. Your data is backed up in the cloud and syncs across devices. You can export it anytime from Profile → Settings → Data Management."
    },
    {
      question: "What is RPE/RIR tracking?",
      answer: "OverTrain\ lets\ you\ log\ difficulty\ using\ RPE\ \(Rate\ of\ Perceived\ Exertion\)\ or\ RIR\ \(Reps\ In\ Reserve\)\.\ Choose\ your\ preferred\ display\ in\ Profile\ →\ Training\.\ This\ helps\ the\ app\ understand\ relative\ intensity\ across\ sets\ and\ weeks\.\ You\ can\ track\ at\ the\ block\ level\ \(apply\ RPE/RIR\ rules\ across\ a\ whole\ program\ block\)\ and\ also\ override\ per\ exercise\ with\ custom\ targets\ when\ needed\.\ To\ set\ a\ per-exercise\ target,\ click\ the\ small\ dot\ next\ to\ the\ exercise\ name;\ this\ adds\ a\ custom\ RPE\ that\ does\ not\ affect\ your\ program's\ block-level\ tracking\."
    },
    {
      question: "How does auto progression work?",
      answer: "Based on your logged performance, targets, and RPE/RIR, OverTrain can nudge weights, reps, or volume week‑to‑week to drive progressive overload while managing fatigue. You can always override recommendations during a session."
    }
  ]

  const quickLinks = [
    { title: "User Guide", description: "Complete guide to using OverTrain", icon: Book },
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
<Button key={index} variant="outline" className="h-auto p-4 justify-start" onClick={() => { if (link.title === "Contact Support") setSupportOpen(true) }}>
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
          <CardDescription>Common questions about using OverTrain</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Support Status */}
      <Card>
        <CardHeader>
          <CardTitle>Support Status</CardTitle>
          <CardDescription>Current system status and support availability</CardDescription>
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
            <span className="text-sm text-muted-foreground">Version {APP_VERSION} - Current</span>
          </div>
        </CardContent>
      </Card>

      {/* Immediate Help */}
      <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
        <CardHeader>
          <CardTitle className="text-orange-800 dark:text-orange-200">Need Immediate Help?</CardTitle>
          <CardDescription className="text-orange-700 dark:text-orange-300">If you're experiencing technical issues or have urgent questions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/20">
                  <Mail className="h-4 w-4 mr-2" />
                  Email Support
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Contact Support</DialogTitle>
                  <DialogDescription>Send a message to our team. We usually reply within 2 hours.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Subject" value={supportSubject} onChange={(e) => setSupportSubject(e.target.value)} />
                  <Textarea placeholder="How can we help?" className="min-h-[120px]" value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} />
                  <Input placeholder="Your email (optional)" type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setSupportOpen(false)}>Cancel</Button>
                  <Button disabled={sending} onClick={async () => {
                    setSending(true)
                    try {
                      const res = await fetch('/api/feedback', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'Support', subject: supportSubject, details: supportMessage, contactEmail: supportEmail })
                      })
                      if (!res.ok) throw new Error(await res.text())
                      setSupportSubject(''); setSupportMessage(''); setSupportEmail(''); setSupportOpen(false)
                    } catch (e) {
                      const email = 'info@overtrain.app'
                      const subject = encodeURIComponent(`[OverTrain] Support: ${supportSubject || 'Help needed'}`)
                      const body = encodeURIComponent(`Subject: ${supportSubject}\n${supportMessage}\n\nContact: ${supportEmail || 'N/A'}`)
                      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`
                      setSupportOpen(false)
                    } finally {
                      setSending(false)
                    }
                  }}>{sending ? 'Sending...' : 'Send'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}



