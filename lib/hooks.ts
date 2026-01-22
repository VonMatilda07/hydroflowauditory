'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

/**
 * Hook untuk proteksi route berdasarkan role
 * Redirect ke home kalau role tidak sesuai atau user tidak login
 * 
 * Contoh penggunaan:
 * useProtectedRoute('superadmin')
 * useProtectedRoute(['superadmin', 'admin'])
 */
export function useProtectedRoute(allowedRoles: string | string[]) {
  const router = useRouter()

  useEffect(() => {
    const checkAccess = async () => {
      try {
        // 1. Cek apakah user sudah login
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          // Tidak login, redirect ke login
          router.push('/login')
          return
        }

        // 2. Ambil role dari database
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (error || !profile) {
          // Data profile tidak ditemukan, redirect ke login
          router.push('/login')
          return
        }

        // 3. Cek apakah role user termasuk yang diizinkan
        const rolesArray = Array.isArray(allowedRoles) 
          ? allowedRoles 
          : [allowedRoles]

        if (!rolesArray.includes(profile.role)) {
          // Role tidak sesuai, redirect ke home
          router.push('/')
          return
        }

        // Akses diizinkan, biarkan halaman render
      } catch (error) {
        console.error('Error checking access:', error)
        router.push('/')
      }
    }

    checkAccess()
  }, [router, allowedRoles])
}
