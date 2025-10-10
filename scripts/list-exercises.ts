/**
 * List All Available Exercises from Database
 * 
 * Purpose: Show all exercise names in the database for easy copy/paste when creating templates
 * Usage: npx tsx scripts/list-exercises.ts
 * 
 * Options:
 *   --muscle-group <name>    Filter by muscle group (e.g., "Chest", "Back")
 *   --equipment <type>       Filter by equipment type (e.g., "Barbell", "Dumbbell")
 *   --json                   Output as JSON for programmatic use
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

const supabase = createClient(supabaseUrl, supabaseKey)

interface Exercise {
  id: string
  name: string
  muscle_group: string
  equipment_type: string
}

async function listExercises() {
  const args = process.argv.slice(2)
  const muscleGroupArg = args.indexOf('--muscle-group')
  const equipmentArg = args.indexOf('--equipment')
  const jsonOutput = args.includes('--json')

  let query = supabase
    .from('exercise_library')
    .select('id, name, muscle_group, equipment_type')
    .order('muscle_group')
    .order('name')

  // Apply filters
  if (muscleGroupArg !== -1 && args[muscleGroupArg + 1]) {
    query = query.eq('muscle_group', args[muscleGroupArg + 1])
  }

  if (equipmentArg !== -1 && args[equipmentArg + 1]) {
    query = query.eq('equipment_type', args[equipmentArg + 1])
  }

  const { data, error } = await query

  if (error) {
    console.error('❌ Database Error:', error.message)
    process.exit(1)
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No exercises found')
    return
  }

  const exercises = data as Exercise[]

  if (jsonOutput) {
    // JSON output for programmatic use
    console.log(JSON.stringify(exercises, null, 2))
  } else {
    // Human-readable output
    console.log('\n📋 Available Exercises in Database\n')
    console.log('=' .repeat(100))
    
    // Group by muscle group
    const grouped = exercises.reduce((acc, ex) => {
      if (!acc[ex.muscle_group]) {
        acc[ex.muscle_group] = []
      }
      acc[ex.muscle_group].push(ex)
      return acc
    }, {} as Record<string, Exercise[]>)

    for (const [muscleGroup, exs] of Object.entries(grouped)) {
      console.log(`\n🏋️  ${muscleGroup.toUpperCase()}`)
      console.log('-'.repeat(100))
      
      exs.forEach(ex => {
        console.log(`  ✓ "${ex.name}"`)
        console.log(`    Equipment: ${ex.equipment_type} | UUID: ${ex.id}`)
      })
    }

    console.log('\n' + '='.repeat(100))
    console.log(`\nTotal: ${exercises.length} exercises`)
    console.log('\n💡 TIP: Copy the exact exercise name (in quotes) to use in templates')
    console.log('   Example: "Bench Press (Barbell)"\n')
  }
}

// Run
listExercises().catch(error => {
  console.error('❌ Unexpected Error:', error)
  process.exit(1)
})

