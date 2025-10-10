"use client"

import { useState } from 'react'
import { exerciseService } from '@/lib/services/exercise-library-service'

export default function CheckDbNamesPage() {
  const [exercises, setExercises] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const loadExercises = async () => {
    setLoading(true)
    try {
      const all = await exerciseService.getAllExercises()
      setExercises(all)
    } catch (error) {
      console.error('Failed to load exercises:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = exercises.filter(ex =>
    ex.name.toLowerCase().includes(search.toLowerCase())
  )

  const templateExercises = [
    'Barbell Back Squat',
    'Barbell Bench Press',
    'Barbell Row',
    'Overhead Press',
    'Barbell Curls',
    'Barbell Front Squat',
    'Pull-ups',
    'Lateral Raises',
    'Romanian Deadlift',
    'Incline Barbell Press',
    'Tricep Extensions',
    'Leg Curls',
    'Dips',
    'Leg Extensions'
  ]

  const findMatches = (templateName: string) => {
    return exercises.filter(ex =>
      ex.name.toLowerCase().includes(templateName.toLowerCase().split(' ')[0]) ||
      templateName.toLowerCase().includes(ex.name.toLowerCase().split(' ')[0])
    )
  }

  return (
    <div style={{
      fontFamily: 'monospace',
      maxWidth: '1400px',
      margin: '20px auto',
      padding: '20px',
      backgroundColor: '#0a0a0a',
      color: '#00ff00',
      minHeight: '100vh'
    }}>
      <h1 style={{ borderBottom: '2px solid #00ff00', paddingBottom: '10px' }}>
        🔍 Database Exercise Name Checker
      </h1>

      <button
        onClick={loadExercises}
        disabled={loading}
        style={{
          background: loading ? '#666' : '#00ff00',
          color: '#000',
          border: 'none',
          padding: '10px 20px',
          cursor: loading ? 'not-allowed' : 'pointer',
          margin: '10px 5px',
          fontWeight: 'bold'
        }}
      >
        {loading ? '⏳ Loading...' : '📥 Load All Exercises'}
      </button>

      {exercises.length > 0 && (
        <>
          <div style={{ margin: '20px 0' }}>
            <h2>📋 Template Exercises → Database Matches</h2>
            <div style={{ background: '#1a1a1a', padding: '15px' }}>
              {templateExercises.map(templateName => {
                const matches = findMatches(templateName)
                return (
                  <div key={templateName} style={{ marginBottom: '15px', borderLeft: '3px solid #00ff00', paddingLeft: '10px' }}>
                    <div style={{ color: '#ffaa00', fontWeight: 'bold' }}>
                      Template: "{templateName}"
                    </div>
                    {matches.length > 0 ? (
                      matches.map(match => (
                        <div key={match.id} style={{ color: '#00ff00', marginLeft: '20px' }}>
                          ✅ DB: "{match.name}" (UUID: {match.id})
                        </div>
                      ))
                    ) : (
                      <div style={{ color: '#ff0000', marginLeft: '20px' }}>
                        ❌ No matches found
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ margin: '20px 0' }}>
            <h2>🔎 Search All Exercises</h2>
            <input
              type="text"
              placeholder="Search exercise names..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                background: '#1a1a1a',
                color: '#00ff00',
                border: '2px solid #00ff00',
                fontFamily: 'monospace'
              }}
            />
            <div style={{ background: '#1a1a1a', padding: '15px', marginTop: '10px', maxHeight: '400px', overflowY: 'auto' }}>
              {filtered.map(ex => (
                <div key={ex.id} style={{ marginBottom: '5px' }}>
                  • {ex.name} <span style={{ color: '#666' }}>({ex.muscleGroup} | {ex.equipmentType})</span>
                </div>
              ))}
              {filtered.length === 0 && <div>No results</div>}
            </div>
          </div>

          <div style={{ margin: '20px 0', background: '#1a1a1a', padding: '15px' }}>
            <h3>📊 Stats</h3>
            <div>Total exercises in DB: {exercises.length}</div>
            <div>Filtered results: {filtered.length}</div>
          </div>
        </>
      )}
    </div>
  )
}
