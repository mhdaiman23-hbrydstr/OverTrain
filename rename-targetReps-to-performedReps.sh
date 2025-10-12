#!/bin/bash
# Rename targetReps to performedReps across the codebase

echo "Renaming targetReps to performedReps in all files..."

# List of files to update
files=(
  "components/workout-logger/hooks/use-workout-session.ts"
  "components/workout-logger/types.ts"
  "lib/gym-templates.ts"
  "lib/program-state.ts"
  "lib/progression-calculator.ts"
  "lib/progression-engines/linear-engine.ts"
  "lib/progression-engines/percentage-engine.ts"
  "lib/progression-router.ts"
  "lib/template-storage.ts"
  "lib/workout-logger-database-first.ts"
  "lib/workout-logger.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"
    sed -i 's/targetReps/performedReps/g' "$file"
  else
    echo "Skipping (not found): $file"
  fi
done

echo "Done! All occurrences of targetReps have been renamed to performedReps"
