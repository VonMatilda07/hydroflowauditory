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

  // --- CEK SIAPA YANG LOGIN (REAL-TIME LISTENER) ---
  useEffect(() => {
    // Subscribe ke auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setEmail(session.user.email || '')
          
          // Ambil role dari tabel profiles
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()
          
          console.log('Profile fetch:', { profile, error, userId: session.user.id })
          if (profile) {
            console.log('Role found:', profile.role)
            setRole(profile.role)
          } else {
            console.warn('No profile found for user:', session.user.id)
            // Fallback: set role default ke 'karyawan' jika profile belum dibuat
            setRole('karyawan')
          }
        } else {
          // User tidak login
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
      roles: ['superadmin'] // Cuma BOS BESAR yang boleh
    },
  ]

  // Filter menu berdasarkan role user saat ini
  const filteredMenus = menus.filter(item => 
    role && item.roles.includes(role)
  )

  if (pathname === '/login') return null

  // Render sidebar skeleton saat loading (hindari hydration mismatch)
  if (loading) {
    return (
      <aside suppressHydrationWarning className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 p-4 flex flex-col md:flex z-50 shadow-2xl">
        {/* Skeleton placeholder untuk mencegah layout shift */}
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="bg-blue-600/50 p-2 rounded-lg w-8 h-8 animate-pulse"></div>
          <div className="flex-1">
            <div className="h-4 bg-slate-800 rounded w-3/4 mb-1"></div>
            <div className="h-3 bg-slate-800 rounded w-1/2"></div>
          </div>
        </div>
        <nav className="flex-1 space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-800/50 rounded-lg animate-pulse"></div>
          ))}
        </nav>
      </aside>
    )
  }

  return (
    <aside suppressHydrationWarning className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 p-4 flex flex-col md:flex z-50 shadow-2xl">
      
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
        {filteredMenus.map((item) => {
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
        })}
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
              {role}
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
    </aside>
  )
}