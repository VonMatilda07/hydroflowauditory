"use client"

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Home, Calculator, ClipboardList, Settings, 
  Droplets, TrendingDown, LogOut, User 
} from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  // --- STATE DATA USER & ROLE ---
  const [role, setRole] = useState<string | null>(null)
  const [email, setEmail] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // --- CEK SIAPA YANG LOGIN ---
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setEmail(user.email || '')
        // Ambil role dari tabel profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        if (profile) setRole(profile.role)
      }
      setLoading(false)
    }
    checkUser()
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
    { 
      name: 'Audit Meteran', 
      href: '/meteran', 
      icon: Droplets, 
      roles: ['superadmin', 'admin', 'karyawan'] // Semua boleh
    },
    { 
      name: 'Pengeluaran', 
      href: '/pengeluaran', 
      icon: TrendingDown, 
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
      href: '/settings', // Sesuaikan folder kamu, tadi kayaknya /pengaturan ya? Cek folder app mu.
      icon: Settings, 
      roles: ['superadmin'] // Cuma BOS BESAR yang boleh
    },
  ]

  // Filter menu berdasarkan role user saat ini
  const filteredMenus = menus.filter(item => 
    role && item.roles.includes(role)
  )

  if (loading) return null // Atau kasih spinner loading kecil
  if (pathname === '/login') return null

  return (
    <aside className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 p-4 flex flex-col hidden md:flex z-50 shadow-2xl">
      
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