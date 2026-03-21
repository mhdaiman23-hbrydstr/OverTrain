import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'
import { requireAdmin } from '../auth'

/**
 * GET /api/admin/templates — List all program templates (admin only)
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  const supabase = getServerSupabase()

  const { data, error } = await supabase
    .from('program_templates')
    .select('*')
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ templates: data ?? [] })
}

/**
 * POST /api/admin/templates — Create a new program template (admin only)
 *
 * Expected body shape (from admin-template-builder buildPayload):
 * {
 *   name, description, gender, experienceLevel, daysPerWeek, totalWeeks,
 *   deloadWeek, progressionType, isActive,
 *   days: [{ dayNumber, dayName, exercises: [{ exerciseId, exerciseName, category, restTimeSeconds, order, progressionConfig }] }]
 * }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const supabase = getServerSupabase()

  // 1. Insert program_templates row
  const { data: template, error: templateError } = await supabase
    .from('program_templates')
    .insert({
      name: body.name,
      description: body.description || null,
      days_per_week: body.daysPerWeek,
      total_weeks: body.totalWeeks,
      deload_week: body.deloadWeek || body.totalWeeks,
      gender: body.gender || [],
      experience_level: body.experienceLevel || [],
      progression_type: body.progressionType || 'linear',
      is_active: body.isActive ?? true,
      is_public: true, // Canonical templates are always public
    })
    .select('id')
    .single()

  if (templateError) {
    return NextResponse.json({ error: templateError.message }, { status: 500 })
  }

  const templateId = template.id

  // 2. Insert days and exercises
  for (const day of (body.days || [])) {
    const { data: dayRow, error: dayError } = await supabase
      .from('program_template_days')
      .insert({
        program_template_id: templateId,
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

  return NextResponse.json({ id: templateId }, { status: 201 })
}
