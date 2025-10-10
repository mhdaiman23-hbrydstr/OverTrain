/**
 * Create Program Template in Database
 * 
 * Purpose: Easy way to add new workout program templates to the database
 * Usage: npx tsx scripts/create-template.ts
 * 
 * This script:
 * 1. Validates all exercise names exist in exercise_library
 * 2. Creates program_templates entry
 * 3. Creates program_template_days entries
 * 4. Creates program_template_exercises entries with UUIDs
 * 
 * Before running: Use scripts/list-exercises.ts to see available exercise names
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

// Get Supabase credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Use service role key if available (bypasses RLS), otherwise use anon key
const supabaseKey = supabaseServiceKey || supabaseAnonKey

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and either NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

console.log(`🔑 Using ${supabaseServiceKey ? 'service role' : 'anon'} key for database access`)
const supabase = createClient(supabaseUrl, supabaseKey)

// ============================================================================
// TEMPLATE DEFINITION
// ============================================================================
// Modify this section to create your template

const TEMPLATE_DEFINITION = {
  // Program metadata
  name: "2-Week Test Program",
  description: "A simple 2-week program for testing database integration",
  days_per_week: 3,
  total_weeks: 2,
  deload_week: 2,
  gender: ['male', 'female'], // Can be ['male'], ['female'], or both
  experience_level: ['intermediate'], // Can be ['beginner'], ['intermediate'], ['advanced'], or multiple
  progression_type: 'linear', // 'linear', 'percentage', or 'hybrid'

  // Workout days
  days: [
    {
      day_number: 1,
      day_name: "Upper Body A",
      exercises: [
        {
          exercise_name: "Bench Press (Flat)", // MUST match database exactly!
          category: "compound",
          rest_time_seconds: 180,
          progression_config: {
            progressionTemplate: {
              week1: { sets: 3, repRange: "8-10", intensity: "working" },
              week2: { sets: 3, repRange: "8-10", intensity: "deload" }
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent"
              }
            },
            tier: "tier1"
          }
        },
        {
          exercise_name: "Barbell Bent Over Row",
          category: "compound",
          rest_time_seconds: 180,
          progression_config: {
            progressionTemplate: {
              week1: { sets: 3, repRange: "8-10", intensity: "working" },
              week2: { sets: 3, repRange: "8-10", intensity: "deload" }
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent"
              }
            },
            tier: "tier1"
          }
        },
        {
          exercise_name: "Barbell Shoulder Press (Standing)",
          category: "compound",
          rest_time_seconds: 180,
          progression_config: {
            progressionTemplate: {
              week1: { sets: 3, repRange: "8-10", intensity: "working" },
              week2: { sets: 2, repRange: "8-10", intensity: "deload" }
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2_5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent"
              }
            },
            tier: "tier2"
          }
        }
      ]
    },
    {
      day_number: 2,
      day_name: "Lower Body",
      exercises: [
        {
          exercise_name: "Barbell Squat",
          category: "compound",
          rest_time_seconds: 240,
          progression_config: {
            progressionTemplate: {
              week1: { sets: 4, repRange: "6-8", intensity: "working" },
              week2: { sets: 3, repRange: "6-8", intensity: "deload" }
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent"
              }
            },
            tier: "tier1"
          }
        },
        {
          exercise_name: "Dumbbell RDL",
          category: "compound",
          rest_time_seconds: 180,
          progression_config: {
            progressionTemplate: {
              week1: { sets: 3, repRange: "8-10", intensity: "working" },
              week2: { sets: 3, repRange: "8-10", intensity: "deload" }
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent"
              }
            },
            tier: "tier1"
          }
        }
      ]
    },
    {
      day_number: 3,
      day_name: "Upper Body B",
      exercises: [
        {
          exercise_name: "Dumbbell Press (Incline)",
          category: "compound",
          rest_time_seconds: 180,
          progression_config: {
            progressionTemplate: {
              week1: { sets: 3, repRange: "8-10", intensity: "working" },
              week2: { sets: 3, repRange: "8-10", intensity: "deload" }
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2_5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent"
              }
            },
            tier: "tier2"
          }
        },
        {
          exercise_name: "Pullup (Normal Grip)",
          category: "compound",
          rest_time_seconds: 180,
          progression_config: {
            progressionTemplate: {
              week1: { sets: 3, repRange: "6-10", intensity: "working" },
              week2: { sets: 2, repRange: "6-10", intensity: "deload" }
            },
            autoProgression: {
              enabled: true,
              progressionType: "rep_based",
              rules: {
                if_all_sets_completed: "increase_reps",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_sets"
              }
            },
            tier: "tier1"
          }
        }
      ]
    }
  ]
}

// ============================================================================
// VALIDATION & CREATION LOGIC
// ============================================================================

interface ExerciseValidation {
  name: string
  uuid: string | null
  found: boolean
}

async function validateExerciseName(name: string): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from('exercise_library')
    .select('id')
    .eq('name', name)
    .single()

  if (error || !data) {
    return null
  }

  return data as { id: string }
}

async function validateAllExercises(): Promise<{ valid: boolean; results: ExerciseValidation[] }> {
  console.log('\n🔍 Validating exercise names...\n')

  const allExercises = TEMPLATE_DEFINITION.days.flatMap(day =>
    day.exercises.map(ex => ex.exercise_name)
  )

  const uniqueExercises = [...new Set(allExercises)]
  const results: ExerciseValidation[] = []

  for (const exerciseName of uniqueExercises) {
    const dbExercise = await validateExerciseName(exerciseName)
    const found = dbExercise !== null

    results.push({
      name: exerciseName,
      uuid: dbExercise?.id || null,
      found
    })

    if (found) {
      console.log(`  ✅ "${exerciseName}" → ${dbExercise!.id}`)
    } else {
      console.log(`  ❌ "${exerciseName}" → NOT FOUND IN DATABASE`)
    }
  }

  const allValid = results.every(r => r.found)

  return { valid: allValid, results }
}

async function createTemplate() {
  console.log('\n🚀 Creating Program Template in Database\n')
  console.log('='.repeat(80))
  console.log(`Template: ${TEMPLATE_DEFINITION.name}`)
  console.log(`Days per week: ${TEMPLATE_DEFINITION.days_per_week}`)
  console.log(`Total weeks: ${TEMPLATE_DEFINITION.total_weeks}`)
  console.log('='.repeat(80))

  // Step 1: Validate all exercises
  const validation = await validateAllExercises()

  if (!validation.valid) {
    console.error('\n❌ VALIDATION FAILED')
    console.error('\nExercises not found in database. Please:')
    console.error('1. Run "npx tsx scripts/list-exercises.ts" to see available exercises')
    console.error('2. Fix exercise names in TEMPLATE_DEFINITION to match database exactly')
    console.error('3. Or add missing exercises to the database first')
    process.exit(1)
  }

  console.log('\n✅ All exercises validated!\n')

  // Create lookup map for exercise UUIDs
  const exerciseUuidMap = new Map(
    validation.results.map(r => [r.name, r.uuid!])
  )

  // Step 2: Create program template
  console.log('📝 Creating program_templates entry...')

  const { data: programData, error: programError } = await supabase
    .from('program_templates')
    .insert({
      name: TEMPLATE_DEFINITION.name,
      description: TEMPLATE_DEFINITION.description,
      days_per_week: TEMPLATE_DEFINITION.days_per_week,
      total_weeks: TEMPLATE_DEFINITION.total_weeks,
      deload_week: TEMPLATE_DEFINITION.deload_week,
      gender: TEMPLATE_DEFINITION.gender,
      experience_level: TEMPLATE_DEFINITION.experience_level,
      progression_type: TEMPLATE_DEFINITION.progression_type,
      is_active: true
    })
    .select('id')
    .single()

  if (programError || !programData) {
    console.error('❌ Failed to create program template:', programError)
    process.exit(1)
  }

  const programId = programData.id
  console.log(`  ✅ Program created: ${programId}`)

  // Step 3: Create days
  console.log('\n📅 Creating program_template_days...')

  for (const day of TEMPLATE_DEFINITION.days) {
    const { data: dayData, error: dayError } = await supabase
      .from('program_template_days')
      .insert({
        program_template_id: programId,
        day_number: day.day_number,
        day_name: day.day_name
      })
      .select('id')
      .single()

    if (dayError || !dayData) {
      console.error(`❌ Failed to create day ${day.day_number}:`, dayError)
      process.exit(1)
    }

    console.log(`  ✅ Day ${day.day_number}: ${day.day_name} → ${dayData.id}`)

    // Step 4: Create exercises for this day
    console.log(`     Creating exercises...`)

    for (let i = 0; i < day.exercises.length; i++) {
      const exercise = day.exercises[i]
      const exerciseUuid = exerciseUuidMap.get(exercise.exercise_name)

      if (!exerciseUuid) {
        console.error(`❌ UUID not found for: ${exercise.exercise_name}`)
        process.exit(1)
      }

      const { error: exerciseError } = await supabase
        .from('program_template_exercises')
        .insert({
          template_day_id: dayData.id,
          exercise_id: exerciseUuid,
          exercise_order: i + 1,
          category: exercise.category,
          rest_time_seconds: exercise.rest_time_seconds,
          progression_config: exercise.progression_config
        })

      if (exerciseError) {
        console.error(`❌ Failed to create exercise ${exercise.exercise_name}:`, exerciseError)
        process.exit(1)
      }

      console.log(`       ${i + 1}. ${exercise.exercise_name} ✅`)
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('✅ TEMPLATE CREATED SUCCESSFULLY!')
  console.log('='.repeat(80))
  console.log(`\nProgram ID: ${programId}`)
  console.log(`\n💡 To view this template:`)
  console.log(`   SELECT * FROM program_templates WHERE id = '${programId}';`)
  console.log(`\n💡 To use this template in your app:`)
  console.log(`   It will automatically appear in the program selection UI!`)
  console.log(`\n💡 To clear cache and test:`)
  console.log(`   1. Open browser console`)
  console.log(`   2. Run: localStorage.removeItem('liftlog_active_program')`)
  console.log(`   3. Refresh the app`)
  console.log(`   4. Select the program from Programs tab\n`)
}

// Run
createTemplate().catch(error => {
  console.error('\n❌ Unexpected Error:', error)
  process.exit(1)
})

