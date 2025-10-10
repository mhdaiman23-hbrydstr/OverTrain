"use client"

import { useState } from 'react'
import { exerciseResolver } from '@/lib/services/exercise-resolver'
import { exerciseService } from '@/lib/services/exercise-library-service'
import { GYM_TEMPLATES } from '@/lib/gym-templates'

export default function TestResolverPage() {
  const [output, setOutput] = useState<string[]>([])
  const [running, setRunning] = useState(false)

  const log = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '📝'
    setOutput(prev => [...prev, `${prefix} ${message}`])
  }

  const runTests = async () => {
    setRunning(true)
    setOutput([])

    log('🚀 Starting Test Suite...', 'success')
    log('='.repeat(60))

    try {
      // Test 1: Database Connection
      log('Test 1: Database Connection')
      const exercises = await exerciseService.getAllExercises()
      log(`Connected! Found ${exercises.length} exercises in database`, 'success')

      // Test 2: Template Exercises
      log('Test 2: Resolving Template Exercises')
      const uniqueExercises = new Set<string>()

      for (const template of GYM_TEMPLATES) {
        for (const dayKey in template.schedule) {
          for (const exercise of template.schedule[dayKey].exercises) {
            uniqueExercises.add(exercise.exerciseName)
          }
        }
      }

      log(`Found ${uniqueExercises.size} unique exercises in templates`)

      let found = 0
      let notFound = 0
      const missing: string[] = []

      for (const exerciseName of uniqueExercises) {
        const startTime = performance.now()
        const exercise = await exerciseResolver.resolve(exerciseName)
        const endTime = performance.now()

        if (exercise) {
          found++
          log(`${exerciseName}`, 'success')
          log(`   UUID: ${exercise.id}`)
          log(`   ${exercise.muscleGroup} | ${exercise.equipmentType} | ${(endTime - startTime).toFixed(2)}ms`)
        } else {
          notFound++
          missing.push(exerciseName)
          log(`${exerciseName} - NOT FOUND`, 'error')
        }
      }

      // Test 3: Slug Resolution
      log('Test 3: Slug Resolution (Backwards Compatibility)')
      const testSlugs = ['barbell-bench-press', 'barbell-back-squat', 'deadlift']

      for (const slug of testSlugs) {
        const exercise = await exerciseResolver.resolve(slug)
        if (exercise) {
          log(`"${slug}" → "${exercise.name}"`, 'success')
        } else {
          log(`"${slug}" → NOT FOUND`, 'error')
        }
      }

      // Test 4: Cache Performance
      log('Test 4: Cache Performance')
      log('Warming cache...')
      await exerciseResolver.warmCache()

      const testExercise = 'Barbell Bench Press'
      const times: number[] = []

      for (let i = 0; i < 5; i++) {
        const startTime = performance.now()
        await exerciseResolver.resolve(testExercise)
        const endTime = performance.now()
        times.push(endTime - startTime)
      }

      log(`First lookup: ${times[0].toFixed(2)}ms`)
      log(`Cached lookups: ${times.slice(1).map(t => t.toFixed(2)).join('ms, ')}ms`)

      // Summary
      log('='.repeat(60))
      log('📊 SUMMARY', 'success')
      log('='.repeat(60))
      log(`Total Exercises: ${uniqueExercises.size}`)
      log(`✅ Found: ${found}`)
      log(`❌ Not Found: ${notFound}`)
      log(`📈 Success Rate: ${((found / uniqueExercises.size) * 100).toFixed(2)}%`)

      if (notFound > 0) {
        log('Missing Exercises:', 'warning')
        missing.forEach(name => log(`  • ${name}`, 'warning'))
      } else {
        log('All tests passed! Resolver ready for integration.', 'success')
      }

      log('='.repeat(60))

    } catch (error) {
      log(`Test failed: ${error}`, 'error')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{
      fontFamily: 'monospace',
      maxWidth: '1200px',
      margin: '20px auto',
      padding: '20px',
      backgroundColor: '#0a0a0a',
      color: '#00ff00',
      minHeight: '100vh'
    }}>
      <h1 style={{ borderBottom: '2px solid #00ff00', paddingBottom: '10px' }}>
        🧪 Exercise Resolver Test Suite
      </h1>

      <div style={{ padding: '10px', margin: '10px 0', borderLeft: '4px solid #00ff00' }}>
        <strong>Purpose:</strong> Test if the Exercise Resolver can find all template exercises in the database
      </div>

      <button
        onClick={runTests}
        disabled={running}
        style={{
          background: running ? '#666' : '#00ff00',
          color: '#000',
          border: 'none',
          padding: '10px 20px',
          cursor: running ? 'not-allowed' : 'pointer',
          margin: '10px 5px',
          fontWeight: 'bold'
        }}
      >
        {running ? '⏳ Running...' : '▶ Run All Tests'}
      </button>

      <button
        onClick={() => setOutput([])}
        style={{
          background: '#00ff00',
          color: '#000',
          border: 'none',
          padding: '10px 20px',
          cursor: 'pointer',
          margin: '10px 5px',
          fontWeight: 'bold'
        }}
      >
        🗑 Clear Output
      </button>

      <div style={{
        background: '#1a1a1a',
        padding: '15px',
        marginTop: '20px',
        maxHeight: '600px',
        overflowY: 'auto'
      }}>
        {output.map((line, i) => (
          <div key={i} style={{ marginBottom: '5px' }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  )
}
