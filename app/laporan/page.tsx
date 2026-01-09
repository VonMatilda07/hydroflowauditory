"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts'
import { Download, Filter, TrendingUp, Wallet, ShoppingBag } from 'lucide-react'

// Warna Chart
const COLORS_PAYMENT = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']
const COLOR_PROFIT = '#10b981'
const COLOR_OMZET = '#3b82f6'

export default function LaporanPage() {
  const [loading, setLoading] = useState(false)
  
  // Filter Tanggal Default: Awal bulan s/d Hari ini
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  
  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0])
  
  // Data Mentah
  const [transactions, setTransactions] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [meterLogs, setMeterLogs] = useState<any[]>([])

  // Data Olahan untuk Grafik
  const [chartTrend, setChartTrend] = useState<any[]>([])
  const [chartProduct, setChartProduct] = useState<any[]>([])
  const [chartPayment, setChartPayment] = useState<any[]>([])

  // Summary Card
  const [summary, setSummary] = useState({
    totalOmzet: 0,
    totalExpense: 0,
    netProfit: 0,
    totalTx: 0
  })

  useEffect(() => {
    fetchData()
  }, [startDate, endDate])

  // --- LOGIC PRESET TANGGAL ---
  const setPreset = (type: 'today' | 'week' | 'month') => {
    const t = new Date()
    const yyyy = t.getFullYear()
    const mm = String(t.getMonth() + 1).padStart(2, '0')
    const dd = String(t.getDate()).padStart(2, '0')
    const strToday = `${yyyy}-${mm}-${dd}`

    if (type === 'today') {
      setStartDate(strToday)
      setEndDate(strToday)
    } else if (type === 'week') {
      const day = t.getDay()
      const diff = t.getDate() - day + (day === 0 ? -6 : 1) 
      const monday = new Date(t.setDate(diff))
      const mStr = monday.toISOString().split('T')[0]
      setStartDate(mStr)
      setEndDate(strToday)
    } else if (type === 'month') {
      setStartDate(`${yyyy}-${mm}-01`)
      setEndDate(strToday)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Fetch Transaksi + Items
      const { data: txs } = await supabase
        .from('transactions')
        .select(`*, transaction_items (product_name, quantity, price_at_transaction)`)
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`)
        .order('created_at', { ascending: true }) // Ascending biar grafik garisnya urut tanggal

      if (txs) {
        setTransactions(txs.reverse()) // Di tabel kita mau yg terbaru di atas, jadi reverse buat tabel
        processCharts(txs) // Kirim data asli (urut tanggal) ke fungsi pengolah grafik
      }

      // 2. Fetch Pengeluaran
      const { data: exps } = await supabase
        .from('expenses')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })
      
      if (exps) setExpenses(exps)

      // 3. Fetch Meteran
      const { data: meters } = await supabase
        .from('meter_readings')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('created_at', { ascending: false })

      if (meters) setMeterLogs(meters)

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // --- OTAK PENGOLAH GRAFIK (The Brain) ---
  const processCharts = (data: any[]) => {
    // A. Hitung Ringkasan Global
    let omzet = 0
    data.forEach(t => omzet += t.total_amount)
    
    // B. Grafik 1: Trend Omzet Harian (Line Chart)
    const trendMap: Record<string, number> = {}
    data.forEach(t => {
      const date = new Date(t.created_at).toLocaleDateString('id-ID', {day: '2-digit', month: 'short'})
      trendMap[date] = (trendMap[date] || 0) + t.total_amount
    })
    const trendData = Object.keys(trendMap).map(k => ({ date: k, omzet: trendMap[k] }))
    setChartTrend(trendData)

    // C. Grafik 2: Produk Breakdown (Bar Chart)
    const prodMap: Record<string, number> = {}
    data.forEach(t => {
      t.transaction_items.forEach((item: any) => {
        prodMap[item.product_name] = (prodMap[item.product_name] || 0) + item.quantity
      })
    })
    // Sort dari yg paling laku
    const prodData = Object.keys(prodMap)
      .map(k => ({ name: k, qty: prodMap[k] }))
      .sort((a, b) => b.qty - a.qty)
    setChartProduct(prodData)

    // D. Grafik 3: Pembayaran Breakdown (Pie Chart)
    const payMap: Record<string, number> = {}
    data.forEach(t => {
      const type = t.payment_type || 'Lainnya'
      payMap[type] = (payMap[type] || 0) + t.total_amount
    })
    const payData = Object.keys(payMap).map(k => ({ name: k, value: payMap[k] }))
    setChartPayment(payData)

    // Update State Summary
    // Note: Total Expense diambil nanti dari state expenses, kita hitung kasar di render aja
    setSummary(prev => ({ ...prev, totalOmzet: omzet, totalTx: data.length }))
  }

  // Hitung ulang Net Profit saat expenses berubah
  const totalExpense = expenses.reduce((a, b) => a + b.amount, 0)
  const netProfit = summary.totalOmzet - totalExpense

  // CSV Export
  const downloadCSV = (data: any[], filename: string) => {
    if (!data.length) return alert('Data kosong')
    const headers = Object.keys(data[0]).join(",")
    const rows = data.map(obj => Object.values(obj).map(v => `"${v}"`).join(",")).join("\n")
    const blob = new Blob([headers + "\n" + rows], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}_${startDate}.csv`
    a.click()
  }

  return (
    <div className="space-y-8 pb-10">
      
      {/* 1. FILTER & HEADER AREA */}
      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Laporan Detail</h1>
            <p className="text-gray-500">Analisa performa berdasarkan rentang waktu.</p>
          </div>
          
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <Button variant="ghost" size="sm" onClick={() => setPreset('today')}>Hari Ini</Button>
            <Button variant="ghost" size="sm" onClick={() => setPreset('week')}>Minggu Ini</Button>
            <Button variant="ghost" size="sm" onClick={() => setPreset('month')}>Bulan Ini</Button>
          </div>
        </div>

        <div className="flex items-center gap-4 border-t pt-4">
          <div className="grid gap-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Dari Tanggal</span>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9"/>
          </div>
          <span className="text-gray-400">-</span>
          <div className="grid gap-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Sampai Tanggal</span>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9"/>
          </div>
          <Button onClick={fetchData} className="mt-5 bg-blue-600 h-9 px-6">Terapkan</Button>
        </div>
      </div>

      {/* 2. SUMMARY CARDS (PERIODE INI) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-blue-700">Total Omzet (Periode Ini)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-800">Rp {summary.totalOmzet.toLocaleString()}</div></CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-red-700">Total Pengeluaran</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-800">Rp {totalExpense.toLocaleString()}</div></CardContent>
        </Card>
        <Card className={netProfit >= 0 ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-700">Laba Bersih</CardTitle></CardHeader>
          <CardContent><div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-800' : 'text-orange-800'}`}>Rp {netProfit.toLocaleString()}</div></CardContent>
        </Card>
      </div>

      {/* 3. CHARTS SECTION (VISUALISASI DATA) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CHART 1: TREND OMZET */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp size={20}/> Tren Omzet Harian</CardTitle>
            <CardDescription>Grafik naik turun pendapatan di rentang tanggal terpilih.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartTrend}>
                <defs>
                  <linearGradient id="colorOmzet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{fontSize: 12}} />
                <YAxis tickFormatter={(value) => `${value/1000}k`} />
                <RechartsTooltip formatter={(value: any) => `Rp ${value.toLocaleString()}`} />
                <Area type="monotone" dataKey="omzet" stroke="#3b82f6" fillOpacity={1} fill="url(#colorOmzet)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* CHART 2: PRODUK BREAKDOWN */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShoppingBag size={20}/> Detail Produk Terjual</CardTitle>
            <CardDescription>Jumlah kuantitas per jenis item.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={chartProduct}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} />
                <RechartsTooltip />
                <Bar dataKey="qty" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* CHART 3: PAYMENT METHOD */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wallet size={20}/> Komposisi Pembayaran</CardTitle>
            <CardDescription>Proporsi jenis pembayaran (Cash vs Bon dll).</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartPayment} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {chartPayment.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS_PAYMENT[index % COLORS_PAYMENT.length]} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value: any) => `Rp ${value.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 4. TABEL DATA MENTAH */}
      <Tabs defaultValue="transaksi" className="w-full">
        <TabsList className="grid w-full md:w-[400px] grid-cols-3">
          <TabsTrigger value="transaksi">Data Transaksi</TabsTrigger>
          <TabsTrigger value="pengeluaran">Data Pengeluaran</TabsTrigger>
          <TabsTrigger value="meteran">Log Meteran</TabsTrigger>
        </TabsList>

        <TabsContent value="transaksi">
          <Card>
            <CardHeader className="flex flex-row justify-between">
              <CardTitle>Rincian Transaksi</CardTitle>
              <Button size="sm" variant="outline" onClick={() => downloadCSV(transactions, 'transaksi')}>
                <Download size={16} className="mr-2"/> Unduh CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs font-mono text-gray-500">
                        {new Date(tx.created_at).toLocaleDateString('id-ID')} <br/>
                        {new Date(tx.created_at).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{tx.notes || '-'}</div>
                        <Badge variant="secondary" className="text-[10px]">{tx.payment_type}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {tx.transaction_items.map((i: any, idx: number) => (
                          <div key={idx}>• {i.product_name} x{i.quantity}</div>
                        ))}
                      </TableCell>
                      <TableCell className="text-right font-bold">Rp {tx.total_amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pengeluaran">
          <Card>
            <CardHeader className="flex flex-row justify-between">
              <CardTitle>Rincian Pengeluaran</CardTitle>
              <Button size="sm" variant="outline" onClick={() => downloadCSV(expenses, 'pengeluaran')}>
                <Download size={16} className="mr-2"/> Unduh CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell className="text-xs font-mono">{exp.date}</TableCell>
                      <TableCell><Badge variant="destructive">{exp.category}</Badge></TableCell>
                      <TableCell>{exp.description}</TableCell>
                      <TableCell className="text-right font-bold text-red-600">Rp {exp.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meteran">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Angka Meter</TableHead>
                    <TableHead>Petugas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meterLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs font-mono">
                         {new Date(log.created_at).toLocaleDateString('id-ID')} <br/>
                         {new Date(log.created_at).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}
                      </TableCell>
                      <TableCell><Badge>{log.shift}</Badge></TableCell>
                      <TableCell className="font-bold text-lg">{log.meter_value}</TableCell>
                      <TableCell>{log.reported_by}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  )
}