const fs = require('fs');
const path = require('path');

// Read the generated TypeScript file
const content = fs.readFileSync(path.join(__dirname, '..', 'lib', 'exercise-data.ts'), 'utf-8');

// Extract the exercises array using regex
const match = content.match(/export const EXERCISES: Exercise\[\] = (\[[\s\S]*\])/);
if (match) {
  const exercises = JSON.parse(match[1]);

  console.log('✅ Exercise data verification:');
  console.log(`\n📊 Total exercises: ${exercises.length}`);

  // Sample exercises by muscle group
  console.log('\n🏋️ Sample exercises by muscle group:');
  const samples = {};
  exercises.forEach(ex => {
    if (!samples[ex.muscleGroup]) {
      samples[ex.muscleGroup] = ex;
    }
  });

  Object.entries(samples)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([group, ex]) => {
      console.log(`  ${group}: ${ex.name} (${ex.category})`);
    });

  // Verify all muscle groups are present
  const expectedGroups = [
    'Abs', 'Back', 'Biceps', 'Calves', 'Chest', 'Forearms',
    'Glutes', 'Hamstrings', 'Olympic Lifts', 'Quads', 'Shoulders', 'Traps', 'Triceps'
  ];

  const actualGroups = [...new Set(exercises.map(e => e.muscleGroup))].sort();

  console.log('\n✅ All muscle groups present:');
  expectedGroups.forEach(group => {
    const present = actualGroups.includes(group);
    console.log(`  ${present ? '✓' : '✗'} ${group}`);
  });

  console.log('\n✅ Verification complete!');
} else {
  console.error('❌ Failed to parse exercise data');
}
