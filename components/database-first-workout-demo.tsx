/**
 * Database-First Workout Logger Demo Component
 * 
 * This component demonstrates how to use the new database-first workout logger
 * with sync status indicators and offline support.
 */

'use client'

import React, { useState } from 'react'
import { useWorkoutLoggerDatabaseFirst } from '@/lib/workout-logger-database-first'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  Play,
  Square,
  Trash2
} from 'lucide-react'

interface DatabaseFirstWorkoutDemoProps {
  userId: string
  programId?: string
}

export function DatabaseFirstWorkoutDemo({ 
  userId, 
  programId 
}: DatabaseFirstWorkoutDemoProps) {
  const [selectedExercise, setSelectedExercise] = useState<string>('')
  
  const {
    workout,
    isLoading,
    error,
    syncStatus,
    startWorkout,
    completeSet,
    completeWorkout,
    abandonWorkout,
    forceSync,
    clearSyncQueue,
    formatDuration,
    getCompletionStats
  } = useWorkoutLoggerDatabaseFirst({
    userId,
    programId,
    autoStart: false,
    enableNotifications: true
  })

  const stats = getCompletionStats()

  const handleStartWorkout = async () => {
    try {
      await startWorkout('Demo Workout', 1, 1, [
        {
          id: 'bench-press',
          name: 'Bench Press',
          targetSets: 3
        },
        {
          id: 'squat',
          name: 'Squat',
          targetSets: 3
        },
        {
          id: 'deadlift',
          name: 'Deadlift',
          targetSets: 3
        }
      ])
    } catch (err) {
      console.error('Failed to start workout:', err)
    }
  }

  const handleCompleteSet = async (exerciseId: string, setId: string) => {
    try {
      await completeSet(exerciseId, setId, {
        completed: true,
        reps: Math.floor(Math.random() * 5) + 8, // 8-12 reps
        weight: Math.floor(Math.random() * 50) + 100 // 100-150 lbs
      })
    } catch (err) {
      console.error('Failed to complete set:', err)
    }
  }

  const handleCompleteWorkout = async () => {
    try {
      await completeWorkout('Great demo workout!')
    } catch (err) {
      console.error('Failed to complete workout:', err)
    }
  }

  const handleAbandonWorkout = async () => {
    try {
      await abandonWorkout()
    } catch (err) {
      console.error('Failed to abandon workout:', err)
    }
  }

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading workout...
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Sync Status Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {syncStatus.isOnline ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm font-medium">
                  {syncStatus.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              
              {syncStatus.queueSize > 0 && (
                <Badge variant="secondary" className="text-yellow-600">
                  {syncStatus.queueSize} pending sync
                </Badge>
              )}
              
              {syncStatus.hasErrors && (
                <Badge variant="destructive">
                  Sync errors
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {!syncStatus.isOnline && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={forceSync}
                  disabled={syncStatus.isSyncing}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
                  Sync Now
                </Button>
              )}
              
              {syncStatus.queueSize > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearSyncQueue}
                >
                  Clear Queue
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Workout Display */}
      {!workout ? (
        <Card>
          <CardHeader>
            <CardTitle>Start a Demo Workout</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={handleStartWorkout} className="w-full">
              <Play className="h-4 w-4 mr-2" />
              Start Demo Workout
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {workout.workoutName}
                {workout.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Clock className="h-5 w-5 text-blue-500" />
                )}
              </CardTitle>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  Week {workout.week}, Day {workout.day}
                </Badge>
                
                {!workout.completed && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCompleteWorkout}
                    >
                      <Square className="h-4 w-4 mr-1" />
                      Complete
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleAbandonWorkout}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Workout Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.totalSets}</div>
                <div className="text-sm text-muted-foreground">Total Sets</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.completedSets}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{Math.round(stats.completionPercentage)}%</div>
                <div className="text-sm text-muted-foreground">Complete</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.totalWeight} lbs</div>
                <div className="text-sm text-muted-foreground">Total Volume</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(stats.completionPercentage)}%</span>
              </div>
              <Progress value={stats.completionPercentage} className="h-2" />
            </div>

            {/* Duration */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Duration: {formatDuration(
                workout.endTime 
                  ? workout.endTime - workout.startTime 
                  : Date.now() - workout.startTime
              )}
            </div>

            {/* Exercises */}
            <div className="space-y-3">
              <h3 className="font-medium">Exercises</h3>
              {workout.exercises.map((exercise) => (
                <Card key={exercise.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{exercise.exerciseName}</h4>
                    <Badge variant="secondary">
                      {exercise.sets.filter(s => s.completed).length}/{exercise.sets.length} sets
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {exercise.sets.map((set) => (
                      <div
                        key={set.id}
                        className={`p-3 rounded-lg border ${
                          set.completed 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Set {exercise.sets.indexOf(set) + 1}</span>
                          {set.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Circle className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        
                        {set.completed ? (
                          <div className="text-sm space-y-1">
                            <div>{set.reps} reps @ {set.weight} lbs</div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => handleCompleteSet(exercise.id, set.id)}
                            disabled={workout.completed}
                          >
                            Complete Set
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>

            {/* Notes */}
            {workout.notes && (
              <div className="space-y-2">
                <h3 className="font-medium">Notes</h3>
                <p className="text-sm text-muted-foreground">{workout.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default DatabaseFirstWorkoutDemo
