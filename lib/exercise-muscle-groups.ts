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

  const isShoulderPress = name.includes("shoulder") || name.includes("overhead") || name.includes("military")
  const isPress = name.includes("press")

  // Chest exercises
  if (
    name.includes("bench press") ||
    name.includes("bench") ||
    (name.includes("incline") && isPress) ||
    (name.includes("decline") && isPress) ||
    (name.includes("dumbbell") && isPress && !isShoulderPress) ||
    (isPress && !isShoulderPress && !name.includes("row")) ||
    name.includes("chest") ||
    name.includes("pec") ||
    name.includes("fly") ||
    name.includes("flye") ||
    name.includes("push-up") ||
    name.includes("push up") ||
    name.includes("pushup") ||
    name.includes("cable crossover") ||
    name.includes("crossover")
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

export interface MuscleGroupStyle {
  id: string
  label: string
  accentClass: string
  textClass: string
  badgeClass: string
  includeInFilter?: boolean
}

const BASE_STYLES: MuscleGroupStyle[] = [
  {
    id: "ABS",
    label: "Abs",
    accentClass: "bg-violet-500",
    textClass: "text-violet-600",
    badgeClass: "bg-violet-100 text-violet-800 border-violet-200",
    includeInFilter: true,
  },
  {
    id: "BACK",
    label: "Back",
    accentClass: "bg-cyan-500",
    textClass: "text-cyan-600",
    badgeClass: "bg-cyan-100 text-cyan-800 border-cyan-200",
    includeInFilter: true,
  },
  {
    id: "BICEPS",
    label: "Biceps",
    accentClass: "bg-cyan-500",
    textClass: "text-cyan-600",
    badgeClass: "bg-cyan-100 text-cyan-800 border-cyan-200",
    includeInFilter: true,
  },
  {
    id: "CALVES",
    label: "Calves",
    accentClass: "bg-violet-500",
    textClass: "text-violet-600",
    badgeClass: "bg-violet-100 text-violet-800 border-violet-200",
    includeInFilter: true,
  },
  {
    id: "CHEST",
    label: "Chest",
    accentClass: "bg-pink-500",
    textClass: "text-pink-600",
    badgeClass: "bg-pink-100 text-pink-800 border-pink-200",
    includeInFilter: true,
  },
  {
    id: "FOREARMS",
    label: "Forearms",
    accentClass: "bg-violet-500",
    textClass: "text-violet-600",
    badgeClass: "bg-violet-100 text-violet-800 border-violet-200",
    includeInFilter: true,
  },
  {
    id: "GLUTES",
    label: "Glutes",
    accentClass: "bg-teal-500",
    textClass: "text-teal-600",
    badgeClass: "bg-teal-100 text-teal-800 border-teal-200",
    includeInFilter: true,
  },
  {
    id: "HAMSTRINGS",
    label: "Hamstrings",
    accentClass: "bg-cyan-500",
    textClass: "text-cyan-600",
    badgeClass: "bg-cyan-100 text-cyan-800 border-cyan-200",
    includeInFilter: true,
  },
  {
    id: "OLYMPIC_LIFTS",
    label: "Olympic Lifts",
    accentClass: "bg-orange-500",
    textClass: "text-orange-600",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
    includeInFilter: true,
  },
  {
    id: "QUADS",
    label: "Quads",
    accentClass: "bg-cyan-500",
    textClass: "text-cyan-600",
    badgeClass: "bg-cyan-100 text-cyan-800 border-cyan-200",
    includeInFilter: true,
  },
  {
    id: "SHOULDERS",
    label: "Shoulders",
    accentClass: "bg-pink-500",
    textClass: "text-pink-600",
    badgeClass: "bg-pink-100 text-pink-800 border-pink-200",
    includeInFilter: true,
  },
  {
    id: "TRAPS",
    label: "Traps",
    accentClass: "bg-violet-500",
    textClass: "text-violet-600",
    badgeClass: "bg-violet-100 text-violet-800 border-violet-200",
    includeInFilter: true,
  },
  {
    id: "TRICEPS",
    label: "Triceps",
    accentClass: "bg-pink-500",
    textClass: "text-pink-600",
    badgeClass: "bg-pink-100 text-pink-800 border-pink-200",
    includeInFilter: true,
  },
  {
    id: "LEGS",
    label: "Legs",
    accentClass: "bg-green-500",
    textClass: "text-green-600",
    badgeClass: "bg-green-100 text-green-800 border-green-200",
  },
  {
    id: "CORE",
    label: "Core",
    accentClass: "bg-orange-500",
    textClass: "text-orange-600",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
  },
  {
    id: "CARDIO",
    label: "Cardio",
    accentClass: "bg-red-500",
    textClass: "text-red-600",
    badgeClass: "bg-red-100 text-red-800 border-red-200",
  },
]

const DEFAULT_STYLE: MuscleGroupStyle = {
  id: "OTHER",
  label: "Other",
  accentClass: "bg-gray-400",
  textClass: "text-gray-600",
  badgeClass: "bg-gray-100 text-gray-800 border-gray-200",
}

const STYLE_MAP = BASE_STYLES.reduce<Record<string, MuscleGroupStyle>>((acc, style) => {
  acc[style.id] = style
  acc[style.label.toUpperCase()] = style
  return acc
}, { OTHER: DEFAULT_STYLE })

const normalizeMuscleGroup = (value?: string | null) => {
  if (!value) {
    return "OTHER"
  }
  return value.trim().toUpperCase().replace(/\s+/g, "_")
}

export function getMuscleGroupStyle(value?: string | null): MuscleGroupStyle {
  const key = normalizeMuscleGroup(value)
  return STYLE_MAP[key] || DEFAULT_STYLE
}

export function getMuscleGroupAccentClass(value?: string | null) {
  return getMuscleGroupStyle(value).accentClass
}

export function getMuscleGroupTextClass(value?: string | null) {
  return getMuscleGroupStyle(value).textClass
}

export function getMuscleGroupBadgeClass(value?: string | null) {
  return getMuscleGroupStyle(value).badgeClass
}

export function getMuscleGroupLabel(value?: string | null) {
  return getMuscleGroupStyle(value).label
}
