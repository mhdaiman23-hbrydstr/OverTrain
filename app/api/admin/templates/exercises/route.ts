import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'

// Required for static export (native builds)
export const dynamic = 'force-static';

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
    const muscleGroups = searchParams.getAll('muscleGroup').filter(Boolean)
    const equipmentTypes = searchParams.getAll('equipment').filter(Boolean)

    let query = supabase
      .from('exercise_library')
      .select('id, name, muscle_group, equipment_type')
      .order('name')

    if (search) {
      const sanitizedSearch = search.replace(/[%_,()]/g, ' ').trim()
      if (sanitizedSearch.length > 0) {
        const likePattern = `%${sanitizedSearch}%`
        query = query.or(
          `name.ilike.${likePattern},muscle_group.ilike.${likePattern},equipment_type.ilike.${likePattern}`,
        )
      }
    }

    if (muscleGroups.length > 0) {
      query = query.in('muscle_group', muscleGroups)
    }

    if (equipmentTypes.length > 0) {
      query = query.in('equipment_type', equipmentTypes)
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
