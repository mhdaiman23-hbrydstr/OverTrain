import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔧 Exercise Library Schema Deployment')
console.log('=====================================')
console.log('')

// Read and display the schema
try {
  const schemaSQL = readFileSync('./exercise-library-schema.sql', 'utf8')
  
  console.log('📋 SQL Schema to execute manually:')
  console.log('=' .repeat(80))
  console.log(schemaSQL)
  console.log('=' .repeat(80))
  console.log('')
  
  console.log('🔗 Manual Deployment Steps:')
  console.log('1. Go to your Supabase project dashboard: https://app.supabase.com')
  console.log(`2. Navigate to your project: ${supabaseUrl}`)
  console.log('3. Go to SQL Editor in the sidebar')
  console.log('4. Copy and paste the SQL schema above')
  console.log('5. Click "Run" to execute the schema')
  console.log('6. Verify the exercise_library table is created')
  console.log('')
  
  // Test if we can connect with the current credentials
  if (supabaseUrl && supabaseAnonKey) {
    console.log('🧪 Testing connection with current credentials...')
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Try to access the exercise_library table (will fail if not created yet)
    supabase
      .from('exercise_library')
      .select('count')
      .limit(1)
      .then(({ data, error }) => {
        if (error) {
          console.log('⚠️  Table not accessible yet (expected before schema deployment)')
          console.log('   Error:', error.message)
        } else {
          console.log('✅ Table accessible - schema may already be deployed!')
        }
      })
      .catch(err => {
        console.log('❌ Connection test failed:', err.message)
      })
  }
  
  console.log('')
  console.log('📝 After deploying the schema, run the migration script:')
  console.log('   npx ts-node scripts/migrate-exercise-library.ts')
  
} catch (error) {
  console.error('❌ Error reading schema file:', error.message)
}
