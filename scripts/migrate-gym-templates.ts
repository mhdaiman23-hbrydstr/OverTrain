/**
 * Migrate Existing GYM_TEMPLATES to Database
 * 
 * Purpose: Migrate all hardcoded templates from lib/gym-templates.ts to database
 * Usage: npx tsx scripts/migrate-gym-templates.ts
 * 
 * This script:
 * 1. Validates all exercise names exist in exercise_library
 * 2. Reports any missing exercises or name mismatches
 * 3. Creates database entries for each template
 * 4. Handles duplicate templates (skips if already exists)
 * 
 * Safety: This script is idempotent - safe to run multiple times
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { GYM_TEMPLATES } from '../lib/gym-templates.js'

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

interface ValidationResult {
  templateId: string
  templateName: string
  success: boolean
  missingExercises: string[]
  exerciseCount: number
}

async function validateExerciseName(name: string): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from('exercise_library')
    .select('id')
    .eq('name', name)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data as { id: string }
}

async function checkTemplateExists(templateId: string): Promise<boolean> {
  const { data } = await supabase
    .from('program_templates')
    .select('id')
    .eq('id', templateId)
    .maybeSingle()

  return !!data
}

async function validateTemplate(template: typeof GYM_TEMPLATES[0]): Promise<ValidationResult> {
  const allExercises = Object.values(template.schedule).flatMap(day =>
    day.exercises.map(ex => ex.exerciseName)
  )

  const uniqueExercises = [...new Set(allExercises)]
  const missingExercises: string[] = []

  for (const exerciseName of uniqueExercises) {
    const dbExercise = await validateExerciseName(exerciseName)
    if (!dbExercise) {
      missingExercises.push(exerciseName)
    }
  }

  return {
    templateId: template.id,
    templateName: template.name,
    success: missingExercises.length === 0,
    missingExercises,
    exerciseCount: uniqueExercises.length
  }
}

async function migrateTemplate(template: typeof GYM_TEMPLATES[0]): Promise<boolean> {
  try {
    // Check if already exists
    const exists = await checkTemplateExists(template.id)
    if (exists) {
      console.log(`  ⏭️  Already exists, skipping: ${template.id}`)
      return true
    }

    // Create exercise UUID lookup map
    const exerciseUuidMap = new Map<string, string>()
    const allExercises = Object.values(template.schedule).flatMap(day =>
      day.exercises.map(ex => ex.exerciseName)
    )
    const uniqueExercises = [...new Set(allExercises)]

    for (const exerciseName of uniqueExercises) {
      const dbExercise = await validateExerciseName(exerciseName)
      if (dbExercise) {
        exerciseUuidMap.set(exerciseName, dbExercise.id)
      }
    }

    // Create program template
    // Note: Don't specify ID, let database generate UUID automatically
    const { data: programData, error: programError } = await supabase
      .from('program_templates')
      .insert({
        // id: template.id, // Don't use string IDs - let DB generate UUID
        name: template.name,
        description: `Migrated from GYM_TEMPLATES`,
        days_per_week: template.days,
        total_weeks: template.weeks,
        deload_week: template.progressionScheme?.deloadWeek || template.weeks,
        gender: template.gender,
        experience_level: template.experience,
        progression_type: template.progressionScheme?.type || 'linear',
        is_active: true
      })
      .select('id')
      .single()

    if (programError) {
      throw programError
    }

    const programId = programData.id

    // Create days and exercises
    const scheduleKeys = Object.keys(template.schedule).sort()

    for (let dayIndex = 0; dayIndex < scheduleKeys.length; dayIndex++) {
      const dayKey = scheduleKeys[dayIndex]
      const day = template.schedule[dayKey]

      const { data: dayData, error: dayError } = await supabase
        .from('program_template_days')
        .insert({
          program_template_id: programId,
          day_number: dayIndex + 1,
          day_name: day.name
        })
        .select('id')
        .single()

      if (dayError) {
        throw dayError
      }

      // Create exercises for this day
      for (let exIndex = 0; exIndex < day.exercises.length; exIndex++) {
        const exercise = day.exercises[exIndex]
        const exerciseUuid = exerciseUuidMap.get(exercise.exerciseName)

        if (!exerciseUuid) {
          console.error(`  ❌ UUID not found for: ${exercise.exerciseName}`)
          continue
        }

        const { error: exerciseError } = await supabase
          .from('program_template_exercises')
          .insert({
            template_day_id: dayData.id,
            exercise_id: exerciseUuid,
            exercise_order: exIndex + 1,
            category: exercise.category,
            rest_time_seconds: exercise.restTime,
            progression_config: {
              progressionTemplate: exercise.progressionTemplate,
              autoProgression: exercise.autoProgression,
              tier: exercise.tier
            }
          })

        if (exerciseError) {
          throw exerciseError
        }
      }
    }

    console.log(`  ✅ Migrated: ${template.name} (${template.id})`)
    return true

  } catch (error) {
    console.error(`  ❌ Failed to migrate ${template.name}:`, error)
    return false
  }
}

async function migrate() {
  console.log('\n🚀 Migrating GYM_TEMPLATES to Database\n')
  console.log('='.repeat(80))
  console.log(`Found ${GYM_TEMPLATES.length} templates to migrate`)
  console.log('='.repeat(80))

  // Step 1: Validate all templates
  console.log('\n📋 Step 1: Validating all templates...\n')

  const validationResults: ValidationResult[] = []
  const templatesByStatus = {
    valid: [] as string[],
    invalid: [] as ValidationResult[]
  }

  for (const template of GYM_TEMPLATES) {
    process.stdout.write(`  Validating: ${template.name}...`)
    const result = await validateTemplate(template)
    validationResults.push(result)

    if (result.success) {
      console.log(` ✅ (${result.exerciseCount} exercises)`)
      templatesByStatus.valid.push(template.id)
    } else {
      console.log(` ❌ (${result.missingExercises.length} missing)`)
      templatesByStatus.invalid.push(result)
    }
  }

  // Report validation results
  console.log('\n' + '='.repeat(80))
  console.log('📊 Validation Summary')
  console.log('='.repeat(80))
  console.log(`✅ Valid templates: ${templatesByStatus.valid.length}`)
  console.log(`❌ Invalid templates: ${templatesByStatus.invalid.length}`)

  if (templatesByStatus.invalid.length > 0) {
    console.log('\n⚠️  Templates with missing exercises:\n')
    
    templatesByStatus.invalid.forEach(result => {
      console.log(`\n  Template: ${result.templateName} (${result.templateId})`)
      console.log(`  Missing exercises:`)
      result.missingExercises.forEach(ex => {
        console.log(`    • "${ex}"`)
      })
    })

    console.log('\n💡 To fix missing exercises:')
    console.log('   1. Run: npx tsx scripts/list-exercises.ts')
    console.log('   2. Find correct exercise names in database')
    console.log('   3. Update lib/gym-templates.ts with correct names')
    console.log('   4. Re-run this migration script')
    console.log('\n⏸️  Migration paused. Fix missing exercises first.')
    process.exit(1)
  }

  // Step 2: Migrate valid templates
  console.log('\n📝 Step 2: Migrating valid templates to database...\n')

  let successCount = 0
  let skipCount = 0
  let failCount = 0

  for (const template of GYM_TEMPLATES) {
    const exists = await checkTemplateExists(template.id)
    if (exists) {
      console.log(`  ⏭️  Already exists: ${template.name}`)
      skipCount++
      continue
    }

    const success = await migrateTemplate(template)
    if (success) {
      successCount++
    } else {
      failCount++
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(80))
  console.log('✅ MIGRATION COMPLETE!')
  console.log('='.repeat(80))
  console.log(`\n📊 Results:`)
  console.log(`  ✅ Migrated: ${successCount}`)
  console.log(`  ⏭️  Skipped (already exist): ${skipCount}`)
  console.log(`  ❌ Failed: ${failCount}`)
  console.log(`  📈 Total: ${GYM_TEMPLATES.length}`)

  if (successCount > 0) {
    console.log('\n💡 Next steps:')
    console.log('   1. Refresh your app')
    console.log('   2. Go to Programs tab')
    console.log('   3. You should see all migrated templates')
    console.log('   4. Test starting a program and logging a workout')
  }

  if (failCount > 0) {
    console.log('\n⚠️  Some templates failed to migrate. Check errors above.')
  }

  console.log('')
}

// Run
migrate().catch(error => {
  console.error('\n❌ Unexpected Error:', error)
  process.exit(1)
})

