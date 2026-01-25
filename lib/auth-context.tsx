'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  userEmail: string | null
  role: string | null
  loading: boolean
  isReady: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthContextProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)

  // Initialize auth on app mount
  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        console.log('[AuthContext] 🔄 Initializing authentication...')

        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('[AuthContext] ❌ Session check error:', error.message)
          if (mounted) {
            setLoading(false)
            setIsReady(true)
          }
          return
        }

        if (session?.user) {
          console.log('[AuthContext] ✅ Session found for:', session.user.email)
          if (mounted) {
            setUser(session.user)
            setUserEmail(session.user.email || null)
          }

          // Fetch user profile and role
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

          if (profileError) {
            console.error('[AuthContext] ❌ Profile fetch failed:', {
              message: profileError.message,
              code: profileError.code,
              userId: session.user.id,
            })
            if (mounted) setRole('karyawan')
          } else if (profile?.role) {
            console.log('[AuthContext] ✅ Role loaded:', profile.role)
            if (mounted) setRole(profile.role)
          } else {
            console.warn('[AuthContext] ⚠️ Profile has no role, defaulting to karyawan')
            if (mounted) setRole('karyawan')
          }
        } else {
          console.log('[AuthContext] ℹ️ No session found - user not logged in')
          if (mounted) {
            setUser(null)
            setUserEmail(null)
            setRole(null)
          }
        }

        if (mounted) {
          setLoading(false)
          setIsReady(true)
        }
      } catch (err: any) {
        console.error('[AuthContext] ❌ Unexpected error:', err)
        if (mounted) {
          setLoading(false)
          setIsReady(true)
        }
      }
    }

    initAuth()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] 🔄 Auth state changed:', event)

        if (session?.user) {
          setUser(session.user)
          setUserEmail(session.user.email || null)

          // Re-fetch role on auth change
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

          if (profileError) {
            console.error('[AuthContext] ❌ Profile fetch on auth change:', profileError.message)
            setRole('karyawan')
          } else {
            setRole(profile?.role || 'karyawan')
          }
        } else {
          console.log('[AuthContext] ℹ️ User signed out')
          setUser(null)
          setUserEmail(null)
          setRole(null)
        }
      }
    )

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, userEmail, role, loading, isReady }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthContextProvider')
  }
  return context
}
