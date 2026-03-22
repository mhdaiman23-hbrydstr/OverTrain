"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { HelpCircle, Search, ArrowLeft } from "lucide-react"
import { FAQ_DATA } from "@/lib/faq-data"

export default function FaqPage() {
  const [search, setSearch] = useState("")

  const filteredFaqs = search.trim()
    ? FAQ_DATA.filter(
        (faq) =>
          faq.question.toLowerCase().includes(search.toLowerCase()) ||
          faq.answer.toLowerCase().includes(search.toLowerCase())
      )
    : FAQ_DATA

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-3xl px-4 py-16 lg:py-24 space-y-8">
        {/* Back link */}
        <Button variant="ghost" size="sm" asChild>
          <Link href="/" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </Link>
        </Button>

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <HelpCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Find answers to common questions about using OverTrain.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* FAQ Accordion */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              {search.trim()
                ? `${filteredFaqs.length} result${filteredFaqs.length !== 1 ? "s" : ""}`
                : `${FAQ_DATA.length} Questions`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredFaqs.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {filteredFaqs.map((faq, index) => (
                  <AccordionItem key={index} value={`faq-${index}`}>
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No questions match your search. Try different keywords.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="rounded-lg border bg-muted/30 px-6 py-8 text-center space-y-3">
          <p className="font-semibold">Still have questions?</p>
          <p className="text-sm text-muted-foreground">
            Our support team is here to help.
          </p>
          <Button variant="outline" asChild>
            <Link href="/support">Visit Support</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
