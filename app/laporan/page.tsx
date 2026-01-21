"use client"

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts'
import { Download, TrendingUp, Wallet, ShoppingBag, FileImage, RefreshCw, Printer, CheckCircle, Clock } from 'lucide-react'

// Warna Chart
const COLORS_PAYMENT = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

export default function LaporanPage() {
  const [loading, setLoading] = useState(false)
  
  // Filter Tanggal
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0])
  
  // Data State
  const [transactions, setTransactions] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [meterLogs, setMeterLogs] = useState<any[]>([])

  // Chart State
  const [chartTrend, setChartTrend] = useState<any[]>([])
  const [chartProduct, setChartProduct] = useState<any[]>([])
  const [chartPayment, setChartPayment] = useState<any[]>([])

  // Summary State
  const [summary, setSummary] = useState({ totalOmzet: 0, totalExpense: 0, netProfit: 0, totalTx: 0 })

  // --- STATE BARU BUAT CETAK & LUNASIN ---
  const [selectedTx, setSelectedTx] = useState<any | null>(null) // Transaksi yg lagi dilihat
  const [isDetailOpen, setIsDetailOpen] = useState(false) // Buka tutup modal detail
  const printRef = useRef<HTMLDivElement>(null) // Ref buat area cetak

  useEffect(() => {
    fetchData()
  }, [startDate, endDate])

  const setPreset = (type: 'today' | 'week' | 'month') => {
    const t = new Date()
    const strToday = t.toISOString().split('T')[0]
    if (type === 'today') { setStartDate(strToday); setEndDate(strToday); }
    else if (type === 'week') { 
      const d = new Date(t); d.setDate(d.getDate() - 7); 
      setStartDate(d.toISOString().split('T')[0]); setEndDate(strToday); 
    }
    else if (type === 'month') { 
      const d = new Date(t.getFullYear(), t.getMonth(), 1); 
      setStartDate(d.toISOString().split('T')[0]); setEndDate(strToday); 
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Fetch Transaksi
      const { data: txs } = await supabase
        .from('transactions')
        .select(`*, transaction_items (product_name, quantity, price_at_transaction)`)
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`)
        .order('created_at', { ascending: true }) 

      if (txs) {
        setTransactions([...txs].reverse()) 
        processCharts(txs)
      }

      // 2. Fetch Pengeluaran
      const { data: exps } = await supabase
        .from('expenses')
        .select('*')
        .gte('date', startDate).lte('date', endDate).order('date', { ascending: false })
      if (exps) setExpenses(exps)

      // 3. Fetch Meteran
      const { data: meters } = await supabase
        .from('meter_readings')
        .select('*')
        .gte('created_at', `${startDate}T00:00:00`).lte('created_at', `${endDate}T23:59:59`)
        .order('created_at', { ascending: false })
      if (meters) setMeterLogs(meters)

    } catch (e) { console.error(e) } 
    finally { setLoading(false) }
  }

  const processCharts = (data: any[]) => {
    let omzet = 0
    // Chart 1: Trend
    const trendMap: Record<string, number> = {}
    data.forEach(t => {
      // Hanya hitung omzet kalau statusnya PAID (Lunas)
      if (t.status === 'paid') {
        omzet += t.total_amount
        const date = new Date(t.created_at).toLocaleDateString('id-ID', {day: '2-digit', month: 'short'})
        trendMap[date] = (trendMap[date] || 0) + t.total_amount
      }
    })
    setChartTrend(Object.keys(trendMap).map(k => ({ date: k, omzet: trendMap[k] })))

    // Chart 2: Product & Payment (Tetap hitung semua biar tau volume penjualan walau bon)
    const prodMap: Record<string, number> = {}
    const payMap: Record<string, number> = {}
    
    data.forEach(t => {
      t.transaction_items.forEach((item: any) => prodMap[item.product_name] = (prodMap[item.product_name] || 0) + item.quantity)
      const type = t.payment_type || 'Lainnya'
      payMap[type] = (payMap[type] || 0) + t.total_amount
    })

    setChartProduct(Object.keys(prodMap).map(k => ({ name: k, qty: prodMap[k] })).sort((a, b) => b.qty - a.qty))
    setChartPayment(Object.keys(payMap).map(k => ({ name: k, value: payMap[k] })))
    setSummary(prev => ({ ...prev, totalOmzet: omzet, totalTx: data.length }))
  }

  const totalExpense = expenses.reduce((a, b) => a + b.amount, 0)
  const netProfit = summary.totalOmzet - totalExpense

  const downloadCSV = (data: any[], filename: string) => {
    if (!data.length) return alert('Data kosong')
    const headers = Object.keys(data[0]).join(",")
    const rows = data.map(obj => Object.values(obj).map(v => `"${v}"`).join(",")).join("\n")
    const blob = new Blob([headers + "\n" + rows], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${filename}_${startDate}.csv`; a.click()
  }

  // --- FITUR BARU: PRINT & LUNASIN ---

  const handleOpenDetail = (tx: any) => {
    setSelectedTx(tx)
    setIsDetailOpen(true)
  }

  const handlePrint = () => {
    // Trik print khusus area receipt
    const content = printRef.current?.innerHTML
    if (!content) return
    
    const printWindow = window.open('', '', 'width=400,height=600')
    printWindow?.document.write(`
      <html>
        <head>
          <title>Cetak Nota</title>
          <style>
            body { font-family: monospace; font-size: 12px; text-align: center; padding: 20px; }
            .line { border-bottom: 1px dashed #000; margin: 10px 0; }
            .flex { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .mt { margin-top: 10px; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `)
    printWindow?.document.close()
    printWindow?.focus()
    printWindow?.print()
    printWindow?.close()
  }

  const handleLunasin = async () => {
    if (!selectedTx) return
    if (!confirm('Tandai transaksi ini sebagai LUNAS?')) return

    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'paid', payment_type: 'Tunai (Lunas)' }) // Update jadi lunas
        .eq('id', selectedTx.id)

      if (error) throw error

      alert('✅ Transaksi berhasil dilunasi!')
      setIsDetailOpen(false)
      fetchData() // Refresh data
    } catch (e: any) {
      alert('Gagal update: ' + e.message)
    }
  }

  return (
    <div className="space-y-8 pb-10">
      
      {/* FILTER AREA */}
      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Laporan Detail</h1>
            <p className="text-gray-500">Analisa omzet, pengeluaran & cetak nota.</p>
          </div>
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <Button variant="ghost" size="sm" onClick={() => setPreset('today')}>Hari Ini</Button>
            <Button variant="ghost" size="sm" onClick={() => setPreset('week')}>Minggu Ini</Button>
            <Button variant="ghost" size="sm" onClick={() => setPreset('month')}>Bulan Ini</Button>
            <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw size={14}/></Button>
          </div>
        </div>
        <div className="flex items-center gap-4 border-t pt-4">
           <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 w-auto"/>
           <span className="text-gray-400">-</span>
           <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 w-auto"/>
           <Button onClick={fetchData} className="bg-blue-600 h-9 px-6">Terapkan</Button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-blue-700">Omzet Tunai (Lunas)</CardTitle></CardHeader>
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

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp size={20}/> Tren Omzet Tunai</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{fontSize: 12}} />
                <YAxis tickFormatter={(value) => `${value/1000}k`} />
                <RechartsTooltip formatter={(value: any) => `Rp ${value.toLocaleString()}`} />
                <Area type="monotone" dataKey="omzet" stroke="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingBag size={20}/> Produk Terlaris</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={chartProduct}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} />
                <RechartsTooltip />
                <Bar dataKey="qty" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Wallet size={20}/> Metode Bayar</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartPayment} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {chartPayment.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_PAYMENT[index % COLORS_PAYMENT.length]} />)}
                </Pie>
                <RechartsTooltip formatter={(value: any) => `Rp ${value.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* TABS DATA DETAIL */}
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
                <Download size={16} className="mr-2"/> CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Detail</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
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
                        <div className="text-xs text-gray-600 mb-1">
                          {tx.transaction_items.map((i: any, idx: number) => (
                            <span key={idx}>• {i.product_name} x{i.quantity} </span>
                          ))}
                        </div>
                        <Badge variant="secondary" className="text-[10px]">{tx.payment_type}</Badge>
                        {tx.notes && <span className="text-[10px] ml-2 text-gray-400">({tx.notes})</span>}
                      </TableCell>
                      <TableCell>
                         {tx.status === 'paid' ? (
                           <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Lunas</Badge>
                         ) : (
                           <Badge variant="destructive">Belum Lunas</Badge>
                         )}
                      </TableCell>
                      <TableCell className="text-right font-bold">Rp {tx.total_amount.toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenDetail(tx)}>
                          <Printer size={16} className="text-blue-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pengeluaran">
          {/* ... (Bagian Pengeluaran Tetap Sama) ... */}
           <Card>
            <CardHeader className="flex flex-row justify-between">
              <CardTitle>Rincian Pengeluaran</CardTitle>
              <Button size="sm" variant="outline" onClick={() => downloadCSV(expenses, 'pengeluaran')}>
                <Download size={16} className="mr-2"/> CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Ket</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell className="text-xs font-mono">{exp.date}</TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="mr-2">{exp.category}</Badge>
                        <span className="text-sm">{exp.description}</span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-600">Rp {exp.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meteran">
          {/* ... (Bagian Meteran Tetap Sama) ... */}
           <Card>
            <CardHeader>
              <CardTitle>Log Audit Meteran (BIO & RO)</CardTitle>
              <CardDescription>Klik tombol foto untuk melihat bukti fisik.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu & Shift</TableHead>
                    <TableHead className="text-blue-600">Meteran BIO</TableHead>
                    <TableHead className="text-purple-600">Meteran RO</TableHead>
                    <TableHead>Bukti</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meterLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                         <div className="text-xs font-mono text-gray-500">
                           {new Date(log.created_at).toLocaleDateString('id-ID')}
                           <br/>
                           {new Date(log.created_at).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}
                         </div>
                         <Badge variant="outline" className="mt-1">{log.shift}</Badge>
                      </TableCell>
                      <TableCell className="font-mono font-bold text-blue-700 text-lg">
                        {log.meter_bio?.toLocaleString('id-ID') || '-'}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-purple-700 text-lg">
                        {log.meter_ro?.toLocaleString('id-ID') || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                           {log.image_url && <a href={log.image_url} target="_blank"><Button size="sm" variant="outline" className="h-8"><FileImage size={14} className="mr-1"/> Bio</Button></a>}
                           {log.image_url_ro && <a href={log.image_url_ro} target="_blank"><Button size="sm" variant="outline" className="h-8"><FileImage size={14} className="mr-1"/> RO</Button></a>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* --- MODAL DETAIL & CETAK --- */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>
          </DialogHeader>

          {/* AREA NOTA THERMAL (Hidden di UI, Muncul pas Print) */}
          <div className="border p-4 bg-gray-50 rounded text-sm font-mono space-y-2">
             <div ref={printRef}>
                {/* Header */}
                <div className="text-center mb-3">
                   <h2 className="font-bold text-base" style={{letterSpacing: '0.05em'}}>DEPO ASYIFA</h2>
                   <p className="text-xs text-gray-600">Penyedia Air Minum & Sistem RO</p>
                   <div style={{borderTop: '2px solid #000', margin: '8px 0'}}></div>
                </div>

                {/* Receipt Info */}
                <div className="text-xs mb-3 space-y-1">
                   <div className="flex justify-between">
                      <span className="text-gray-600">No. Struk:</span>
                      <span className="font-bold">{selectedTx?.id ? String(selectedTx.id).slice(0, 8).toUpperCase() : 'N/A'}</span>
                   </div>
                   <div className="flex justify-between">
                      <span className="text-gray-600">Tanggal:</span>
                      <span>{selectedTx?.created_at ? new Date(selectedTx.created_at).toLocaleDateString('id-ID', {day: '2-digit', month: '2-digit', year: 'numeric'}) : '-'}</span>
                   </div>
                   <div className="flex justify-between">
                      <span className="text-gray-600">Jam:</span>
                      <span>{selectedTx?.created_at ? new Date(selectedTx.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit', hour12: false}) : '-'}</span>
                   </div>
                   <div style={{borderTop: '1px dashed #999', margin: '8px 0'}}></div>
                </div>

                {/* Items */}
                <div className="text-xs space-y-1 mb-2">
                   <div className="flex justify-between font-bold pb-1" style={{borderBottom: '1px solid #ccc'}}>
                      <span>ITEM</span>
                      <span>HARGA</span>
                   </div>
                   {selectedTx?.transaction_items.map((item: any, i: number) => (
                     <div key={i}>
                        <div className="flex justify-between">
                           <span>{item.product_name}</span>
                           <span>x{item.quantity}</span>
                        </div>
                        <div className="flex justify-between text-right">
                           <span className="text-gray-600">{item.quantity} × Rp {item.price_at_transaction?.toLocaleString()}</span>
                           <span className="font-bold">Rp {(item.price_at_transaction * item.quantity)?.toLocaleString()}</span>
                        </div>
                     </div>
                   ))}
                </div>

                {/* Total */}
                <div style={{borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '8px 0', margin: '8px 0'}} className="text-xs">
                   <div className="flex justify-between font-bold text-base">
                      <span>TOTAL:</span>
                      <span>Rp {selectedTx?.total_amount?.toLocaleString()}</span>
                   </div>
                </div>

                {/* Payment Method & Status */}
                <div className="text-xs space-y-1 mb-3">
                   <div className="flex justify-between">
                      <span className="text-gray-600">Metode Bayar:</span>
                      <span className="font-bold">{selectedTx?.payment_type || 'Tunai'}</span>
                   </div>
                   <div className="flex justify-between font-bold">
                      <span className="text-gray-600">Status:</span>
                      <span className={selectedTx?.status === 'paid' ? 'text-green-700' : 'text-red-700'}>
                         {selectedTx?.status === 'paid' ? '✓ LUNAS' : '⊘ BELUM LUNAS (BON)'}
                      </span>
                   </div>
                </div>

                {/* Footer */}
                <div style={{borderTop: '1px dashed #999', paddingTop: '8px'}} className="text-center text-xs">
                   <p className="font-bold">Terima Kasih!</p>
                   <p className="text-gray-600 mt-1">Barang yg sudah dibeli tidak dapat dikembalikan</p>
                   <p className="text-gray-500 text-[10px] mt-2">Depo Asyifa © 2025</p>
                </div>
             </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={handlePrint} className="w-full bg-gray-800 flex gap-2">
               <Printer size={16}/> Cetak Nota (Thermal)
            </Button>
            
            {/* TOMBOL LUNASIN (Cuma muncul kalo status unpaid) */}
            {selectedTx?.status !== 'paid' && (
               <Button onClick={handleLunasin} className="w-full bg-green-600 hover:bg-green-700 flex gap-2">
                 <CheckCircle size={16}/> Lunasin Sekarang
               </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}