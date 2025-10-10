import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'

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

  return supabase
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await requireAdmin(request)
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')?.trim()
    const muscleGroup = searchParams.get('muscleGroup')
    const equipment = searchParams.get('equipment')

    let query = supabase
      .from('exercise_library')
      .select('id, name, muscle_group, equipment_type')
      .order('name')

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    if (muscleGroup) {
      query = query.eq('muscle_group', muscleGroup)
    }

    if (equipment) {
      query = query.eq('equipment_type', equipment)
    }

    const { data, error } = await query.limit(200)
    if (error) {
      throw error
    }

    return NextResponse.json({ exercises: data ?? [] })
  } catch (error) {
    console.error('[AdminExercises] GET error', error)
    return NextResponse.json({ error: 'Failed to load exercises' }, { status: 500 })
  }
}
