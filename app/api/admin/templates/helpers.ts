import type { SupabaseClient } from "@supabase/supabase-js"
import { NextRequest } from "next/server"
import { z } from "zod"
import { getServerSupabase } from "@/lib/server-supabase"

export const progressionMetadataSchema = z
  .object({
    useGlobalProgression: z.boolean().optional(),
    workingSets: z.number().int().min(0).optional(),
    workingRepRange: z.string().optional(),
    deloadSets: z.number().int().min(0).optional(),
    deloadRepRange: z.string().optional(),
    autoProgressionEnabled: z.boolean().optional(),
    progressionMode: z.enum(["weight_based", "rep_based"]).optional(),
    tier: z.enum(["tier1", "tier2"]).optional(),
  })
  .partial()

export const exerciseProgressionSchema = z.object({
  progressionTemplate: z.record(
    z.string(),
    z.object({
      sets: z.number().int().min(1),
      repRange: z.string(),
      intensity: z.string().optional(),
    }),
  ),
  autoProgression: z
    .object({
      enabled: z.boolean(),
      progressionType: z.enum(["weight_based", "rep_based"]).optional(),
      rules: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
  tier: z.string().optional(),
  metadata: progressionMetadataSchema.optional(),
})

export const exerciseSchema = z.object({
  exerciseId: z.string().uuid(),
  exerciseName: z.string(),
  category: z.enum(["compound", "isolation"]),
  restTimeSeconds: z.number().int().min(0),
  order: z.number().int().min(1),
  isPrimary: z.boolean().optional(),
  progressionConfig: exerciseProgressionSchema,
})

export const daySchema = z.object({
  dayNumber: z.number().int().min(1),
  dayName: z.string(),
  exercises: z.array(exerciseSchema).min(1),
})

export const templateSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  gender: z.array(z.enum(["male", "female"])).min(1),
  experienceLevel: z.array(z.enum(["beginner", "intermediate", "advanced"])).min(1),
  daysPerWeek: z.number().int().min(1),
  totalWeeks: z.number().int().min(1),
  deloadWeek: z.number().int().min(1),
  progressionType: z.enum(["linear", "percentage", "hybrid"]),
  isActive: z.boolean().default(true),
  defaultRestSeconds: z.number().int().min(0).optional(),
  days: z.array(daySchema).min(1),
})

export type AdminTemplatePayload = z.infer<typeof templateSchema>
export type AdminTemplateDayPayload = z.infer<typeof daySchema>
export type AdminExercisePayload = z.infer<typeof exerciseSchema>

export async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader) {
    return null
  }

  const token = authHeader.replace("Bearer ", "").trim()
  if (!token) {
    return null
  }

  const supabase = getServerSupabase()
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, is_admin")
    .eq("id", userData.user.id)
    .single()

  if (profileError || !profile?.is_admin) {
    return null
  }

  return { supabase, userId: userData.user.id }
}

export async function insertTemplateStructure(
  supabase: SupabaseClient,
  templateId: string,
  days: AdminTemplateDayPayload[],
): Promise<void> {
  for (const day of days) {
    const { data: dayData, error: dayError } = await supabase
      .from("program_template_days")
      .insert({
        program_template_id: templateId,
        day_number: day.dayNumber,
        day_name: day.dayName,
      })
      .select("id")
      .single()

    if (dayError || !dayData) {
      throw dayError ?? new Error(`Failed to create day ${day.dayNumber}`)
    }

    for (const exercise of day.exercises) {
      const { error: exerciseError } = await supabase.from("program_template_exercises").insert({
        template_day_id: dayData.id,
        exercise_id: exercise.exerciseId,
        exercise_order: exercise.order,
        category: exercise.category,
        rest_time_seconds: exercise.restTimeSeconds,
        progression_config: exercise.progressionConfig,
      })

      if (exerciseError) {
        throw exerciseError
      }
    }
  }
}
