'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  role: string | null
  loading: boolean
  isReady: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  isReady: false,
})

export function AuthContextProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Initialize session on app load
    const initializeAuth = async () => {
      try {
        console.log('[AuthContext] Initializing auth...')
        
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('[AuthContext] Session error:', sessionError.message)
        }

        if (session?.user) {
          console.log('[AuthContext] ✅ Session found:', session.user.email)
          setUser(session.user)
          
          // Fetch profile role
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

          if (profileError) {
            console.error('[AuthContext] Profile fetch error:', profileError.message, { code: profileError.code })
            setRole('karyawan')
          } else if (profile?.role) {
            console.log('[AuthContext] ✅ Profile role:', profile.role)
            setRole(profile.role)
          } else {
            console.warn('[AuthContext] Profile has no role, defaulting to karyawan')
            setRole('karyawan')
          }
        } else {
          console.log('[AuthContext] No session on app init')
          setUser(null)
          setRole(null)
        }

        setIsReady(true)
        setLoading(false)
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          console.log('[AuthContext] Token refresh in progress (AbortError - expected)')
        } else {
          console.error('[AuthContext] Init error:', err)
        }
        setIsReady(true)
        setLoading(false)
      }
    }

    initializeAuth()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] Auth event:', event)

        if (session?.user) {
          setUser(session.user)

          // Fetch role for new session
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

          if (profileError) {
            console.error('[AuthContext] Profile fetch on auth change error:', profileError.message)
            setRole('karyawan')
          } else {
            setRole(profile?.role || 'karyawan')
          }
        } else {
          setUser(null)
          setRole(null)
        }
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, role, loading, isReady }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthContextProvider')
  }
  return context
}
