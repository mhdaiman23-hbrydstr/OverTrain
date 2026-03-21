import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'
import { requireAdmin } from '../../auth'

/**
 * GET /api/admin/templates/exercises — Search exercise library (admin only)
 *
 * Query params:
 *   search — text search on name
 *   muscleGroup — filter by muscle_group (can repeat)
 *   equipment — filter by equipment_type (can repeat)
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  const supabase = getServerSupabase()
  const url = new URL(req.url)

  const search = url.searchParams.get('search')
  const muscleGroups = url.searchParams.getAll('muscleGroup').filter(Boolean)
  const equipmentTypes = url.searchParams.getAll('equipment').filter(Boolean)

  let query = supabase
    .from('exercise_library')
    .select('id, name, muscle_group, equipment_type')
    .order('name')

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  if (muscleGroups.length > 0) {
    query = query.in('muscle_group', muscleGroups)
  }

  if (equipmentTypes.length > 0) {
    query = query.in('equipment_type', equipmentTypes)
  }

  const { data, error } = await query.limit(200)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ exercises: data ?? [] })
}
