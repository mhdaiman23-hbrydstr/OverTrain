# Workout Template Instructions

## 📋 Files Created

1. **workout_template_program_info.csv** - Program metadata
2. **workout_template_exercises.csv** - Exercise definitions
3. **WORKOUT_TEMPLATE_README.md** - This file

## 🎯 How to Use

### Step 1: Open in Excel
1. Open both CSV files in Excel or Google Sheets
2. They will appear as spreadsheet tables

### Step 2: Fill Out Program Info
Edit `workout_template_program_info.csv`:

| Field | Options | Description |
|-------|---------|-------------|
| **program_id** | lowercase-with-hyphens | Unique identifier (e.g., "my-custom-ppl-6day") |
| **program_name** | Any text | Display name (e.g., "My Custom PPL Split") |
| **days_per_week** | 1-7 | Number of workout days |
| **total_weeks** | 4-12 | Program duration (default: 6) |
| **gender** | male, female, or "male,female" | Target gender(s) |
| **experience** | beginner, intermediate, advanced | Target experience level |
| **progression_type** | linear, percentage, hybrid | Progression method |
| **deload_week** | 1-12 | Which week is deload (usually last week) |

### Step 3: Fill Out Exercises
Edit `workout_template_exercises.csv`:

#### Required Columns:
- **day_number** - Which workout day (1, 2, 3, etc.)
- **day_name** - Name of the workout day (e.g., "Push Day", "Pull Day")
- **exercise_name** - Full exercise name (e.g., "Barbell Bench Press")
- **category** - "compound" or "isolation"
- **week1_sets** - Number of sets for Week 1
- **week1_reps** - Rep range for Week 1 (e.g., "6-8" or "10-12")
- **week1_rest** - Rest time in seconds (e.g., 180)

#### Optional Columns (Weeks 2-6):
- Leave **BLANK** for auto-progression (copies Week 1)
- Fill in **custom values** if you want different sets/reps each week
- Week 6 typically has custom deload values (shown in template)

### Step 4: Customization Options

#### Option A: Simple Auto-Progression (Recommended)
```
Fill ONLY Week 1 columns → System auto-copies to Weeks 2-5
Optionally customize Week 6 for deload
```

Example:
| day_number | exercise_name | week1_sets | week1_reps | week1_rest | week2_sets | week3_sets | week6_sets | week6_reps |
|------------|---------------|------------|------------|------------|------------|------------|------------|------------|
| 1 | Bench Press | 4 | 6-8 | 180 | (blank) | (blank) | 3 | 4-6 |

Result: Weeks 2-5 = same as Week 1, Week 6 = custom deload

#### Option B: Full Custom Progression
```
Fill ALL week columns for complete control over progression
```

Example:
| day_number | exercise_name | week1_sets | week1_reps | week2_sets | week2_reps | week3_sets | week3_reps |
|------------|---------------|------------|------------|------------|------------|------------|------------|
| 1 | Bench Press | 3 | 10-12 | 4 | 8-10 | 5 | 6-8 |

Result: Each week has different volume/intensity

## 📝 Template Examples

### Example 1: 3-Day Full Body (Beginner)
```csv
program_id: fullbody-3day-beginner
days_per_week: 3
total_weeks: 6
experience: beginner

Day 1: Full Body A
- Squat: 3x8-10 (180s rest)
- Bench Press: 3x8-10 (150s rest)
- Barbell Row: 3x8-10 (150s rest)
- Plank: 3x30-60s (60s rest)

Day 2: Full Body B
- Deadlift: 3x5 (240s rest)
- Overhead Press: 3x8-10 (120s rest)
- Pull-ups: 3x6-10 (120s rest)
- Dumbbell Curls: 3x10-12 (90s rest)

Day 3: Full Body C
- Front Squat: 3x8-10 (180s rest)
- Incline Press: 3x8-10 (150s rest)
- Lat Pulldown: 3x10-12 (120s rest)
- Tricep Extensions: 3x10-12 (90s rest)
```

### Example 2: 4-Day Upper/Lower (Intermediate)
```csv
program_id: upper-lower-4day-intermediate
days_per_week: 4
total_weeks: 6
experience: intermediate

Day 1: Upper Power
- Bench Press: 4x6-8 (180s rest)
- Barbell Row: 4x6-8 (180s rest)
- Overhead Press: 3x8-10 (120s rest)
- Pull-ups: 3x8-10 (120s rest)

Day 2: Lower Power
- Squat: 4x6-8 (240s rest)
- Romanian Deadlift: 3x8-10 (180s rest)
- Leg Press: 3x10-12 (120s rest)
- Leg Curls: 3x10-12 (90s rest)

Day 3: Upper Hypertrophy
- Incline Press: 3x10-12 (120s rest)
- Cable Row: 3x10-12 (120s rest)
- Lateral Raises: 3x12-15 (60s rest)
- Bicep Curls: 3x10-12 (90s rest)

Day 4: Lower Hypertrophy
- Front Squat: 3x10-12 (180s rest)
- Leg Press: 3x12-15 (120s rest)
- Leg Extensions: 3x12-15 (90s rest)
- Calf Raises: 4x15-20 (60s rest)
```

## 🔧 Exercise Categories

### Compound Exercises
Barbell Back Squat, Barbell Front Squat, Barbell Bench Press, Incline Barbell Press, Barbell Row, Deadlift, Romanian Deadlift, Overhead Press, Pull-ups, Chin-ups, Dips, Leg Press

### Isolation Exercises
Barbell Curls, Tricep Extensions, Lateral Raises, Leg Curls, Leg Extensions, Calf Raises, Face Pulls, Chest Flys, Cable Flys, Dumbbell Curls

## ⚙️ Progression Types

### Linear Progression (Recommended for Beginners)
- Adds weight when all sets completed
- Simple and effective
- Default: +2.5% per week

### Percentage Progression (Advanced)
- Based on one-rep max (1RM)
- Week-by-week percentage increases
- Requires 1RM testing

### Hybrid Progression
- Compounds: Linear or Percentage
- Isolation: Linear or Percentage
- Mix and match

## 🎯 Rest Time Guidelines

| Exercise Type | Rest Time | Example |
|---------------|-----------|---------|
| Heavy Compounds (1-5 reps) | 3-5 minutes | 180-300s | Deadlift, Heavy Squat |
| Medium Compounds (6-10 reps) | 2-3 minutes | 120-180s | Bench Press, Row |
| Light Compounds (10-15 reps) | 1-2 minutes | 60-120s | Leg Press, Lunges |
| Isolation (10-20 reps) | 30-90 seconds | 30-90s | Curls, Raises |

## 📤 Next Steps

1. **Customize** the template with your exercises
2. **Save** the CSV files
3. **Send** both files back to the developer
4. **Conversion** to TypeScript will be done automatically
5. **Import** into the LiftLog app

## ⚠️ Important Notes

- **Week 6 is always deload** by default (reduced volume/intensity)
- **Blank week columns** = auto-copy from Week 1
- **Rep ranges** use format "min-max" (e.g., "8-10", "6-8")
- **Rest times** are in seconds (60, 90, 120, 180, 240)
- **Exercise names** should match the exercise library when possible
- **Category** must be either "compound" or "isolation" (lowercase)

## 🆘 Need Help?

Common issues:
- ❌ "My exercises don't import" → Check spelling and category
- ❌ "Progression not working" → Verify week1_sets and week1_reps are filled
- ❌ "Program not showing" → Check program_id is unique and lowercase
- ❌ "Deload week wrong" → Week 6 should have custom sets/reps values

---

**Happy Programming! 💪🏋️**
