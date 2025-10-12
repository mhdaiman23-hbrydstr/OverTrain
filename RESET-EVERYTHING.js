// COMPLETE RESET SCRIPT
// Run this in browser console to start fresh
// This will delete ALL workout data and reset to Week 1 Day 1

(async function completeReset() {
  console.log('🔥 COMPLETE RESET - Starting...')
  
  try {
    const userId = '6bf0e5d0-cf5c-4820-90f5-346e1e2a4d4c'
    
    // Wait for Supabase
    console.log('⏳ Waiting for Supabase...')
    let attempts = 0
    let supabase = null
    
    while (!supabase && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100))
      if (window.supabase?.createClient) {
        const SUPABASE_URL = 'https://fyhbpkjibjtvltwcavlw.supabase.co'
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5aGJwa2ppYmp0dmx0d2Nhdmx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1NTI4MTQsImV4cCI6MjA1MDEyODgxNH0.WSbv_HLvmEt7VN8UfX5ygxrpfqlEOhjW0ktTSNL8vXg'
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
        console.log('✅ Supabase ready')
        break
      }
      attempts++
    }
    
    if (!supabase) {
      console.error('❌ Supabase not available. Try refreshing and running again.')
      return
    }
    
    // 1. Delete ALL workouts from database
    console.log('\n🗑️  Deleting workouts from database...')
    const { data: deletedWorkouts } = await supabase
      .from('workouts')
      .delete()
      .eq('user_id', userId)
      .select()
    console.log(`✅ Deleted ${deletedWorkouts?.length || 0} workouts`)
    
    // 2. Delete ALL in-progress workouts from database
    console.log('🗑️  Deleting in-progress workouts from database...')
    const { data: deletedIP } = await supabase
      .from('in_progress_workouts')
      .delete()
      .eq('user_id', userId)
      .select()
    console.log(`✅ Deleted ${deletedIP?.length || 0} in-progress workouts`)
    
    // 3. Clear ALL workout-related localStorage
    console.log('\n🧹 Clearing localStorage...')
    const keysToRemove = [
      `liftlog_workouts_${userId}`,
      `liftlog_db_workouts_${userId}`,
      `liftlog_in_progress_workouts_${userId}`,
      `liftlog_db_in_progress_workouts_${userId}`,
      `liftlog_program_progress_${userId}`,
      'liftlog_workouts',
      'liftlog_in_progress_workouts',
      'liftlog_program_progress'
    ]
    
    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key)
        console.log(`  ✅ Cleared: ${key}`)
      }
    })
    
    // 4. Reset program to Week 1 Day 1
    console.log('\n🔄 Resetting program state...')
    const activeProgramStr = localStorage.getItem('liftlog_active_program')
    if (activeProgramStr) {
      const activeProgram = JSON.parse(activeProgramStr)
      activeProgram.currentWeek = 1
      activeProgram.currentDay = 1
      activeProgram.completedWorkouts = 0
      activeProgram.progress = 0
      localStorage.setItem('liftlog_active_program', JSON.stringify(activeProgram))
      console.log('✅ Program reset to Week 1 Day 1')
    }
    
    console.log('\n✅ RESET COMPLETE!')
    console.log('🔄 Refreshing page in 2 seconds...')
    
    setTimeout(() => {
      window.location.reload()
    }, 2000)
    
  } catch (error) {
    console.error('❌ Reset error:', error)
  }
})()

