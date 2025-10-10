import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSupabase } from '@/lib/server-supabase'

const exerciseProgressionSchema = z.object({
  progressionTemplate: z.record(z.string(), z.object({
    sets: z.number().int().min(1),
    repRange: z.string(),
    intensity: z.string().optional(),
  })),
  autoProgression: z.object({
    enabled: z.boolean(),
    progressionType: z.enum(['weight_based', 'rep_based']).optional(),
    rules: z.record(z.string(), z.string()).optional(),
  }).optional(),
  tier: z.string().optional(),
})

const exerciseSchema = z.object({
  exerciseId: z.string().uuid(),
  exerciseName: z.string(),
  category: z.enum(['compound', 'isolation']),
  restTimeSeconds: z.number().int().min(0),
  order: z.number().int().min(1),
  isPrimary: z.boolean().optional(),
  progressionConfig: exerciseProgressionSchema,
})

const daySchema = z.object({
  dayNumber: z.number().int().min(1),
  dayName: z.string(),
  exercises: z.array(exerciseSchema).min(1),
})

const createTemplateSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  gender: z.array(z.enum(['male', 'female'])).min(1),
  experienceLevel: z.array(z.enum(['beginner', 'intermediate', 'advanced'])).min(1),
  daysPerWeek: z.number().int().min(1),
  totalWeeks: z.number().int().min(1),
  deloadWeek: z.number().int().min(1),
  progressionType: z.enum(['linear', 'percentage', 'hybrid']),
  isActive: z.boolean().default(true),
  defaultRestSeconds: z.number().int().min(0).optional(),
  days: z.array(daySchema).min(1),
})

async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return null
  }

  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) {
    return null
  }

  const supabase = getServerSupabase()
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, is_admin')
    .eq('id', userData.user.id)
    .single()

  if (profileError || !profile?.is_admin) {
    return null
  }

  return { supabase, userId: userData.user.id }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { supabase } = auth
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')?.trim()
    const gender = searchParams.get('gender')
    const experience = searchParams.get('experience')
    const daysPerWeek = searchParams.get('daysPerWeek')

    let query = supabase
      .from('program_templates')
      .select('*')
      .order('name')

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    if (gender) {
      query = query.contains('gender', [gender])
    }

    if (experience) {
      query = query.contains('experience_level', [experience])
    }

    if (daysPerWeek) {
      query = query.eq('days_per_week', Number(daysPerWeek))
    }

    const { data, error } = await query
    if (error) {
      throw error
    }

    return NextResponse.json({ templates: data ?? [] })
  } catch (error) {
    console.error('[AdminTemplates] GET error', error)
    return NextResponse.json({ error: 'Failed to load templates' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json()
    const parsed = createTemplateSchema.parse(payload)

    const { supabase } = auth

    const { data: programData, error: programError } = await supabase
      .from('program_templates')
      .insert({
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
      .select('id')
      .single()

    if (programError || !programData) {
      throw programError ?? new Error('Failed to create program template')
    }

    const programId = programData.id

    try {
      for (const day of parsed.days) {
        const { data: dayData, error: dayError } = await supabase
          .from('program_template_days')
          .insert({
            program_template_id: programId,
            day_number: day.dayNumber,
            day_name: day.dayName,
          })
          .select('id')
          .single()

        if (dayError || !dayData) {
          throw dayError ?? new Error(`Failed to create day ${day.dayNumber}`)
        }

        for (const exercise of day.exercises) {
          const { error: exerciseError } = await supabase
            .from('program_template_exercises')
            .insert({
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
    } catch (error) {
      await supabase.from('program_templates').delete().eq('id', programId)
      throw error
    }

    return NextResponse.json({ id: programId })
  } catch (error) {
    console.error('[AdminTemplates] POST error', error)
    return NextResponse.json({ error: 'Failed to create program template' }, { status: 500 })
  }
}
