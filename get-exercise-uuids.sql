-- Get all exercises with their UUIDs and equipment type
SELECT 
  id,
  name,
  muscle_group,
  equipment_type
FROM exercise_library
ORDER BY muscle_group, name;
