import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from 'next/link'
import { LayoutDashboard, ShoppingCart, Activity, TrendingDown, FileText, Settings, Menu, Droplets } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import Sidebar from "@/components/Sidebar"
import { AuthContextProvider } from "@/lib/auth-context"
import { ToastProvider } from '@/lib/toast-context'
import { ToastContainer } from '@/components/toast-container'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HydroFlow Audit",
  description: "Sistem Audit Depot Air Minum",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  // --- MENU MOBILE (Sementara Manual) ---
  // Note: Menu ini belum ada fitur 'Satpam' (RBAC), jadi semua role bisa liat tombolnya.
  // Tapi aman, karena kalau diklik halamannya tetap terproteksi logic database nanti.
  const MobileMenu = () => (
    <div className="space-y-4 py-4">
      <div className="px-3 py-2">
        <div className="flex items-center pl-3 mb-10 gap-2">
           <div className="bg-blue-600 p-2 rounded-lg">
             <Droplets className="text-white h-6 w-6" />
           </div>
           <div>
             <h2 className="text-xl font-bold tracking-tight text-white">HydroFlow</h2>
             <p className="text-xs text-slate-400">Mobile Access</p>
           </div>
        </div>
        <div className="space-y-1">
          <Link href="/"><Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"><LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard</Button></Link>
          <Link href="/kasir"><Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"><ShoppingCart className="mr-2 h-4 w-4" /> Kasir (POS)</Button></Link>
          <Link href="/meteran"><Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"><Activity className="mr-2 h-4 w-4" /> Audit Meteran</Button></Link>
          <Link href="/pengeluaran"><Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"><TrendingDown className="mr-2 h-4 w-4" /> Pengeluaran</Button></Link>
          <Link href="/laporan"><Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"><FileText className="mr-2 h-4 w-4" /> Laporan</Button></Link>
          {/* Update link ke /pengaturan biar ga 404 */}
          <Link href="/pengaturan"><Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"><Settings className="mr-2 h-4 w-4" /> Pengaturan</Button></Link>
        </div>
      </div>
    </div>
  )

  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthContextProvider>
          <ToastProvider>
            
            {/* 1. TAMPILAN MOBILE (Header + Menu Hamburger) */}
            {/* Warna diubah ke slate-900 biar senada sama Sidebar Desktop */}
            <div className="md:hidden flex items-center p-4 bg-slate-900 text-white sticky top-0 z-50 shadow-md">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-slate-800">
                    <Menu />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="bg-slate-900 border-r-slate-800 p-0 w-[280px]">
                  <MobileMenu />
                </SheetContent>
              </Sheet>
              <span className="font-bold ml-4 tracking-wide">HydroFlow</span>
            </div>

            <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
              
              {/* 2. TAMPILAN DESKTOP (Sidebar Canggih) */}
              {/* Komponen <Sidebar /> ini otomatis hidden di mobile (md:flex) */}
              <div className="hidden md:block">
                <Sidebar />
              </div>

              {/* 3. KONTEN UTAMA */}
              {/* md:ml-64 memberi jarak kiri biar ga ketutup sidebar di desktop */}
              <main className="flex-1 md:ml-64 p-4 md:p-8 w-full overflow-x-hidden transition-all duration-300">
                {children}
              </main>
              
            </div>

            {/* Toast Container */}
            <ToastContainer />
          </ToastProvider>
        </AuthContextProvider>
      </body>
    </html>
  );
}