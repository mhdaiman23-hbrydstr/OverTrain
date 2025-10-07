# Quick Reference: Automatic Deload Week System

## TL;DR

**Question:** "How do I make the last week of a template a deload week?"

**Answer:** Just set `weeks: 6` (or 8, or 12, etc.) in your template. The system automatically makes the last week a deload.

## Creating a New Template (Simplified)

```typescript
{
  id: "my-program",
  name: "My 6-Week Program",
  weeks: 6,  // ← Last week (6) auto-becomes deload
  days: 3,
  gender: ["male", "female"],
  experience: ["beginner"],
  progressionScheme: {
    type: "linear",
    deloadWeek: 6,  // ← Should match weeks value
    progressionRules: {
      compound: {
        successThreshold: "all_sets_completed",
        weightIncrease: 2.5,
        failureResponse: "repeat_week",
      },
      isolation: {
        successThreshold: "all_sets_completed",
        weightIncrease: 2.5,
        failureResponse: "repeat_week",
      },
    },
  },
  schedule: {
    day1: {
      name: "Full Body",
      exercises: [
        {
          id: "squat-1",
          exerciseName: "Barbell Back Squat",
          category: "compound",
          progressionTemplate: {
            week1: { sets: 3, repRange: "10-12" }
            // ↑ ONLY DEFINE WEEK 1!
            // System auto-generates:
            // - Weeks 2-5: same as week1
            // - Week 6: deload (sets: 2, repRange: "8-10", intensity: "deload")
          },
          autoProgression: {
            enabled: true,
            progressionType: "weight_based",
            rules: {
              if_all_sets_completed: "increase_weight_2.5lbs",
              if_failed_reps: "repeat_weight",
              if_failed_twice: "reduce_weight_10_percent",
            },
          },
          restTime: 120,
        },
      ],
    },
  },
}
```

## What the System Does Automatically

| Week | Sets | Rep Range | Weight | How It's Generated |
|------|------|-----------|--------|-------------------|
| 1 | 3 | "10-12" | User enters | You define this |
| 2 | 3 | "10-12" | +2.5% | Auto-copied from week1 |
| 3 | 3 | "10-12" | +2.5% | Auto-copied from week1 |
| 4 | 3 | "10-12" | +2.5% | Auto-copied from week1 |
| 5 | 3 | "10-12" | +2.5% | Auto-copied from week1 |
| 6 | 2 | "8-10" | 65% of week 5 | **Auto-generated deload** |

## Deload Week Characteristics

When the system detects the last week:

- ✅ Sets reduced by 1 (3 → 2, 4 → 3)
- ✅ Rep range reduced by 2 (10-12 → 8-10, 6-8 → 4-6)
- ✅ Weight reduced to 65% of previous week
- ✅ `intensity: "deload"` flag added automatically

## Current Templates

### Available for Testing

1. **3-Day Full Body Beginner (Female)**
   - ID: `fullbody-3day-beginner-female`
   - 6 weeks, deload on week 6
   - 3 exercises per day

2. **4-Day Upper/Lower Split (Male)**
   - ID: `upperlower-4day-intermediate-male`
   - 6 weeks, deload on week 6
   - 4 days per week

## Console Commands

### Jump to Week 6 (for testing)
```javascript
let p = JSON.parse(localStorage.getItem('liftlog_active_program'))
p.currentWeek = 6
p.currentDay = 1
localStorage.setItem('liftlog_active_program', JSON.stringify(p))
location.reload()
```

### View Processed Template
```javascript
let p = JSON.parse(localStorage.getItem('liftlog_active_program'))
console.log(p.template.schedule.day1.exercises[0].progressionTemplate)
// Should show week1 through week6, with week6 having intensity: "deload"
```

### Clear All Data
```javascript
localStorage.clear()
location.reload()
```

## Expected Console Logs

✅ **When starting a program:**
```
[TemplateProcessor] Processing template with automatic deload
```

✅ **When starting Week 6:**
```
[LinearProgressionEngine] Calculating DELOAD week
[LinearProgressionEngine] Generated per-set deload suggestions
```

## Different Program Lengths

The system works with any program length:

```typescript
weeks: 4   // Week 4 is deload
weeks: 6   // Week 6 is deload
weeks: 8   // Week 8 is deload
weeks: 12  // Week 12 is deload
```

The formula is simple: **Last week = Deload week**

## Rep Range Adjustment Examples

| Original | Deload |
|----------|--------|
| "10-12" | "8-10" |
| "8-10" | "6-8" |
| "6-8" | "4-6" |
| "12-15" | "10-13" |
| "5-8" | "3-6" |

Pattern: Subtract 2 from both min and max

## Weight Reduction Examples

If Week 5 sets were:
- 100 lbs
- 105 lbs
- 110 lbs

Week 6 deload will suggest:
- 65 lbs (65% of 100)
- 68 lbs (65% of 105, rounded to nearest 2.5)
- 71 lbs (65% of 110, rounded to nearest 2.5)

## Files You Might Edit

| File | When to Edit |
|------|--------------|
| `lib/gym-templates.ts` | Adding new templates |
| `lib/progression-engines/linear-engine.ts` | Changing deload % or logic |
| `lib/program-state.ts` | Changing program flow |

## FAQs

**Q: Can I have deload on a different week (not the last)?**
A: Not automatically. You'd need to manually define that week with `intensity: "deload"` in the progressionTemplate.

**Q: Can I change the 65% reduction to something else?**
A: Yes, edit line ~213 in `lib/progression-engines/linear-engine.ts`:
```typescript
const deloadSetWeight = roundToIncrement(setData.weight * 0.65, 2.5)
// Change 0.65 to 0.70 for 70%, or 0.60 for 60%, etc.
```

**Q: Can I have multiple deload weeks?**
A: Not automatically. The system generates one deload week (the last one). For multiple deloads, manually define those weeks.

**Q: What if I want to skip deload entirely?**
A: Don't process the template through `processTemplateWithDeload()`, but then you'll need to manually define all weeks.

## Success Checklist

Testing is successful if:

- [ ] Build completes without errors ✅
- [ ] Dev server runs ✅
- [ ] Week 6 shows reduced sets
- [ ] Week 6 shows reduced rep range
- [ ] Week 6 weights are ~65% of Week 5
- [ ] Console shows "Calculating DELOAD week"

## Support

If something isn't working:

1. Check console logs (F12)
2. Verify you're in Week 6: `JSON.parse(localStorage.getItem('liftlog_active_program')).currentWeek`
3. Check processed template has deload: `...progressionTemplate.week6.intensity === "deload"`
4. See `TESTING_GUIDE.md` for detailed troubleshooting

---

**Bottom Line:** To make the last week a deload, just set `weeks: N` in your template. The system handles everything else automatically.

