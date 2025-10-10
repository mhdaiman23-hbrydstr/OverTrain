import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface RawExerciseData {
  'Name': string
  'Body Part': string
  'Equipment Type': string
}

interface MigratedExercise {
  name: string
  muscle_group: string
  equipment_type: string
}

class SimpleExerciseMigrator {
  private normalizeMuscleGroup(muscleGroup: string): string {
    const group = muscleGroup?.trim()
    
    if (!group) return 'Unknown'
    
    // Handle specific capitalizations
    const specialCases: { [key: string]: string } = {
      'olympic lifts': 'Olympic Lifts',
    }
    
    const lowerGroup = group.toLowerCase()
    if (specialCases[lowerGroup]) {
      return specialCases[lowerGroup]
    }
    
    // Default capitalization
    return group.charAt(0).toUpperCase() + group.slice(1).toLowerCase()
  }

  private normalizeEquipmentType(equipment: string): string {
    const equip = equipment?.trim()
    
    // Use exact equipment types from Excel - no transformation
    if (!equip) return 'Unknown'
    
    return equip
  }

  private normalizeExerciseName(name: string): string {
    return name?.trim().replace(/\s+/g, ' ') || ''
  }

  private validateExercise(exercise: MigratedExercise): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!exercise.name || exercise.name.length < 2) {
      errors.push('Exercise name must be at least 2 characters')
    }
    
    if (!exercise.muscle_group || exercise.muscle_group.length < 2) {
      errors.push('Muscle group must be at least 2 characters')
    }
    
    if (!exercise.equipment_type || exercise.equipment_type.length < 2) {
      errors.push('Equipment type must be at least 2 characters')
    }
    
    // Check for common invalid entries
    const invalidPatterns = [
      /^test/i,
      /^example/i,
      /^n\/a/i,
      /^none/i,
      /^\s*$/
    ]
    
    if (invalidPatterns.some(pattern => pattern.test(exercise.name))) {
      errors.push('Exercise name appears to be invalid')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  async readExcelFile(filePath: string): Promise<RawExerciseData[]> {
    try {
      const workbook = XLSX.readFile(filePath)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const data = XLSX.utils.sheet_to_json(worksheet) as RawExerciseData[]
      
      console.log(`✅ Read ${data.length} rows from Excel file`)
      return data
    } catch (error) {
      console.error('❌ Error reading Excel file:', error)
      throw new Error(`Failed to read Excel file: ${error}`)
    }
  }

  async processExcelData(rawData: RawExerciseData[]): Promise<{
    validExercises: MigratedExercise[]
    invalidExercises: Array<{ exercise: MigratedExercise; errors: string[] }>
    duplicates: string[]
  }> {
    const validExercises: MigratedExercise[] = []
    const invalidExercises: Array<{ exercise: MigratedExercise; errors: string[] }> = []
    const seenNames = new Set<string>()
    const duplicates: string[] = []

    console.log(`🔄 Processing ${rawData.length} exercises...`)

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i]
      
      const exercise: MigratedExercise = {
        name: this.normalizeExerciseName(row['Name']),
        muscle_group: this.normalizeMuscleGroup(row['Body Part']),
        equipment_type: this.normalizeEquipmentType(row['Equipment Type'])
      }

      // Check for duplicates
      if (seenNames.has(exercise.name.toLowerCase())) {
        duplicates.push(exercise.name)
        continue
      }
      seenNames.add(exercise.name.toLowerCase())

      // Validate exercise
      const validation = this.validateExercise(exercise)
      if (!validation.isValid) {
        invalidExercises.push({
          exercise,
          errors: validation.errors
        })
        console.warn(`⚠️  Invalid exercise at row ${i + 1}: ${exercise.name}`, validation.errors)
        continue
      }

      validExercises.push(exercise)
    }

    console.log(`✅ Processed ${validExercises.length} valid exercises`)
    console.log(`⚠️  Found ${invalidExercises.length} invalid exercises`)
    console.log(`⚠️  Found ${duplicates.length} duplicates`)

    return {
      validExercises,
      invalidExercises,
      duplicates
    }
  }

  async migrateToDatabase(exercises: MigratedExercise[]): Promise<{
    success: number
    failed: number
    errors: string[]
  }> {
    let success = 0
    let failed = 0
    const errors: string[] = []

    console.log(`🚀 Starting migration of ${exercises.length} exercises to database...`)

    for (let i = 0; i < exercises.length; i++) {
      const exercise = exercises[i]
      
      try {
        // Check if exercise already exists
        const { data: existing } = await supabase
          .from('exercise_library')
          .select('id')
          .eq('name', exercise.name)
          .single()
        
        if (existing) {
          console.log(`ℹ️  Exercise already exists: ${exercise.name}`)
          success++
          continue
        }

        // Insert new exercise
        const { error } = await supabase
          .from('exercise_library')
          .insert({
            name: exercise.name,
            muscle_group: exercise.muscle_group,
            equipment_type: exercise.equipment_type
          })

        if (error) {
          throw error
        }

        success++
        
        // Progress indicator
        if ((i + 1) % 10 === 0 || i === exercises.length - 1) {
          console.log(`📊 Progress: ${i + 1}/${exercises.length} (${Math.round((i + 1) / exercises.length * 100)}%)`)
        }
        
      } catch (error) {
        failed++
        const errorMsg = `❌ Failed to migrate exercise "${exercise.name}": ${error}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    }

    console.log(`✅ Migration complete: ${success} succeeded, ${failed} failed`)
    
    return { success, failed, errors }
  }

  async runMigration(filePath: string): Promise<void> {
    try {
      console.log('🏋️  Exercise Library Migration Started')
      console.log('=====================================')
      console.log(`📁 Reading from: ${filePath}`)

      // Step 1: Read Excel file
      const rawData = await this.readExcelFile(filePath)

      // Step 2: Process and validate data
      const { validExercises, invalidExercises, duplicates } = await this.processExcelData(rawData)

      // Step 3: Show summary
      console.log('\n📊 Migration Summary')
      console.log('===================')
      console.log(`📋 Total rows read: ${rawData.length}`)
      console.log(`✅ Valid exercises: ${validExercises.length}`)
      console.log(`❌ Invalid exercises: ${invalidExercises.length}`)
      console.log(`🔄 Duplicates found: ${duplicates.length}`)

      if (invalidExercises.length > 0) {
        console.log('\n❌ Invalid Exercises')
        console.log('===================')
        invalidExercises.forEach(({ exercise, errors }) => {
          console.log(`- ${exercise.name}: ${errors.join(', ')}`)
        })
      }

      if (duplicates.length > 0) {
        console.log('\n🔄 Duplicates')
        console.log('===========')
        duplicates.forEach(name => console.log(`- ${name}`))
      }

      // Step 4: Migrate valid exercises to database
      if (validExercises.length > 0) {
        console.log('\n🚀 Starting Database Migration')
        console.log('===============================')
        const { success, failed, errors } = await this.migrateToDatabase(validExercises)
        
        if (errors.length > 0) {
          console.log('\n❌ Migration Errors')
          console.log('==================')
          errors.forEach(error => console.log(`- ${error}`))
        }
        
        console.log('\n🎉 Final Results')
        console.log('================')
        console.log(`✅ Successfully migrated: ${success}`)
        console.log(`❌ Failed to migrate: ${failed}`)
        
        if (success > 0) {
          console.log('\n🎊 Migration completed successfully!')
          console.log('📝 Next steps:')
          console.log('   1. Test the exercise library service')
          console.log('   2. Update application imports')
          console.log('   3. Run integration tests')
        }
      }

    } catch (error) {
      console.error('💥 Migration failed:', error)
      throw error
    }
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const migrator = new SimpleExerciseMigrator()
  const excelFile = './exercise_library_full.xlsx' // Default path
  
  migrator.runMigration(excelFile)
    .then(() => {
      console.log('\n🎉 Migration completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error)
      process.exit(1)
    })
}

export { SimpleExerciseMigrator }
