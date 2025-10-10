import * as XLSX from 'xlsx';
import { exerciseService } from '../lib/services/exercise-library-service.js';
import { supabase } from '../lib/supabase';
class ExerciseLibraryMigrator {
    normalizeMuscleGroup(muscleGroup) {
        const group = muscleGroup?.trim();
        // Just capitalize properly - preserve the original muscle groups from the Excel file
        if (!group)
            return 'Unknown';
        // Handle specific capitalizations
        const specialCases = {
            'olympic lifts': 'Olympic Lifts',
        };
        const lowerGroup = group.toLowerCase();
        if (specialCases[lowerGroup]) {
            return specialCases[lowerGroup];
        }
        // Default capitalization
        return group.charAt(0).toUpperCase() + group.slice(1).toLowerCase();
    }
    normalizeEquipmentType(equipment) {
        const equip = equipment?.trim();
        // Map the actual equipment types from Excel to standardized names
        const equipmentMap = {
            'barbell': 'Barbell',
            'dumbbell': 'Dumbbell',
            'machine': 'Machine',
            'cable': 'Cable',
            'bodyweight only': 'Bodyweight',
            'bodyweight loadable': 'Bodyweight Loadable',
            'smith machine': 'Smith Machine',
            'machine assistance': 'Machine Assistance'
        };
        const lowerEquip = equip.toLowerCase();
        if (equipmentMap[lowerEquip]) {
            return equipmentMap[lowerEquip];
        }
        // Default capitalization for unknown equipment types
        return this.capitalizeFirstLetter(equip);
    }
    normalizeExerciseName(name) {
        return name?.trim().replace(/\s+/g, ' ') || '';
    }
    capitalizeFirstLetter(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }
    validateExercise(exercise) {
        const errors = [];
        if (!exercise.name || exercise.name.length < 2) {
            errors.push('Exercise name must be at least 2 characters');
        }
        if (!exercise.muscleGroup || exercise.muscleGroup.length < 2) {
            errors.push('Muscle group must be at least 2 characters');
        }
        if (!exercise.equipmentType || exercise.equipmentType.length < 2) {
            errors.push('Equipment type must be at least 2 characters');
        }
        // Check for common invalid entries
        const invalidPatterns = [
            /^test/i,
            /^example/i,
            /^n\/a/i,
            /^none/i,
            /^\s*$/
        ];
        if (invalidPatterns.some(pattern => pattern.test(exercise.name))) {
            errors.push('Exercise name appears to be invalid');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    async readExcelFile(filePath) {
        try {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet);
            console.log(`Read ${data.length} rows from Excel file`);
            return data;
        }
        catch (error) {
            console.error('Error reading Excel file:', error);
            throw new Error(`Failed to read Excel file: ${error}`);
        }
    }
    async processExcelData(rawData) {
        const validExercises = [];
        const invalidExercises = [];
        const seenNames = new Set();
        const duplicates = [];
        console.log(`Processing ${rawData.length} exercises...`);
        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            const exercise = {
                name: this.normalizeExerciseName(row['Name']),
                muscleGroup: this.normalizeMuscleGroup(row['Body Part']),
                equipmentType: this.normalizeEquipmentType(row['Equipment Type'])
            };
            // Check for duplicates
            if (seenNames.has(exercise.name.toLowerCase())) {
                duplicates.push(exercise.name);
                continue;
            }
            seenNames.add(exercise.name.toLowerCase());
            // Validate exercise
            const validation = this.validateExercise(exercise);
            if (!validation.isValid) {
                invalidExercises.push({
                    exercise,
                    errors: validation.errors
                });
                console.warn(`Invalid exercise at row ${i + 1}: ${exercise.name}`, validation.errors);
                continue;
            }
            validExercises.push(exercise);
        }
        console.log(`Processed ${validExercises.length} valid exercises`);
        console.log(`Found ${invalidExercises.length} invalid exercises`);
        console.log(`Found ${duplicates.length} duplicates`);
        return {
            validExercises,
            invalidExercises,
            duplicates
        };
    }
    async migrateToDatabase(exercises) {
        if (!supabase) {
            throw new Error('Supabase client not initialized. Please check environment variables.');
        }
        let success = 0;
        let failed = 0;
        const errors = [];
        console.log(`Starting migration of ${exercises.length} exercises to database...`);
        for (let i = 0; i < exercises.length; i++) {
            const exercise = exercises[i];
            try {
                // Check if exercise already exists
                const existing = await exerciseService.getExerciseByName(exercise.name);
                if (existing) {
                    console.log(`Exercise already exists: ${exercise.name}`);
                    success++;
                    continue;
                }
                // Insert new exercise
                await exerciseService.addExercise({
                    name: exercise.name,
                    muscleGroup: exercise.muscleGroup,
                    equipmentType: exercise.equipmentType
                });
                success++;
                // Progress indicator
                if ((i + 1) % 10 === 0 || i === exercises.length - 1) {
                    console.log(`Progress: ${i + 1}/${exercises.length} (${Math.round((i + 1) / exercises.length * 100)}%)`);
                }
            }
            catch (error) {
                failed++;
                const errorMsg = `Failed to migrate exercise "${exercise.name}": ${error}`;
                console.error(errorMsg);
                errors.push(errorMsg);
            }
        }
        console.log(`Migration complete: ${success} succeeded, ${failed} failed`);
        return { success, failed, errors };
    }
    async runMigration(filePath) {
        try {
            console.log('Starting exercise library migration...');
            console.log(`Reading from: ${filePath}`);
            // Step 1: Read Excel file
            const rawData = await this.readExcelFile(filePath);
            // Step 2: Process and validate data
            const { validExercises, invalidExercises, duplicates } = await this.processExcelData(rawData);
            // Step 3: Show summary
            console.log('\n=== Migration Summary ===');
            console.log(`Total rows read: ${rawData.length}`);
            console.log(`Valid exercises: ${validExercises.length}`);
            console.log(`Invalid exercises: ${invalidExercises.length}`);
            console.log(`Duplicates found: ${duplicates.length}`);
            if (invalidExercises.length > 0) {
                console.log('\n=== Invalid Exercises ===');
                invalidExercises.forEach(({ exercise, errors }) => {
                    console.log(`- ${exercise.name}: ${errors.join(', ')}`);
                });
            }
            if (duplicates.length > 0) {
                console.log('\n=== Duplicates ===');
                duplicates.forEach(name => console.log(`- ${name}`));
            }
            // Step 4: Migrate valid exercises to database
            if (validExercises.length > 0) {
                console.log('\n=== Starting Database Migration ===');
                const { success, failed, errors } = await this.migrateToDatabase(validExercises);
                if (errors.length > 0) {
                    console.log('\n=== Migration Errors ===');
                    errors.forEach(error => console.log(`- ${error}`));
                }
                console.log('\n=== Final Results ===');
                console.log(`Successfully migrated: ${success}`);
                console.log(`Failed to migrate: ${failed}`);
            }
            console.log('\nMigration completed!');
        }
        catch (error) {
            console.error('Migration failed:', error);
            throw error;
        }
    }
}
// Run migration if this file is executed directly
if (require.main === module) {
    const migrator = new ExerciseLibraryMigrator();
    const excelFile = './exercise_library_full.xlsx'; // Default path
    migrator.runMigration(excelFile)
        .then(() => {
        console.log('Migration completed successfully!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
}
export { ExerciseLibraryMigrator };
