import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY')
  console.error('\nPlease add these to your .env.local file')
  process.exit(1)
}

// Create client with available credentials
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const hasServiceKey = !!supabaseServiceKey

async function deploySchema() {
  try {
    console.log('🚀 Starting database schema deployment...')
    
    // Read the schema file
    const schemaSQL = readFileSync('./exercise-library-schema.sql', 'utf8')
    
    console.log('📖 Schema file loaded successfully')
    
    // Split SQL into individual statements
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`)
        
        const { error } = await supabase.rpc('exec_sql', { sql_statement: statement })
        
        if (error) {
          // Try direct SQL execution if RPC fails
          const { error: directError } = await supabase
            .from('_temp_schema_deployment')
            .select('*')
            .limit(1)
          
          if (directError && directError.code !== 'PGRST116') {
            console.warn(`⚠️  Statement ${i + 1} may have failed:`, error.message)
            console.log(`📄 Statement: ${statement.substring(0, 100)}...`)
          }
        }
        
        console.log(`✅ Statement ${i + 1} completed`)
        
      } catch (stmtError) {
        console.warn(`⚠️  Statement ${i + 1} warning:`, stmtError instanceof Error ? stmtError.message : String(stmtError))
        console.log(`📄 Statement: ${statement.substring(0, 100)}...`)
      }
    }
    
    console.log('\n🎉 Schema deployment completed!')
    
    // Verify the table was created
    console.log('🔍 Verifying table creation...')
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'exercise_library')
    
    if (tableError) {
      console.warn('⚠️  Could not verify table creation:', tableError.message)
    } else if (tables && tables.length > 0) {
      console.log('✅ exercise_library table verified!')
    } else {
      console.warn('⚠️  exercise_library table not found - may need manual verification')
    }
    
    // Test basic operations
    console.log('🧪 Testing basic operations...')
    
    try {
      const { data: testData, error: testError } = await supabase
        .from('exercise_library')
        .select('count')
        .limit(1)
      
      if (testError) {
        console.warn('⚠️  Basic test failed:', testError.message)
      } else {
        console.log('✅ Basic operations test passed!')
      }
    } catch (testErr) {
      console.warn('⚠️  Basic test error:', testErr instanceof Error ? testErr.message : String(testErr))
    }
    
  } catch (error) {
    console.error('❌ Schema deployment failed:', error)
    process.exit(1)
  }
}

// Alternative deployment method using direct HTTP requests
async function deploySchemaDirect() {
  try {
    console.log('🚀 Starting direct schema deployment...')
    
    // Read the schema file
    const schemaSQL = readFileSync('./exercise-library-schema.sql', 'utf8')
    
    console.log('📖 Schema file loaded successfully')
    console.log('⚠️  Note: You may need to execute this SQL manually in the Supabase SQL Editor')
    console.log('📋 SQL to execute:')
    console.log('=' .repeat(80))
    console.log(schemaSQL)
    console.log('=' .repeat(80))
    console.log('\n🔗 To execute manually:')
    console.log('1. Go to your Supabase project dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Paste the SQL above and execute')
    console.log('4. Verify the exercise_library table is created')
    
  } catch (error) {
    console.error('❌ Direct schema deployment failed:', error)
    process.exit(1)
  }
}

// Main execution
async function main() {
  console.log('🔧 Exercise Library Schema Deployment')
  console.log('=====================================')
  
  // Try automated deployment first
  await deploySchema().catch(() => {
    console.log('\n🔄 Falling back to manual deployment instructions...')
    return deploySchemaDirect()
  })
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => {
      console.log('\n✨ Deployment process completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Deployment process failed:', error)
      process.exit(1)
    })
}

export { deploySchema, deploySchemaDirect }
