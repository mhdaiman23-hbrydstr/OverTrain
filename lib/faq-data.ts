export interface FaqItem {
  question: string
  answer: string
}

export const FAQ_DATA: FaqItem[] = [
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
    answer: "OverTrain lets you log difficulty using RPE (Rate of Perceived Exertion) or RIR (Reps In Reserve). Choose your preferred display in Profile → Training. This helps the app understand relative intensity across sets and weeks. You can track at the block level (apply RPE/RIR rules across a whole program block) and also override per exercise with custom targets when needed. To set a per-exercise target, click the small dot next to the exercise name; this adds a custom RPE that does not affect your program's block-level tracking."
  },
  {
    question: "How does auto progression work?",
    answer: "Based on your logged performance, targets, and RPE/RIR, OverTrain can nudge weights, reps, or volume week-to-week to drive progressive overload while managing fatigue. You can always override recommendations during a session."
  }
]
