"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calculator, ClipboardList, Settings, Droplets, TrendingDown } from 'lucide-react'


const menus = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Kasir (POS)', href: '/kasir', icon: Calculator },
  { name: 'Audit Meteran', href: '/meteran', icon: Droplets },
  { name: 'Pengeluaran', href: '/pengeluaran', icon: TrendingDown }, // <-- TAMBAH INI
  { name: 'Laporan', href: '/laporan', icon: ClipboardList },
  { name: 'Pengaturan', href: '/settings', icon: Settings },
]
export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 p-4 flex flex-col hidden md:flex">
      {/* Header Logo */}
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Droplets className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-wider">HydroFlow</h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">Audit System</p>
        </div>
      </div>

      {/* Menu Navigasi */}
      <nav className="flex-1 space-y-2">
        {menus.map((item) => {
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

      {/* Footer User */}
      <div className="pt-4 border-t border-slate-800 mt-auto">
        <div className="px-4 py-3 bg-slate-800/50 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold">
            OD
          </div>
          <div>
            <p className="text-xs text-slate-400">Login sebagai:</p>
            <p className="text-sm font-semibold text-white">Jek</p>
          </div>
        </div>
      </div>
    </aside>
  )
}