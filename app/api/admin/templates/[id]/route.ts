import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'
import { requireAdmin } from '../../auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/templates/[id] — Get full template detail (admin only)
 *
 * Returns { template: ProgramTemplateDetail } with days and exercises.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const supabase = getServerSupabase()

  // Fetch template with nested days/exercises
  const { data, error } = await supabase
    .from('program_templates')
    .select(`
      *,
      days:program_template_days(
        *,
        exercises:program_template_exercises(
          *,
          exercise:exercise_library(id, name, muscle_group, equipment_type)
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Sort and map to expected shape
  const days = (data.days || [])
    .sort((a: any, b: any) => a.day_number - b.day_number)
    .map((day: any) => ({
      id: day.id,
      dayNumber: day.day_number,
      dayName: day.day_name,
      exercises: (day.exercises || [])
        .sort((a: any, b: any) => a.exercise_order - b.exercise_order)
        .map((ex: any) => ({
          id: ex.id,
          templateDayId: ex.template_day_id,
          exerciseId: ex.exercise_id,
          exerciseName: ex.exercise?.name ?? 'Unknown',
          muscleGroup: ex.exercise?.muscle_group ?? null,
          equipmentType: ex.exercise?.equipment_type ?? null,
          order: ex.exercise_order,
          category: ex.category,
          restTimeSeconds: ex.rest_time_seconds,
          progressionConfig: ex.progression_config || {},
        })),
    }))

  const template = {
    id: data.id,
    name: data.name,
    description: data.description,
    daysPerWeek: data.days_per_week,
    totalWeeks: data.total_weeks,
    deloadWeek: data.deload_week,
    gender: data.gender || [],
    experienceLevel: data.experience_level || [],
    isActive: data.is_active,
    isPublic: data.is_public,
    progressionType: data.progression_type || 'linear',
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    days,
  }

  return NextResponse.json({ template })
}

/**
 * PUT /api/admin/templates/[id] — Update a template (admin only)
 *
 * Replaces the template metadata and all days/exercises.
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await req.json()
  const supabase = getServerSupabase()

  // 1. Update template metadata
  const { error: updateError } = await supabase
    .from('program_templates')
    .update({
      name: body.name,
      description: body.description || null,
      days_per_week: body.daysPerWeek,
      total_weeks: body.totalWeeks,
      deload_week: body.deloadWeek || body.totalWeeks,
      gender: body.gender || [],
      experience_level: body.experienceLevel || [],
      progression_type: body.progressionType || 'linear',
      is_active: body.isActive ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // 2. Delete existing days (cascades to exercises via FK)
  const { error: deleteDaysError } = await supabase
    .from('program_template_days')
    .delete()
    .eq('program_template_id', id)

  if (deleteDaysError) {
    return NextResponse.json({ error: `Failed to clear days: ${deleteDaysError.message}` }, { status: 500 })
  }

  // 3. Re-insert days and exercises
  for (const day of (body.days || [])) {
    const { data: dayRow, error: dayError } = await supabase
      .from('program_template_days')
      .insert({
        program_template_id: id,
        day_number: day.dayNumber,
        day_name: day.dayName,
      })
      .select('id')
      .single()

    if (dayError) {
      return NextResponse.json({ error: `Failed to create day: ${dayError.message}` }, { status: 500 })
    }

    for (const exercise of (day.exercises || [])) {
      const { error: exError } = await supabase
        .from('program_template_exercises')
        .insert({
          template_day_id: dayRow.id,
          exercise_id: exercise.exerciseId,
          exercise_order: exercise.order,
          category: exercise.category || 'compound',
          rest_time_seconds: exercise.restTimeSeconds || 90,
          progression_config: exercise.progressionConfig || {},
        })

      if (exError) {
        return NextResponse.json({ error: `Failed to create exercise: ${exError.message}` }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ id })
}

/**
 * DELETE /api/admin/templates/[id] — Delete a template (admin only)
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const supabase = getServerSupabase()

  const { error } = await supabase
    .from('program_templates')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
