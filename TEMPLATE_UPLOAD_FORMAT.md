# Program Template Upload Format

## How to Provide Your Templates

You'll need **2 Excel sheets**:

### Sheet 1: TEMPLATES (Master template info)

| template_name | days_per_week | total_weeks | deload_week | genders | experience_levels | progression_type |
|---|---|---|---|---|---|---|
| Beginner PPL | 3 | 12 | 6 | male,female | beginner | linear |
| Intermediate Upper/Lower | 4 | 12 | 6 | male,female | intermediate | linear |
| Advanced 5-Day Split | 5 | 16 | 8 | male,female | advanced | linear |

**Column Descriptions:**
- `template_name`: Name of the program (e.g., "Beginner PPL")
- `days_per_week`: Number of workout days per week (3-6 typical)
- `total_weeks`: How many weeks in the full program (12, 16, 20 common)
- `deload_week`: Which week has reduced volume (typically 6, 8, or 12)
  - Set to `null` if no deload week
- `genders`: Who this is for, comma-separated (options: `male`, `female`)
  - Example: `male,female` means both
  - Example: `female` means females only
- `experience_levels`: Who this targets, comma-separated (options: `beginner`, `intermediate`, `advanced`)
  - Example: `beginner,intermediate` means entry to intermediate
- `progression_type`: How weight progresses (usually `linear`)

---

### Sheet 2: TEMPLATE_EXERCISES (Exercise details)

| template_name | day_number | day_name | exercise_name | exercise_order | sets | reps | rest_seconds | category |
|---|---|---|---|---|---|---|---|---|
| Beginner PPL | 1 | Push | Barbell Bench Press | 1 | 3 | 8-10 | 180 | compound |
| Beginner PPL | 1 | Push | Incline Dumbbell Press | 2 | 3 | 10-12 | 120 | isolation |
| Beginner PPL | 1 | Push | Cable Flyes | 3 | 3 | 12-15 | 90 | isolation |
| Beginner PPL | 1 | Push | Tricep Dips | 4 | 3 | 8-10 | 120 | compound |
| Beginner PPL | 2 | Pull | Barbell Row | 1 | 3 | 6-8 | 180 | compound |
| Beginner PPL | 2 | Pull | Lat Pulldowns | 2 | 3 | 8-10 | 120 | isolation |
| Intermediate Upper/Lower | 1 | Upper A | Barbell Bench Press | 1 | 4 | 6-8 | 180 | compound |
| Intermediate Upper/Lower | 1 | Upper A | Incline Barbell Press | 2 | 3 | 8-10 | 150 | compound |

**Column Descriptions:**
- `template_name`: Must match a name from TEMPLATES sheet
- `day_number`: Which day of the week (1, 2, 3, etc.)
- `day_name`: Name of the workout (e.g., "Push", "Leg Day", "Upper A")
- `exercise_name`: **MUST match exactly** one of your exercise names in the database
  - Examples: "Barbell Bench Press", "Dumbbell Rows", "Leg Press", "Pullup (Neutral Grip)"
  - Check the exercise library for exact spelling
- `exercise_order`: Order in the workout (1st, 2nd, 3rd, etc.)
- `sets`: Number of sets (typically 3-5)
- `reps`: Rep range as string (examples: "8-10", "6-8", "12-15", "8-12")
- `rest_seconds`: Rest between sets in seconds (90, 120, 180, 240 typical)
- `category`: Type of exercise (`compound` or `isolation`)

---

## Important Notes

### Exercise Name Matching
The `exercise_name` in TEMPLATE_EXERCISES **MUST match exactly** with exercise names in your `exercise_library` table.

**Before you fill the Excel, you should:**
1. Query your exercise library to see all available exercise names
2. Copy-paste exact names into the Excel (avoids typos)

### Multiple Templates Example

If you have 3 templates (Beginner PPL, Intermediate UL, Advanced 5-Day):

**TEMPLATES Sheet:**
```
template_name              | days_per_week | total_weeks | deload_week | genders      | experience_levels | progression_type
Beginner PPL               | 3             | 12          | 6           | male,female  | beginner          | linear
Intermediate Upper/Lower   | 4             | 12          | 6           | male,female  | intermediate      | linear
Advanced 5-Day Split       | 5             | 16          | 8           | male,female  | advanced          | linear
```

**TEMPLATE_EXERCISES Sheet:**
```
template_name | day_number | day_name | exercise_name | exercise_order | sets | reps | rest_seconds | category
Beginner PPL | 1 | Push | Barbell Bench Press | 1 | 3 | 8-10 | 180 | compound
Beginner PPL | 1 | Push | Incline DB Press | 2 | 3 | 10-12 | 120 | isolation
Beginner PPL | 2 | Pull | Barbell Row | 1 | 3 | 6-8 | 180 | compound
...
Intermediate Upper/Lower | 1 | Upper A | Barbell Bench Press | 1 | 4 | 6-8 | 180 | compound
...
Advanced 5-Day Split | 1 | Chest | Barbell Bench Press | 1 | 4 | 5-7 | 240 | compound
...
```

---

## What Happens Next

Once you provide the Excel:

1. **I'll parse both sheets**
2. **Match exercise names** to exercise library UUIDs
3. **Create SQL INSERT statements** for:
   - `program_templates` table
   - `program_template_days` table
   - `program_template_exercises` table
4. **Execute the SQL** to populate your database
5. **Verify** all templates load correctly in the app

---

## File Format

Send me an Excel file with:
- ✅ Sheet 1: Named `TEMPLATES`
- ✅ Sheet 2: Named `TEMPLATE_EXERCISES`
- ✅ Headers in first row
- ✅ Data starting from row 2

You can also send as CSV if easier (2 separate CSV files).

---

## Quick Checklist Before Sending

- [ ] All `template_name` values are unique
- [ ] `day_number` starts at 1 for each template
- [ ] `exercise_order` starts at 1 for each day
- [ ] `exercise_name` matches database exactly (check spelling!)
- [ ] `reps` is a string like "8-10" or "6" (not just numbers)
- [ ] `genders` and `experience_levels` use correct values only
- [ ] `category` is either `compound` or `isolation`

---

Ready when you are! 📊
