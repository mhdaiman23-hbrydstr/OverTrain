import { NextRequest, NextResponse } from "next/server"
import { templateSchema, requireAdmin, insertTemplateStructure } from "../helpers"

interface RouteParams {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { supabase } = auth
    const templateId = params.id

    const { data, error } = await supabase
      .from("program_templates")
      .select(
        `
        id,
        name,
        description,
        days_per_week,
        total_weeks,
        deload_week,
        gender,
        experience_level,
        progression_type,
        is_active,
        is_public,
        created_at,
        updated_at,
        days:program_template_days(
          id,
          day_number,
          day_name,
          exercises:program_template_exercises(
            id,
            template_day_id,
            exercise_id,
            exercise_order,
            rest_time_seconds,
            category,
            progression_config,
            exercise:exercise_library(id, name, muscle_group, equipment_type)
          )
        )
      `,
      )
      .eq("id", templateId)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Template not found" }, { status: 404 })
      }
      throw error
    }

    if (data?.days) {
      data.days.sort((a: any, b: any) => a.day_number - b.day_number)
      data.days.forEach((day: any) => {
        if (day.exercises) {
          day.exercises.sort((a: any, b: any) => a.exercise_order - b.exercise_order)
        }
      })
    }

    const transformed = {
      id: data.id,
      name: data.name,
      description: data.description,
      daysPerWeek: data.days_per_week,
      totalWeeks: data.total_weeks,
      deloadWeek: data.deload_week,
      gender: data.gender,
      experienceLevel: data.experience_level,
      progressionType: data.progression_type,
      isActive: data.is_active,
      isPublic: data.is_public,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      days: (data.days ?? []).map((day: any) => ({
        id: day.id,
        dayNumber: day.day_number,
        dayName: day.day_name,
        exercises: (day.exercises ?? []).map((exercise: any) => ({
          id: exercise.id,
          templateDayId: exercise.template_day_id,
          exerciseId: exercise.exercise_id,
          exerciseName: exercise.exercise?.name ?? "",
          muscleGroup: exercise.exercise?.muscle_group ?? null,
          equipmentType: exercise.exercise?.equipment_type ?? null,
          order: exercise.exercise_order,
          category: exercise.category,
          restTimeSeconds: exercise.rest_time_seconds,
          progressionConfig: exercise.progression_config,
        })),
      })),
    }

    return NextResponse.json({ template: transformed })
  } catch (error) {
    console.error("[AdminTemplates] GET /[id] error", error)
    return NextResponse.json({ error: "Failed to load template" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await request.json()
    const parsed = templateSchema.parse(payload)
    const { supabase } = auth
    const templateId = params.id

    const { data: existingDays, error: existingDaysError } = await supabase
      .from("program_template_days")
      .select("id")
      .eq("program_template_id", templateId)

    if (existingDaysError) {
      throw existingDaysError
    }

    const existingDayIds = (existingDays ?? []).map((day) => day.id)

    if (existingDayIds.length > 0) {
      const { error: deleteExercisesError } = await supabase
        .from("program_template_exercises")
        .delete()
        .in("template_day_id", existingDayIds)

      if (deleteExercisesError) {
        throw deleteExercisesError
      }
    }

    const { error: deleteDaysError } = await supabase
      .from("program_template_days")
      .delete()
      .eq("program_template_id", templateId)

    if (deleteDaysError) {
      throw deleteDaysError
    }

    const { error: updateError } = await supabase
      .from("program_templates")
      .update({
        name: parsed.name,
        description: parsed.description ?? null,
        days_per_week: parsed.daysPerWeek,
        total_weeks: parsed.totalWeeks,
        deload_week: parsed.deloadWeek,
        gender: parsed.gender,
        experience_level: parsed.experienceLevel,
        progression_type: parsed.progressionType,
        is_active: parsed.isActive,
      })
      .eq("id", templateId)

    if (updateError) {
      throw updateError
    }

    await insertTemplateStructure(supabase, templateId, parsed.days)

    return NextResponse.json({ id: templateId })
  } catch (error) {
    console.error("[AdminTemplates] PUT /[id] error", error)
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 })
  }
}
