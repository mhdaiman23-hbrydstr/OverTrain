import { NextRequest, NextResponse } from 'next/server'
import { templateSchema, requireAdmin, insertTemplateStructure } from './helpers'

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
    const parsed = templateSchema.parse(payload)

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
      await insertTemplateStructure(supabase, programId, parsed.days)
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
