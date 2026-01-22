import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { userId, fullName, role } = await request.json()

    if (!userId || !fullName || !role) {
      return NextResponse.json(
        { error: 'userId, fullName, and role are required' },
        { status: 400 }
      )
    }

    // Create client dengan SERVICE ROLE KEY
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    console.log(`[API] Updating user: ${userId} → role: ${role}`)

    // Update di profiles table
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: fullName,
        role: role,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()

    if (error) {
      console.error('[API] Update error:', error)
      return NextResponse.json(
        { error: `Failed to update user: ${error.message}` },
        { status: 500 }
      )
    }

    console.log(`[API] Successfully updated user: ${userId}`, data)

    return NextResponse.json({ success: true, data, message: 'User updated successfully' })
  } catch (error: any) {
    console.error('[API] Update user error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
