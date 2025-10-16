/**
 * Assign Progression Tiers to Exercises
 *
 * This script automatically assigns progression tier IDs to all exercises in the database
 * using the heuristic tier selection logic from progression-tiers.ts.
 *
 * Run with: npx ts-node scripts/assign-tiers-to-exercises.ts
 */

import { supabase } from '../lib/supabase'
import { getExerciseTier } from '../lib/progression-tiers'

interface Exercise {
  id: string
  name: string
  muscle_group: string
  equipment_type: string
  linear_progression_tier_id: string | null
}

interface ProgressionTier {
  id: string
  tier_name: string
  min_increment: number
  weekly_increase: number
}

async function main() {
  console.log('🚀 Starting tier assignment script...\n')

  // Step 1: Fetch all progression tiers
  console.log('📊 Fetching progression tiers from database...')
  const { data: tiers, error: tiersError } = await supabase
    .from('linear_progression_tiers')
    .select('id, tier_name, min_increment, weekly_increase')
    .order('tier_name')

  if (tiersError) {
    console.error('❌ Failed to fetch tiers:', tiersError)
    process.exit(1)
  }

  if (!tiers || tiers.length === 0) {
    console.error('❌ No tiers found in database. Run seed-linear-progression-tiers.sql first!')
    process.exit(1)
  }

  console.log(`✅ Found ${tiers.length} progression tiers:`)
  tiers.forEach(tier => {
    console.log(`   - ${tier.tier_name}: ${tier.min_increment} lb increment, ${(tier.weekly_increase * 100).toFixed(2)}% weekly`)
  })
  console.log()

  // Create tier map for quick lookup
  const tierMap = new Map<string, string>()
  tiers.forEach(tier => {
    tierMap.set(tier.tier_name, tier.id)
  })

  // Step 2: Fetch all exercises
  console.log('🏋️ Fetching all exercises from database...')
  const { data: exercises, error: exercisesError } = await supabase
    .from('exercise_library')
    .select('id, name, muscle_group, equipment_type, linear_progression_tier_id')
    .order('name')

  if (exercisesError) {
    console.error('❌ Failed to fetch exercises:', exercisesError)
    process.exit(1)
  }

  if (!exercises || exercises.length === 0) {
    console.error('⚠️ No exercises found in database.')
    process.exit(0)
  }

  console.log(`✅ Found ${exercises.length} exercises\n`)

  // Step 3: Assign tiers to exercises
  console.log('🎯 Assigning tiers to exercises...\n')

  const assignments: Array<{ exerciseId: string; exerciseName: string; tierName: string; tierId: string }> = []
  const alreadyAssigned: string[] = []
  const skipped: Array<{ exerciseName: string; reason: string }> = []

  for (const exercise of exercises) {
    // Skip if already has a tier assigned
    if (exercise.linear_progression_tier_id) {
      alreadyAssigned.push(exercise.name)
      continue
    }

    // Determine category based on muscle group (simple heuristic)
    let category: 'compound' | 'isolation'

    // Major compound movements typically target multiple large muscle groups
    const compoundKeywords = [
      'squat', 'deadlift', 'press', 'row', 'pull-up', 'chin-up', 'dip',
      'lunge', 'clean', 'snatch', 'thruster'
    ]

    const exerciseNameLower = exercise.name.toLowerCase()
    const isCompound = compoundKeywords.some(keyword => exerciseNameLower.includes(keyword))

    category = isCompound ? 'compound' : 'isolation'

    // Get tier using heuristic
    const tierName = getExerciseTier(exercise.name, category)
    const tierId = tierMap.get(tierName)

    if (!tierId) {
      skipped.push({ exerciseName: exercise.name, reason: `Tier '${tierName}' not found in database` })
      continue
    }

    assignments.push({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      tierName,
      tierId
    })
  }

  // Step 4: Apply assignments to database
  if (assignments.length > 0) {
    console.log(`📝 Updating ${assignments.length} exercises in database...\n`)

    let successCount = 0
    let failCount = 0

    for (const assignment of assignments) {
      const { error } = await supabase
        .from('exercise_library')
        .update({ linear_progression_tier_id: assignment.tierId })
        .eq('id', assignment.exerciseId)

      if (error) {
        console.error(`   ❌ ${assignment.exerciseName} → ${assignment.tierName} (FAILED: ${error.message})`)
        failCount++
      } else {
        console.log(`   ✅ ${assignment.exerciseName} → ${assignment.tierName}`)
        successCount++
      }
    }

    console.log()
    console.log(`✨ Assignment complete:`)
    console.log(`   - ✅ Success: ${successCount}`)
    console.log(`   - ❌ Failed: ${failCount}`)
    console.log(`   - ⏭️  Already assigned: ${alreadyAssigned.length}`)
    console.log(`   - ⚠️  Skipped: ${skipped.length}`)
  } else {
    console.log('ℹ️  No exercises to assign (all already have tiers or were skipped)')
  }

  // Step 5: Show summary by tier
  console.log('\n📊 Summary by tier:')

  const tierCounts = new Map<string, number>()

  // Count exercises by tier (including already assigned)
  for (const exercise of exercises) {
    if (exercise.linear_progression_tier_id) {
      const tier = tiers.find(t => t.id === exercise.linear_progression_tier_id)
      if (tier) {
        tierCounts.set(tier.tier_name, (tierCounts.get(tier.tier_name) || 0) + 1)
      }
    }
  }

  tiers.forEach(tier => {
    const count = tierCounts.get(tier.tier_name) || 0
    console.log(`   ${tier.tier_name}: ${count} exercises`)
  })

  // Show unassigned count
  const unassignedCount = exercises.filter(e => !e.linear_progression_tier_id).length
  if (unassignedCount > 0) {
    console.log(`   ⚠️  Unassigned: ${unassignedCount} exercises`)
  }

  console.log('\n🎉 Script completed successfully!')
}

// Run the script
main().catch(error => {
  console.error('💥 Script failed with error:', error)
  process.exit(1)
})
