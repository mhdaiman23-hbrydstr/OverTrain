/**
 * Test Exercise Resolver with Real Database
 *
 * This script validates that the Exercise Resolver can:
 * 1. Connect to Supabase
 * 2. Resolve exercises from templates
 * 3. Handle different input formats (UUID, name, slug)
 * 4. Report performance metrics
 */

import { exerciseResolver } from '../lib/services/exercise-resolver.js'
import { exerciseService } from '../lib/services/exercise-library-service.js'
import { GYM_TEMPLATES } from '../lib/gym-templates.js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

interface TestResult {
  exercise: string
  input: string
  found: boolean
  uuid?: string
  muscleGroup?: string
  equipmentType?: string
  timeMs: number
  method: 'uuid' | 'name' | 'slug'
}

class ResolverTester {
  private results: TestResult[] = []
  private totalTime = 0

  async testConnection(): Promise<boolean> {
    console.log('\n🔌 Testing Supabase Connection...')

    try {
      const exercises = await exerciseService.getAllExercises()
      console.log(`✅ Connected! Found ${exercises.length} exercises in database`)
      return true
    } catch (error) {
      console.error('❌ Connection failed:', error)
      return false
    }
  }

  async testResolverWithTemplates(): Promise<void> {
    console.log('\n🧪 Testing Resolver with Template Exercises...\n')

    const uniqueExercises = new Set<string>()

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
      await this.testExerciseResolution(exerciseName)
    }
  }

  async testExerciseResolution(exerciseName: string): Promise<void> {
    const startTime = performance.now()

    try {
      const exercise = await exerciseResolver.resolve(exerciseName)
      const endTime = performance.now()
      const timeMs = endTime - startTime

      if (exercise) {
        this.results.push({
          exercise: exerciseName,
          input: exerciseName,
          found: true,
          uuid: exercise.id,
          muscleGroup: exercise.muscleGroup,
          equipmentType: exercise.equipmentType,
          timeMs,
          method: 'name'
        })
        console.log(`✅ ${exerciseName}`)
        console.log(`   └─ UUID: ${exercise.id}`)
        console.log(`   └─ Muscle: ${exercise.muscleGroup} | Equipment: ${exercise.equipmentType}`)
        console.log(`   └─ Resolved in ${timeMs.toFixed(2)}ms\n`)
      } else {
        this.results.push({
          exercise: exerciseName,
          input: exerciseName,
          found: false,
          timeMs,
          method: 'name'
        })
        console.log(`❌ ${exerciseName} - NOT FOUND IN DATABASE`)
        console.log(`   └─ Time: ${timeMs.toFixed(2)}ms\n`)
      }

      this.totalTime += timeMs
    } catch (error) {
      console.error(`❌ Error resolving ${exerciseName}:`, error)
    }
  }

  async testSlugResolution(): Promise<void> {
    console.log('\n🔄 Testing Slug Resolution (Backwards Compatibility)...\n')

    const testSlugs = [
      'barbell-bench-press',
      'barbell-back-squat',
      'deadlift',
      'overhead-press',
      'barbell-row'
    ]

    for (const slug of testSlugs) {
      const startTime = performance.now()
      const exercise = await exerciseResolver.resolve(slug)
      const endTime = performance.now()

      if (exercise) {
        console.log(`✅ "${slug}" → "${exercise.name}"`)
        console.log(`   └─ Resolved in ${(endTime - startTime).toFixed(2)}ms\n`)
      } else {
        console.log(`❌ "${slug}" → NOT FOUND\n`)
      }
    }
  }

  async testCachePerformance(): Promise<void> {
    console.log('\n⚡ Testing Cache Performance...\n')

    // Warm cache
    console.log('Warming cache...')
    await exerciseResolver.warmCache()
    console.log('✅ Cache warmed\n')

    // Test same exercise multiple times
    const testExercise = 'Barbell Bench Press'
    const iterations = 5

    console.log(`Testing "${testExercise}" ${iterations} times:`)

    for (let i = 1; i <= iterations; i++) {
      const startTime = performance.now()
      await exerciseResolver.resolve(testExercise)
      const endTime = performance.now()

      console.log(`  ${i}. ${(endTime - startTime).toFixed(2)}ms ${i === 1 ? '(first lookup)' : '(cached)'}`)
    }
  }

  async testBatchResolution(): Promise<void> {
    console.log('\n📦 Testing Batch Resolution...\n')

    const exercises = [
      'Barbell Bench Press',
      'Barbell Back Squat',
      'Deadlift',
      'Overhead Press',
      'Barbell Row'
    ]

    const startTime = performance.now()
    const results = await exerciseResolver.resolveMany(exercises)
    const endTime = performance.now()

    console.log(`Resolved ${exercises.length} exercises in ${(endTime - startTime).toFixed(2)}ms`)
    console.log(`Average: ${((endTime - startTime) / exercises.length).toFixed(2)}ms per exercise\n`)

    for (const [name, exercise] of results) {
      if (exercise) {
        console.log(`✅ ${name} → ${exercise.id}`)
      } else {
        console.log(`❌ ${name} → NOT FOUND`)
      }
    }
  }

  printSummary(): void {
    console.log('\n' + '='.repeat(60))
    console.log('📊 TEST SUMMARY')
    console.log('='.repeat(60))

    const found = this.results.filter(r => r.found).length
    const notFound = this.results.filter(r => !r.found).length
    const successRate = (found / this.results.length) * 100

    console.log(`\nTotal Exercises Tested: ${this.results.length}`)
    console.log(`✅ Found: ${found}`)
    console.log(`❌ Not Found: ${notFound}`)
    console.log(`📈 Success Rate: ${successRate.toFixed(2)}%`)

    if (this.results.length > 0) {
      const avgTime = this.totalTime / this.results.length
      console.log(`⚡ Average Resolution Time: ${avgTime.toFixed(2)}ms`)
    }

    if (notFound > 0) {
      console.log('\n⚠️  Missing Exercises:')
      console.log('─'.repeat(60))
      this.results
        .filter(r => !r.found)
        .forEach(r => {
          console.log(`  • ${r.exercise}`)
        })

      console.log('\n💡 Action Required:')
      console.log('  These exercises need to be added to the database')
      console.log('  or template exercise names need to be corrected.')
    }

    console.log('\n' + '='.repeat(60))
  }

  getMissingExercises(): string[] {
    return this.results
      .filter(r => !r.found)
      .map(r => r.exercise)
  }

  exportResults(): void {
    const fs = require('fs')
    const outputPath = './test-resolver-results.json'

    const output = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        found: this.results.filter(r => r.found).length,
        notFound: this.results.filter(r => !r.found).length,
        averageTimeMs: this.totalTime / this.results.length
      },
      results: this.results,
      missingExercises: this.getMissingExercises()
    }

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))
    console.log(`\n💾 Results exported to: ${outputPath}`)
  }
}

// Main execution
async function main() {
  console.log('🚀 Exercise Resolver Test Suite')
  console.log('='.repeat(60))

  const tester = new ResolverTester()

  // Test 1: Connection
  const connected = await tester.testConnection()
  if (!connected) {
    console.error('\n❌ Cannot proceed without database connection')
    process.exit(1)
  }

  // Test 2: Template exercises
  await tester.testResolverWithTemplates()

  // Test 3: Slug resolution
  await tester.testSlugResolution()

  // Test 4: Cache performance
  await tester.testCachePerformance()

  // Test 5: Batch resolution
  await tester.testBatchResolution()

  // Print summary
  tester.printSummary()

  // Export results
  tester.exportResults()

  const missingCount = tester.getMissingExercises().length
  if (missingCount > 0) {
    console.log(`\n⚠️  Warning: ${missingCount} exercises missing from database`)
    process.exit(1)
  } else {
    console.log('\n✅ All tests passed! Resolver is ready for integration.')
    process.exit(0)
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })
}

export { ResolverTester }
