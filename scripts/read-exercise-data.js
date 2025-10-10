import XLSX from 'xlsx';

try {
  console.log('Reading exercise data from Excel file...');
  
  // Read the Excel file
  const workbook = XLSX.readFile('./exercise_library_full.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`Read ${data.length} rows from Excel file`);
  
  // Extract unique muscle groups and equipment types
  const muscleGroups = new Set();
  const equipmentTypes = new Set();
  
  data.forEach(row => {
    if (row['Body Part']) {
      muscleGroups.add(row['Body Part'].trim());
    }
    if (row['Equipment Type']) {
      equipmentTypes.add(row['Equipment Type'].trim());
    }
  });
  
  // Convert to sorted arrays
  const sortedMuscleGroups = Array.from(muscleGroups).sort();
  const sortedEquipmentTypes = Array.from(equipmentTypes).sort();
  
  console.log('\n=== Muscle Groups Found ===');
  console.log(`Total: ${sortedMuscleGroups.length}`);
  sortedMuscleGroups.forEach((group, index) => {
    console.log(`${index + 1}. "${group}"`);
  });
  
  console.log('\n=== Equipment Types Found ===');
  console.log(`Total: ${sortedEquipmentTypes.length}`);
  sortedEquipmentTypes.forEach((type, index) => {
    console.log(`${index + 1}. "${type}"`);
  });
  
  // Generate the arrays for the filter component
  console.log('\n=== For Filter Component - Muscle Groups ===');
  console.log('const MUSCLE_GROUPS = [');
  sortedMuscleGroups.forEach(group => {
    console.log(`  "${group}",`);
  });
  console.log('];');
  
  console.log('\n=== For Filter Component - Equipment Types ===');
  console.log('const EQUIPMENT_TYPES = [');
  sortedEquipmentTypes.forEach(type => {
    console.log(`  "${type}",`);
  });
  console.log('];');
  
} catch (error) {
  console.error('Error reading Excel file:', error);
  process.exit(1);
}
