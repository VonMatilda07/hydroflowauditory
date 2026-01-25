"use client"

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Home, Calculator, ClipboardList, Settings, 
  Droplets, TrendingDown, LogOut, Users, CreditCard 
} from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  // --- STATE DATA USER & ROLE ---
  const [role, setRole] = useState<string | null>(null)
  const [email, setEmail] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)

  // --- CEK SIAPA YANG LOGIN (REAL-TIME LISTENER) ---
  useEffect(() => {
    setIsClient(true) // Mark sebagai client-side render
    
    // Subscribe ke auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Sidebar Auth] Event:', event, 'Email:', session?.user?.email)
        
        if (session?.user) {
          setEmail(session.user.email || '')
          
          // Ambil role dari tabel profiles
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role, id, email, created_at')
            .eq('id', session.user.id)
            .single()
          
          console.log('[Sidebar Profile] Full query result:', { 
            profile, 
            error,
            userId: session.user.id,
            userEmail: session.user.email,
            errorMessage: error?.message,
            errorCode: error?.code,
          })
          
          if (profile?.role) {
            console.log('✅ [Sidebar] Role found from DB:', profile.role)
            setRole(profile.role)
          } else {
            console.error('❌ [Sidebar] CRITICAL: Profile query failed!', {
              userId: session.user.id,
              userEmail: session.user.email,
              profileExists: !!profile,
              errorCode: error?.code,
              errorMessage: error?.message,
              profileData: profile,
            })
            console.warn('⚠️ [Sidebar] FIX: Check Supabase at https://app.supabase.com/project/_/editor?schema=public')
            console.warn('⚠️ [Sidebar] 1. Does row exist in profiles table with id=' + session.user.id + '?')
            console.warn('⚠️ [Sidebar] 2. Does the row have a role value (not NULL)?')
            console.warn('⚠️ [Sidebar] 3. Is RLS policy blocking SELECT on profiles?')
            // Fallback ke role karyawan
            setRole('karyawan')
          }
        } else {
          // User tidak login
          console.log('[Sidebar] No session, user not logged in')
          setRole(null)
          setEmail('')
        }
        
        setLoading(false)
      }
    )

    // Cleanup: unsubscribe saat component unmount
    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  // --- FUNGSI LOGOUT ---
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // --- CONFIG MENU DENGAN PERMISSIONS (SATPAM) ---
  const menus = [
    { 
      name: 'Dashboard', 
      href: '/', 
      icon: Home, 
      roles: ['superadmin', 'admin'] // Karyawan gak boleh liat
    },
    { 
      name: 'Kasir (POS)', 
      href: '/kasir', 
      icon: Calculator, 
      roles: ['superadmin', 'admin', 'karyawan'] // Semua boleh
    },
    // 🔥 MENU BARU: PELANGGAN 🔥
    { 
      name: 'Pelanggan', 
      href: '/pelanggan', 
      icon: Users, 
      roles: ['superadmin', 'admin', 'karyawan'] 
    },
    { 
      name: 'Audit Meteran', 
      href: '/meteran', 
      icon: Droplets, 
      roles: ['superadmin', 'admin', 'karyawan'] 
    },
    { 
      name: 'Pengeluaran', 
      href: '/pengeluaran', 
      icon: TrendingDown, 
      roles: ['superadmin', 'admin'] 
    },
    { 
      name: 'Hutang Pelanggan', 
      href: '/debttracker', 
      icon: CreditCard, 
      roles: ['superadmin', 'admin'] 
    },
    { 
      name: 'Laporan', 
      href: '/laporan', 
      icon: ClipboardList, 
      roles: ['superadmin', 'admin'] 
    },
    { 
      name: 'Pengaturan', 
      href: '/settings', 
      icon: Settings, 
      roles: ['superadmin', 'admin'] // Superadmin dan admin bisa akses
    },
  ]

  // Filter menu berdasarkan role user - ATAU tampilkan semua jika role belum ter-load
  // Ini memastikan kasir (POS) selalu muncul bahkan jika role tidak ter-load
  const filteredMenus = role 
    ? menus.filter(item => item.roles.includes(role))
    : menus.filter(item => 
        // Fallback: tampilkan menu yang accessible oleh karyawan
        item.roles.includes('karyawan')
      )

  if (pathname === '/login') return null

  // SELALU render sidebar, jangan return null saat loading
  // Ini untuk mencegah sidebar hilang saat refresh
  const renderContent = () => {
    if (!isClient) {
      // Server-side render: tampilkan logo skeleton saja
      return (
        <>
          <div className="mb-8 flex items-center gap-2 px-2">
            <div className="bg-blue-600/50 p-2 rounded-lg w-8 h-8 animate-pulse"></div>
            <div className="flex-1">
              <div className="h-4 bg-slate-800 rounded w-3/4 mb-1"></div>
              <div className="h-3 bg-slate-800 rounded w-1/2"></div>
            </div>
          </div>
          <nav className="flex-1 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-800/50 rounded-lg animate-pulse"></div>
            ))}
          </nav>
          {/* Profile skeleton */}
          <div className="pt-4 border-t border-slate-800 mt-auto space-y-2">
            <div className="px-4 py-3 bg-slate-800/50 rounded-xl flex items-center gap-3 border border-slate-700/50">
              <div className="w-8 h-8 rounded-full bg-slate-700 animate-pulse"></div>
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-slate-700 rounded w-2/3 animate-pulse"></div>
                <div className="h-2 bg-slate-700 rounded w-1/2 animate-pulse"></div>
              </div>
            </div>
            <div className="h-9 bg-slate-800/50 rounded-lg animate-pulse"></div>
          </div>
        </>
      )
    }

    // Client-side render: tampilkan konten penuh
    return (
      <>
        {/* Header Logo */}
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-900/50">
            <Droplets className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider">HydroFlow</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Audit System</p>
          </div>
        </div>

        {/* Menu Navigasi (Dinamis) */}
        <nav className="flex-1 space-y-2 overflow-y-auto">
          {filteredMenus.length > 0 ? (
            filteredMenus.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 translate-x-1' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-1'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              )
            })
          ) : (
            <p className="text-xs text-slate-500 px-4 py-2">Loading menu...</p>
          )}
        </nav>

        {/* Footer User & Logout */}
        <div className="pt-4 border-t border-slate-800 mt-auto space-y-2">
          {/* Profile Card */}
          <div className="px-4 py-3 bg-slate-800/50 rounded-xl flex items-center gap-3 border border-slate-700/50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white shadow-md">
              {email.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs text-slate-400">Login sebagai:</p>
              <p className="text-sm font-semibold text-white truncate w-28">
                {email.split('@')[0]}
              </p>
              <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-300 uppercase font-bold border border-slate-700">
                {role || 'Loading...'}
              </span>
            </div>
          </div>

          {/* Tombol Logout */}
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-red-400 hover:bg-red-950/30 py-2 rounded-lg transition-colors text-sm font-medium group"
          >
            <LogOut size={16} className="group-hover:text-red-500"/> Keluar
          </button>
        </div>
      </>
    )
  }

  return (
    <aside suppressHydrationWarning className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 p-4 flex flex-col md:flex z-50 shadow-2xl">
      {renderContent()}
    </aside>
  )
}