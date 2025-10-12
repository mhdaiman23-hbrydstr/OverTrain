// DATABASE RESET SCRIPT - Copy and paste into browser console
// This will clear all workout data and reset to fresh Week 1 Day 1

(async function resetDatabase() {
  console.log('🔄 Resetting database to fresh Week 1 Day 1...')
  
  const userId = '6bf0e5d0-cf5c-4820-90f5-346e1e2a4d4c'
  
  // Import Supabase from CDN
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
  
  const supabase = createClient(
    'https://fyhbpkjibjtvltwcavlw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5aGJwa2ppYmp0dmx0d2Nhdmx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1NTI4MTQsImV4cCI6MjA1MDEyODgxNH0.WSbv_HLvmEt7VN8UfX5ygxrpfqlEOhjW0ktTSNL8vXg'
  )
  
  try {
    // 1. Delete all completed workouts
    const { data: deletedWorkouts, error: err1 } = await supabase
      .from('workouts')
      .delete()
      .eq('user_id', userId)
      .select()
    
    if (err1) throw err1
    console.log(`✅ Deleted ${deletedWorkouts?.length || 0} completed workouts`)
    
    // 2. Delete all in-progress workouts
    const { data: deletedIP, error: err2 } = await supabase
      .from('in_progress_workouts')
      .delete()
      .eq('user_id', userId)
      .select()
    
    if (err2) throw err2
    console.log(`✅ Deleted ${deletedIP?.length || 0} in-progress workouts`)
    
    // 3. Reset active program to Week 1 Day 1
    const { error: err3 } = await supabase
      .from('active_programs')
      .update({
        current_week: 1,
        current_day: 1,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
    
    if (err3) throw err3
    console.log('✅ Reset active program to Week 1 Day 1')
    
    // 4. Clear localStorage
    const keysToRemove = []
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('liftlog_') || key.includes(userId)) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
    console.log(`✅ Cleared ${keysToRemove.length} localStorage keys`)
    
    console.log('\n🎉 DATABASE RESET COMPLETE!')
    console.log('🔄 Refreshing page in 2 seconds...')
    
    setTimeout(() => location.reload(), 2000)
    
  } catch (error) {
    console.error('❌ Reset failed:', error)
  }
})()
