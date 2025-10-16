/**
 * Verify Progression Tier Assignments
 *
 * This script verifies that all exercises have progression tiers assigned
 * and provides a detailed report of the tier distribution.
 *
 * Run with: npx ts-node scripts/verify-tier-assignments.ts
 */

import { supabase } from '../lib/supabase'

interface Exercise {
  id: string
  name: string
  muscle_group: string
  equipment_type: string
  linear_progression_tier_id: string | null
}

interface ExerciseWithTier extends Exercise {
  linear_progression_tiers: {
    tier_name: string
    min_increment: number
    weekly_increase: number
    adjustment_bounds: number
    max_rep_adjustment: number
  } | null
}

async function main() {
  console.log('🔍 Verifying tier assignments...\n')

  // Fetch all exercises with their assigned tiers (using LEFT JOIN)
  console.log('📊 Fetching exercises and tier data...')
  const { data: exercises, error } = await supabase
    .from('exercise_library')
    .select(`
      id,
      name,
      muscle_group,
      equipment_type,
      linear_progression_tier_id,
      linear_progression_tiers:linear_progression_tier_id (
        tier_name,
        min_increment,
        weekly_increase,
        adjustment_bounds,
        max_rep_adjustment
      )
    `)
    .order('name')

  if (error) {
    console.error('❌ Failed to fetch exercises:', error)
    process.exit(1)
  }

  if (!exercises || exercises.length === 0) {
    console.error('⚠️ No exercises found in database.')
    process.exit(0)
  }

  console.log(`✅ Found ${exercises.length} exercises\n`)

  // Categorize exercises
  const withTiers: ExerciseWithTier[] = []
  const withoutTiers: Exercise[] = []

  exercises.forEach(ex => {
    const exerciseWithTier = ex as ExerciseWithTier
    if (exerciseWithTier.linear_progression_tiers) {
      withTiers.push(exerciseWithTier)
    } else {
      withoutTiers.push(ex)
    }
  })

  // Summary stats
  console.log('📈 Summary Statistics:')
  console.log(`   Total exercises: ${exercises.length}`)
  console.log(`   ✅ With tiers assigned: ${withTiers.length} (${((withTiers.length / exercises.length) * 100).toFixed(1)}%)`)
  console.log(`   ❌ Without tiers: ${withoutTiers.length} (${((withoutTiers.length / exercises.length) * 100).toFixed(1)}%)\n`)

  const tierGroups = new Map<string, ExerciseWithTier[]>()
  // Group exercises by tier
  if (withTiers.length > 0) {
    console.log('📊 Exercises by Tier:\n')


    withTiers.forEach(ex => {
      const tierName = ex.linear_progression_tiers!.tier_name
      if (!tierGroups.has(tierName)) {
        tierGroups.set(tierName, [])
      }
      tierGroups.get(tierName)!.push(ex)
    })

    // Sort tiers by weekly_increase descending (most aggressive first)
    const sortedTiers = Array.from(tierGroups.entries()).sort((a, b) => {
      const aIncrease = a[1][0].linear_progression_tiers!.weekly_increase
      const bIncrease = b[1][0].linear_progression_tiers!.weekly_increase
      return bIncrease - aIncrease
    })

    sortedTiers.forEach(([tierName, tierExercises]) => {
      const tier = tierExercises[0].linear_progression_tiers!
      console.log(`🏷️  ${tierName} (${tierExercises.length} exercises)`)
      console.log(`   Rules: ${tier.min_increment} lb increment, ${(tier.weekly_increase * 100).toFixed(2)}% weekly, ±${(tier.adjustment_bounds * 100).toFixed(0)}% bounds, ${tier.max_rep_adjustment} max rep adj`)
      console.log(`   Exercises:`)

      // Show first 10 exercises, then summarize
      const displayCount = Math.min(10, tierExercises.length)
      tierExercises.slice(0, displayCount).forEach(ex => {
        console.log(`      - ${ex.name} (${ex.muscle_group})`)
      })

      if (tierExercises.length > displayCount) {
        console.log(`      ... and ${tierExercises.length - displayCount} more`)
      }

      console.log()
    })
  }

  // Show exercises without tiers
  if (withoutTiers.length > 0) {
    console.log('⚠️  Exercises Without Assigned Tiers:\n')

    withoutTiers.forEach(ex => {
      console.log(`   - ${ex.name} (${ex.muscle_group}, ${ex.equipment_type})`)
    })

    console.log()
    console.log(`❗ Action Required: Run 'npx ts-node scripts/assign-tiers-to-exercises.ts' to assign tiers\n`)
  }

  // Validation checks
  console.log('🔐 Validation Checks:')

  const allAssigned = withoutTiers.length === 0
  const hasExercises = exercises.length > 0
  const hasTierDistribution = tierGroups && tierGroups.size > 0

  console.log(`   ${allAssigned ? '✅' : '❌'} All exercises have tiers assigned`)
  console.log(`   ${hasExercises ? '✅' : '❌'} Exercise library is populated`)
  console.log(`   ${hasTierDistribution ? '✅' : '❌'} Tier distribution is healthy`)

  console.log()

  if (allAssigned && hasExercises && hasTierDistribution) {
    console.log('🎉 All checks passed! Tier assignments are complete and valid.')
    process.exit(0)
  } else {
    console.log('⚠️  Some checks failed. Please review the issues above.')
    process.exit(1)
  }
}

// Run the script
main().catch(error => {
  console.error('💥 Script failed with error:', error)
  process.exit(1)
})
