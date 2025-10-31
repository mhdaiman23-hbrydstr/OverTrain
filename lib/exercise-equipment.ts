export interface EquipmentStyle {
  id: string
  label: string
  badgeClass: string
  dotClass: string
}

const EQUIPMENT_STYLES: EquipmentStyle[] = [
  {
    id: "Barbell",
    label: "Barbell",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
    dotClass: "bg-slate-500",
  },
  {
    id: "Dumbbell",
    label: "Dumbbell",
    badgeClass: "bg-sky-100 text-sky-700 border-sky-200",
    dotClass: "bg-sky-500",
  },
  {
    id: "Cable",
    label: "Cable",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
    dotClass: "bg-amber-500",
  },
  {
    id: "Machine",
    label: "Machine",
    badgeClass: "bg-violet-100 text-violet-700 border-violet-200",
    dotClass: "bg-violet-500",
  },
  {
    id: "Machine Assistance",
    label: "Machine Assistance",
    badgeClass: "bg-purple-100 text-purple-700 border-purple-200",
    dotClass: "bg-purple-500",
  },
  {
    id: "Smith Machine",
    label: "Smith Machine",
    badgeClass: "bg-zinc-100 text-zinc-700 border-zinc-200",
    dotClass: "bg-zinc-500",
  },
  {
    id: "Bodyweight Only",
    label: "Bodyweight Only",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  {
    id: "Bodyweight Loadable",
    label: "Bodyweight Loadable",
    badgeClass: "bg-green-100 text-green-700 border-green-200",
    dotClass: "bg-green-500",
  },
  {
    id: "Kettlebell",
    label: "Kettlebell",
    badgeClass: "bg-orange-100 text-orange-700 border-orange-200",
    dotClass: "bg-orange-500",
  },
  {
    id: "Bands",
    label: "Bands",
    badgeClass: "bg-pink-100 text-pink-700 border-pink-200",
    dotClass: "bg-pink-500",
  },
]

const DEFAULT_STYLE: EquipmentStyle = {
  id: "Unknown",
  label: "Unknown",
  badgeClass: "bg-muted text-muted-foreground border-border/50",
  dotClass: "bg-border",
}

const STYLE_MAP = EQUIPMENT_STYLES.reduce<Record<string, EquipmentStyle>>((acc, style) => {
  acc[style.id.toUpperCase()] = style
  return acc
}, { UNKNOWN: DEFAULT_STYLE })

const normalizeEquipment = (value?: string | null) => (value ?? "").trim().toUpperCase()

export function getEquipmentStyle(value?: string | null): EquipmentStyle {
  const key = normalizeEquipment(value)
  return STYLE_MAP[key] ?? DEFAULT_STYLE
}

export function getEquipmentBadgeClass(value?: string | null) {
  return getEquipmentStyle(value).badgeClass
}

export function getEquipmentDotClass(value?: string | null) {
  return getEquipmentStyle(value).dotClass
}

export function getEquipmentLabel(value?: string | null) {
  return getEquipmentStyle(value).label
}
