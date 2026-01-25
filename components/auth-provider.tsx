'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize auth state on app load
    const initializeAuth = async () => {
      try {
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('[AuthProvider] Session error:', error.message)
          return
        }

        if (session?.user) {
          console.log('[AuthProvider] ✅ Session restored:', session.user.email)
        } else {
          console.log('[AuthProvider] No session found on app load')
        }

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            console.log('[AuthProvider] Auth event:', event, session?.user?.email || 'no user')
          }
        )

        return () => {
          subscription?.unsubscribe()
        }
      } catch (err) {
        console.error('[AuthProvider] Init error:', err)
      }
    }

    initializeAuth()
  }, [])

  return <>{children}</>
}
