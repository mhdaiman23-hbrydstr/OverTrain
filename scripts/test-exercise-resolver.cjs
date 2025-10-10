/**
 * Test Exercise Resolver with Real Database
 *
 * CommonJS version for easier execution with ts-node
 */

const dotenv = require('dotenv')
const path = require('path')

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

async function main() {
  console.log('🚀 Exercise Resolver Test Suite')
  console.log('='.repeat(60))

  // Dynamically import ESM modules
  const { exerciseResolver } = await import('../dist/lib/services/exercise-resolver.js')
  const { exerciseService } = await import('../dist/lib/services/exercise-library-service.js')
  const { GYM_TEMPLATES } = await import('../dist/lib/gym-templates.js')

  console.log('\n🔌 Testing Supabase Connection...')

  try {
    const exercises = await exerciseService.getAllExercises()
    console.log(`✅ Connected! Found ${exercises.length} exercises in database\n`)
  } catch (error) {
    console.error('❌ Connection failed:', error.message)
    process.exit(1)
  }

  console.log('🧪 Testing Resolver with Template Exercises...\n')

  const uniqueExercises = new Set()
  const results = []

  // Collect all unique exercise names from templates
  for (const template of GYM_TEMPLATES) {
    for (const dayKey in template.schedule) {
      for (const exercise of template.schedule[dayKey].exercises) {
        uniqueExercises.add(exercise.exerciseName)
      }
    }
  }

  console.log(`Found ${uniqueExercises.size} unique exercises in templates`)
  console.log('Testing each one...\n')

  for (const exerciseName of uniqueExercises) {
    const startTime = performance.now()

    try {
      const exercise = await exerciseResolver.resolve(exerciseName)
      const endTime = performance.now()
      const timeMs = endTime - startTime

      if (exercise) {
        results.push({ exercise: exerciseName, found: true, uuid: exercise.id })
        console.log(`✅ ${exerciseName}`)
        console.log(`   └─ UUID: ${exercise.id}`)
        console.log(`   └─ Muscle: ${exercise.muscleGroup} | Equipment: ${exercise.equipmentType}`)
        console.log(`   └─ Resolved in ${timeMs.toFixed(2)}ms\n`)
      } else {
        results.push({ exercise: exerciseName, found: false })
        console.log(`❌ ${exerciseName} - NOT FOUND IN DATABASE\n`)
      }
    } catch (error) {
      console.error(`❌ Error resolving ${exerciseName}:`, error.message)
      results.push({ exercise: exerciseName, found: false })
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(60))

  const found = results.filter(r => r.found).length
  const notFound = results.filter(r => !r.found).length
  const successRate = (found / results.length) * 100

  console.log(`\nTotal Exercises Tested: ${results.length}`)
  console.log(`✅ Found: ${found}`)
  console.log(`❌ Not Found: ${notFound}`)
  console.log(`📈 Success Rate: ${successRate.toFixed(2)}%`)

  if (notFound > 0) {
    console.log('\n⚠️  Missing Exercises:')
    console.log('─'.repeat(60))
    results
      .filter(r => !r.found)
      .forEach(r => {
        console.log(`  • ${r.exercise}`)
      })
  }

  console.log('\n' + '='.repeat(60))

  if (notFound > 0) {
    console.log(`\n⚠️  Warning: ${notFound} exercises missing from database`)
    process.exit(1)
  } else {
    console.log('\n✅ All tests passed! Resolver is ready for integration.')
    process.exit(0)
  }
}

main().catch(error => {
  console.error('\n❌ Test failed:', error)
  process.exit(1)
})
