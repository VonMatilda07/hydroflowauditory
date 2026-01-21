"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Activity, CreditCard, Droplets, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    omzet: 0,
    transaksi: 0,
    produkTerjual: 0
  })

  // State Audit Air (BIO & RO)
  const [audit, setAudit] = useState({
    bio: { sold: 0, meter: 0, diff: 0, status: 'WAITING' },
    ro: { sold: 0, meter: 0, diff: 0, status: 'WAITING' }
  })
  
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    try {
      // 1. AMBIL DATA PRODUK (Buat tau 1 item itu berapa liter & sumber airnya)
      const { data: products } = await supabase.from('products').select('id, name, liters, source_type')
      
      // Bikin map biar gampang nyarinya: productMap[id] = {liters, source}
      const productMap: Record<number, any> = {}
      products?.forEach(p => {
        productMap[p.id] = { liters: p.liters || 0, source: p.source_type }
      })

      // 2. HITUNG PENJUALAN HARI INI (TEORITIS)
      const { data: txs } = await supabase
        .from('transactions')
        .select(`total_amount, transaction_items (product_id, quantity)`)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)

      let totalOmzet = 0
      let totalTx = 0
      let bioSold = 0
      let roSold = 0

      if (txs) {
        totalTx = txs.length
        txs.forEach(t => {
          totalOmzet += t.total_amount
          // Loop item belanjaan
          t.transaction_items.forEach((item: any) => {
            const pInfo = productMap[item.product_id]
            if (pInfo) {
              const litersSold = item.quantity * pInfo.liters
              if (pInfo.source === 'BIO') bioSold += litersSold
              if (pInfo.source === 'RO') roSold += litersSold
            }
          })
        })
      }

      // 3. HITUNG METERAN HARI INI (AKTUAL)
      const { data: meters } = await supabase
        .from('meter_readings')
        .select('*')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .order('created_at', { ascending: true }) // Urut dari pagi ke malam

      let bioMeter = 0
      let roMeter = 0
      let bioStatus = 'WAITING'
      let roStatus = 'WAITING'

      // Logika: Harus ada minimal 2 data (Awal & Akhir) atau ambil Max - Min
      if (meters && meters.length >= 1) {
        // Cari angka terkecil (Pagi) dan terbesar (Malam/Saat ini)
        const readingsBio = meters.map(m => m.meter_bio).filter(n => n > 0)
        const readingsRO = meters.map(m => m.meter_ro).filter(n => n > 0)

        if (readingsBio.length > 0) {
           const minBio = Math.min(...readingsBio)
           const maxBio = Math.max(...readingsBio)
           bioMeter = maxBio - minBio
        }

        if (readingsRO.length > 0) {
           const minRO = Math.min(...readingsRO)
           const maxRO = Math.max(...readingsRO)
           roMeter = maxRO - minRO
        }

        // Tentukan Status (Margin Error 19 Liter)
        const margin = 19 
        const bioDiff = bioMeter - bioSold
        const roDiff = roMeter - roSold

        // Kalau meteran belum bergerak (masih 0), status waiting
        // Kalau sudah ada selisih, cek status
        bioStatus = Math.abs(bioDiff) <= margin ? 'SAFE' : (bioDiff > margin ? 'LEAK' : 'ANOMALY')
        roStatus = Math.abs(roDiff) <= margin ? 'SAFE' : (roDiff > margin ? 'LEAK' : 'ANOMALY')
        
        // Simpan ke state audit
        setAudit({
          bio: { sold: bioSold, meter: bioMeter, diff: bioDiff, status: bioStatus },
          ro: { sold: roSold, meter: roMeter, diff: roDiff, status: roStatus }
        })
      }

      setStats({ omzet: totalOmzet, transaksi: totalTx, produkTerjual: 0 })

    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Komponen Helper untuk Status Badge
  const StatusBadge = ({ status, diff }: { status: string, diff: number }) => {
     if (status === 'WAITING') return <span className="text-gray-400 text-xs">Menunggu Data Meteran...</span>
     if (status === 'SAFE') return <span className="flex items-center text-green-600 font-bold text-xs"><CheckCircle size={14} className="mr-1"/> AMAN (Wajar)</span>
     if (status === 'LEAK') return <span className="flex items-center text-red-600 font-bold text-xs"><AlertTriangle size={14} className="mr-1"/> BOCOR (+{diff.toLocaleString()} L)</span>
     return <span className="flex items-center text-orange-500 font-bold text-xs"><AlertTriangle size={14} className="mr-1"/> CEK INPUT ({diff.toLocaleString()} L)</span>
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8 pb-20">
      
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Dashboard Utama</h1>
        <p className="text-gray-500">Ringkasan performa & audit hari ini.</p>
      </div>

      {/* STATISTIK KEUANGAN (ATAS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-blue-600 text-white shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
              <CreditCard size={18}/> Omzet Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">Rp {stats.omzet.toLocaleString()}</div>
            <p className="text-sm opacity-80 mt-1">{stats.transaksi} Transaksi berhasil</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-blue-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Activity size={18}/> Status Operasional
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-3xl font-bold text-gray-800">BUKA</div>
             <p className="text-sm text-green-600 mt-1">System Online & Ready</p>
          </CardContent>
        </Card>
      </div>

      {/* AUDIT STOK AIR (THE MAIN FEATURE) */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
           <Droplets className="text-blue-500"/> Audit Stok Air (Real-time)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* KARTU AUDIT BIO */}
          <Card className={`border-t-4 ${audit.bio.status === 'LEAK' ? 'border-t-red-500' : 'border-t-blue-500'} shadow-md`}>
            <CardHeader className="pb-2 border-b bg-gray-50/50">
              <div className="flex justify-between items-center">
                <CardTitle className="text-blue-700">Air BIO (Biasa)</CardTitle>
                <StatusBadge status={audit.bio.status} diff={audit.bio.diff} />
              </div>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 gap-4 text-center">
               <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">Terjual (Kasir)</p>
                  <p className="text-xl font-mono font-bold text-gray-800">{audit.bio.sold.toLocaleString()} <span className="text-xs font-normal">Liter</span></p>
               </div>
               <div className="border-l">
                  <p className="text-xs text-gray-500 uppercase font-bold">Keluar (Meteran)</p>
                  <p className="text-xl font-mono font-bold text-gray-800">{audit.bio.meter.toLocaleString()} <span className="text-xs font-normal">Liter</span></p>
               </div>
               <div className="col-span-2 pt-2 border-t mt-2">
                 <p className="text-xs text-gray-400 mb-1">Selisih (Fisik - Sistem)</p>
                 <p className={`text-lg font-bold ${audit.bio.diff > 19 ? 'text-red-600' : (audit.bio.diff < -19 ? 'text-orange-500' : 'text-green-600')}`}>
                   {audit.bio.diff > 0 ? '+' : ''}{audit.bio.diff.toLocaleString()} Liter
                 </p>
               </div>
            </CardContent>
          </Card>

          {/* KARTU AUDIT RO */}
          <Card className={`border-t-4 ${audit.ro.status === 'LEAK' ? 'border-t-red-500' : 'border-t-purple-500'} shadow-md`}>
            <CardHeader className="pb-2 border-b bg-gray-50/50">
              <div className="flex justify-between items-center">
                <CardTitle className="text-purple-700">Air RO (Premium)</CardTitle>
                <StatusBadge status={audit.ro.status} diff={audit.ro.diff} />
              </div>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 gap-4 text-center">
               <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">Terjual (Kasir)</p>
                  <p className="text-xl font-mono font-bold text-gray-800">{audit.ro.sold.toLocaleString()} <span className="text-xs font-normal">Liter</span></p>
               </div>
               <div className="border-l">
                  <p className="text-xs text-gray-500 uppercase font-bold">Keluar (Meteran)</p>
                  <p className="text-xl font-mono font-bold text-gray-800">{audit.ro.meter.toLocaleString()} <span className="text-xs font-normal">Liter</span></p>
               </div>
               <div className="col-span-2 pt-2 border-t mt-2">
                 <p className="text-xs text-gray-400 mb-1">Selisih (Fisik - Sistem)</p>
                 <p className={`text-lg font-bold ${audit.ro.diff > 19 ? 'text-red-600' : (audit.ro.diff < -19 ? 'text-orange-500' : 'text-green-600')}`}>
                   {audit.ro.diff > 0 ? '+' : ''}{audit.ro.diff.toLocaleString()} Liter
                 </p>
               </div>
            </CardContent>
          </Card>

        </div>
        
        <p className="text-center text-xs text-gray-400 mt-6 italic">
          *Toleransi wajar (air bilas) adalah ±1 galon (19 Liter) per hari.
        </p>
      </div>

    </div>
  )
}