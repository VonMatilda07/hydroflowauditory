"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts'
import { Droplets, Wallet, TrendingDown, AlertTriangle, CheckCircle, Truck, CreditCard } from 'lucide-react'

// Palet Warna Professional
const COLORS_PAYMENT = ['#10b981', '#3b82f6', '#f59e0b', '#64748b'] // Hijau (Cash), Biru (Transfer), Kuning (Bon), Abu (Free)
const COLORS_PRODUCT = '#3b82f6' // Biru buat batang produk

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  
  // State Data Dashboard
  const [stats, setStats] = useState({
    income: 0,        
    shipping: 0,      
    expense: 0,       
    profit: 0,        
    discrepancy: 0    
  })

  // State Buat Grafik
  const [paymentStats, setPaymentStats] = useState<any[]>([]) // Grafik Tipe Pembayaran
  const [productStats, setProductStats] = useState<any[]>([]) // Grafik Top Produk (Qty)
  const [cashflowStats, setCashflowStats] = useState<any[]>([]) // Grafik Pemasukan vs Pengeluaran

  useEffect(() => {
    fetchDashboardData()
  }, [])

 const fetchDashboardData = async () => {
    const today = new Date().toISOString().split('T')[0]

    try {
      // 1. DATA TRANSAKSI (Buat Keuangan & Tipe Bayar)
      // Ambil transaksi hari ini
      const { data: txs } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)

      let totalIncome = 0
      let totalShipping = 0
      const paymentMap: Record<string, number> = {}
      
      // Simpan ID transaksi hari ini buat dipake query item nanti
      const txIds: number[] = []

      if (txs) {
        txs.forEach(t => {
          totalIncome += (t.total_amount - (t.shipping_cost || 0)) 
          totalShipping += (t.shipping_cost || 0)
          txIds.push(t.id) // Kumpulkan ID

          const type = t.payment_type || 'Lainnya'
          paymentMap[type] = (paymentMap[type] || 0) + t.total_amount
        })
      }

      // Format Data Grafik Tipe Pembayaran
      const paymentChartData = Object.keys(paymentMap).map(key => ({
        name: key,
        value: paymentMap[key]
      }))
      setPaymentStats(paymentChartData)

      // 2. DATA PRODUK (PERBAIKAN DISINI)
      // Kita filter berdasarkan ID Transaksi, BUKAN created_at
      let items: any[] = []
      
      if (txIds.length > 0) {
        const { data } = await supabase
          .from('transaction_items')
          .select(`
            quantity,
            product_name,
            products (water_usage_liter)
          `)
          .in('transaction_id', txIds) // <--- INI KUNCINYA (Filter by ID Transaksi Hari Ini)
        
        if (data) items = data
      }
      
      let literTeoritis = 0
      const productMap: Record<string, number> = {}

      if (items) {
        items.forEach((item: any) => {
          const liter = item.products?.water_usage_liter || 0
          literTeoritis += (item.quantity * liter)

          const name = item.product_name
          productMap[name] = (productMap[name] || 0) + item.quantity
        })
      }

      // Format Data Grafik Produk
      const productChartData = Object.keys(productMap)
        .map(key => ({
          name: key,
          qty: productMap[key]
        }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5)
      
      setProductStats(productChartData)

      // 3. PENGELUARAN (Sama kayak sebelumnya)
      const { data: exps } = await supabase
        .from('expenses')
        .select('amount')
        .eq('date', today)
      
      const totalExpense = exps ? exps.reduce((sum, item) => sum + item.amount, 0) : 0

      // 4. METERAN AIR (Sama kayak sebelumnya)
      const { data: readings } = await supabase
        .from('meter_readings')
        .select('meter_value')
        .eq('date', today)
        .order('created_at', { ascending: true })

      let literReal = 0
      if (readings && readings.length >= 2) {
        literReal = readings[readings.length - 1].meter_value - readings[0].meter_value
      }

      setStats({
        income: totalIncome,
        shipping: totalShipping,
        expense: totalExpense,
        profit: (totalIncome + totalShipping) - totalExpense,
        discrepancy: literReal - literTeoritis
      })

      setCashflowStats([
        { name: 'Pemasukan', value: totalIncome + totalShipping, fill: '#10b981' },
        { name: 'Pengeluaran', value: totalExpense, fill: '#ef4444' }
      ])

    } catch (error) {
      console.error('Error dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const isBocor = stats.discrepancy > 5

  return (
    <div className="space-y-6 pb-10">
      
      {/* HEADER RINGKASAN */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Dashboard Utama</h2>
          <p className="text-gray-500">Analisa performa depot hari ini.</p>
        </div>
        
        {/* Indikator Laba Bersih */}
        <div className="bg-white px-6 py-3 rounded-xl border shadow-sm text-right">
          <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Laba Bersih Hari Ini</p>
          <p className={`text-3xl font-bold ${stats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            Rp {stats.profit.toLocaleString()}
          </p>
        </div>
      </div>

      {/* ROW 1: KARTU STATISTIK (4 Kotak) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-gray-500">Omzet Penjualan</CardTitle>
            <Wallet className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {stats.income.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-gray-500">Ongkir Driver</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {stats.shipping.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-gray-500">Pengeluaran</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {stats.expense.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className={`shadow-sm border-l-4 ${isBocor ? 'border-l-red-500' : 'border-l-green-500'}`}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-gray-500">Audit Air</CardTitle>
            {isBocor ? <AlertTriangle className="h-4 w-4 text-red-600" /> : <CheckCircle className="h-4 w-4 text-green-600" />}
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">Selisih: {stats.discrepancy} Liter</div>
            <p className="text-xs text-gray-400">{isBocor ? '⚠️ Cek kebocoran!' : '✅ Data Klop'}</p>
          </CardContent>
        </Card>
      </div>

      {/* ROW 2: ANALITIK DETAIL (Ini yang kamu minta) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. BREAKDOWN PRODUK TERLARIS (Horizontal Bar) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>🏆 Top 5 Produk Terlaris (Qty)</CardTitle>
            <CardDescription>Produk apa yang paling banyak keluar hari ini?</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={productStats} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="qty" fill={COLORS_PRODUCT} radius={[0, 4, 4, 0]} barSize={30} label={{ position: 'right' }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 2. SUMBER PENDAPATAN (Pie Chart) */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>💳 Metode Pembayaran</CardTitle>
            <CardDescription>Cek porsi Bon vs Tunai</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            {paymentStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_PAYMENT[index % COLORS_PAYMENT.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `Rp ${value.toLocaleString()}`} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-sm">Belum ada transaksi</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ROW 3: ARUS KAS (Optional tapi bagus buat pembanding) */}
      <Card>
        <CardHeader>
          <CardTitle>💸 Arus Kas (Pemasukan vs Pengeluaran)</CardTitle>
        </CardHeader>
        <CardContent className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashflowStats} layout="vertical" barSize={40}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip formatter={(value: any) => `Rp ${value.toLocaleString()}`} cursor={{fill: 'transparent'}} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {cashflowStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

    </div>
  )
}