import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Create client dengan SERVICE ROLE KEY (dari environment variable backend)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // ⚠️ Service role key (server-side only)
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    console.log(`[API] Deleting user: ${userId}`)

    // Delete dari auth (admin API)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (authError) {
      console.error('[API] Auth delete error:', authError)
      // Lanjut ke delete profile
    }

    // Delete dari profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('[API] Profile delete error:', profileError)
      return NextResponse.json(
        { error: `Failed to delete profile: ${profileError.message}` },
        { status: 500 }
      )
    }

    console.log(`[API] Successfully deleted user: ${userId}`)

    return NextResponse.json({ success: true, message: 'User deleted successfully' })
  } catch (error: any) {
    console.error('[API] Delete user error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
