import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from 'next/link'
import { LayoutDashboard, ShoppingCart, Activity, TrendingDown, FileText, Settings, Menu, Droplets } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

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
  
  // Komponen Menu Sidebar (Biar gak nulis ulang 2x)
  const SidebarMenu = () => (
    <div className="space-y-4 py-4">
      <div className="px-3 py-2">
        <div className="flex items-center pl-3 mb-10 gap-2">
           <div className="bg-blue-600 p-2 rounded-lg">
             <Droplets className="text-white h-6 w-6" />
           </div>
           <div>
             <h2 className="text-xl font-bold tracking-tight text-white">HydroFlow</h2>
             <p className="text-xs text-blue-200">Audit System</p>
           </div>
        </div>
        <div className="space-y-1">
          <Link href="/"><Button variant="ghost" className="w-full justify-start text-blue-100 hover:text-white hover:bg-blue-700"><LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard</Button></Link>
          <Link href="/kasir"><Button variant="ghost" className="w-full justify-start text-blue-100 hover:text-white hover:bg-blue-700"><ShoppingCart className="mr-2 h-4 w-4" /> Kasir (POS)</Button></Link>
          <Link href="/meteran"><Button variant="ghost" className="w-full justify-start text-blue-100 hover:text-white hover:bg-blue-700"><Activity className="mr-2 h-4 w-4" /> Audit Meteran</Button></Link>
          <Link href="/pengeluaran"><Button variant="ghost" className="w-full justify-start text-blue-100 hover:text-white hover:bg-blue-700"><TrendingDown className="mr-2 h-4 w-4" /> Pengeluaran</Button></Link>
          <Link href="/laporan"><Button variant="ghost" className="w-full justify-start text-blue-100 hover:text-white hover:bg-blue-700"><FileText className="mr-2 h-4 w-4" /> Laporan</Button></Link>
          <Link href="/settings"><Button variant="ghost" className="w-full justify-start text-blue-100 hover:text-white hover:bg-blue-700"><Settings className="mr-2 h-4 w-4" /> Pengaturan</Button></Link>
        </div>
      </div>
    </div>
  )

  return (
    <html lang="en">
      <body className={inter.className}>
        
        {/* TAMPILAN MOBILE (Header + Menu Hamburger) */}
        <div className="md:hidden flex items-center p-4 bg-blue-900 text-white sticky top-0 z-50">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-blue-800">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-blue-900 border-r-blue-800 p-0 w-[280px]">
              <SidebarMenu />
            </SheetContent>
          </Sheet>
          <span className="font-bold ml-4">HydroFlow Mobile</span>
        </div>

        <div className="flex min-h-screen bg-gray-50">
          {/* TAMPILAN DESKTOP (Sidebar Tetap) */}
          <div className="hidden md:block w-64 bg-blue-900 min-h-screen fixed left-0 top-0 z-10">
            <SidebarMenu />
          </div>

          {/* KONTEN UTAMA */}
          <div className="flex-1 md:ml-64 p-4 md:p-8 w-full overflow-x-hidden">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}