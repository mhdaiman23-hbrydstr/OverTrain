import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Required for static export (native builds)
export const dynamic = 'force-static';

// GET: Retrieve all support requests (admin only)
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const priority = searchParams.get('priority')
    const search = searchParams.get('search')

    let query = supabase
      .from('support_requests')
      .select(`
        *,
        user_profile:profiles!support_requests_user_id_fkey (
          name,
          email
        ),
        assigned_profile:profiles!support_requests_assigned_to_fkey (
          name,
          email
        )
      `)

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (type && type !== 'all') {
      query = query.eq('type', type)
    }
    if (priority && priority !== 'all') {
      query = query.eq('priority', priority)
    }

    // Apply search filter
    if (search) {
      query = query.or(`subject.ilike.%${search}%,details.ilike.%${search}%,user_profile.name.ilike.%${search}%,user_profile.email.ilike.%${search}%`)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching support requests:', error)
      return NextResponse.json({ error: 'Failed to fetch support requests' }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Support requests API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH: Update support request status, priority, or admin notes (admin only)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, status, priority, admin_notes, assigned_to } = body

    if (!id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (priority !== undefined) updateData.priority = priority
    if (admin_notes !== undefined) updateData.admin_notes = admin_notes
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to

    const { data, error } = await supabase
      .from('support_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating support request:', error)
      return NextResponse.json({ error: 'Failed to update support request' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Support request not found' }, { status: 404 })
    }

    return NextResponse.json({ data, message: 'Support request updated successfully' })
  } catch (error) {
    console.error('Support request update API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Delete a support request (admin only)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase
      .from('support_requests')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting support request:', error)
      return NextResponse.json({ error: 'Failed to delete support request' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Support request deleted successfully' })
  } catch (error) {
    console.error('Support request delete API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
