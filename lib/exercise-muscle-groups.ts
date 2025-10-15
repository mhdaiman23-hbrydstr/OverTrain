export function getExerciseMuscleGroup(exerciseName?: string): string {
  const raw = typeof exerciseName === 'string' ? exerciseName : ''
  const name = raw.trim().toLowerCase()
  if (!name) {
    return "OTHER"
  }

  // Leg exercises
  if (name.includes("squat") || name.includes("leg extension") || name.includes("leg curl") || name.includes("calf")) {
    return "LEGS"
  }

  // Chest exercises
  if (
    name.includes("bench press") ||
    (name.includes("incline") && name.includes("press")) ||
    name.includes("chest") ||
    name.includes("fly")
  ) {
    return "CHEST"
  }

  // Back exercises
  if (
    name.includes("deadlift") ||
    name.includes("row") ||
    name.includes("pull-up") ||
    name.includes("chin-up") ||
    name.includes("pulldown")
  ) {
    return "BACK"
  }

  // Shoulder exercises
  if (
    name.includes("overhead press") ||
    name.includes("shoulder press") ||
    name.includes("lateral raise") ||
    name.includes("front raise") ||
    name.includes("face pull")
  ) {
    return "SHOULDERS"
  }

  // Tricep exercises
  if (name.includes("tricep") || (name.includes("dip") && !name.includes("deadlift"))) {
    return "TRICEPS"
  }

  // Bicep exercises
  if (name.includes("curl") || name.includes("bicep")) {
    return "BICEPS"
  }

  // Default fallback
  return "OTHER"
}
