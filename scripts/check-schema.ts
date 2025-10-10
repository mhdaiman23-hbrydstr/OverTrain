/**
 * Check if Schema is Deployed
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  console.log('🔍 Checking if schema is deployed...\n')

  // Check if tables exist
  const tables = ['program_templates', 'program_template_days', 'program_template_exercises']
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1)
      
      if (error) {
        if (error.code === '42P01') {
          console.log(`❌ Table "${table}" does not exist`)
        } else {
          console.log(`⚠️  Table "${table}" exists but error: ${error.message}`)
        }
      } else {
        console.log(`✅ Table "${table}" exists (${data?.length || 0} rows)`)
      }
    } catch (err) {
      console.log(`❌ Error checking "${table}":`, err)
    }
  }

  console.log('\n📋 Next steps:')
  console.log('If tables don\'t exist:')
  console.log('  1. Go to https://supabase.com/dashboard')
  console.log('  2. Select your project')
  console.log('  3. Go to SQL Editor → New Query')
  console.log('  4. Paste contents of program-templates-schema.sql')
  console.log('  5. Click Run')
}

checkSchema().catch(console.error)
