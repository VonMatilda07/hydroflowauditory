"use client"

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertCircle, CreditCard, Check, Printer, TrendingDown, Users, Banknote } from 'lucide-react'

type DebtRecord = {
  customer_id: number | null
  customer_name: string
  total_debt: number
  transaction_count: number
  last_transaction_date: string
  transactions: any[]
}

export default function DebtTrackerPage() {
  const [loading, setLoading] = useState(false)
  const [debtRecords, setDebtRecords] = useState<DebtRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<DebtRecord | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchDebtData()
  }, [])

  const fetchDebtData = async () => {
    setLoading(true)
    try {
      // Fetch semua transaksi dengan status unpaid (Bon)
      const { data: unpaidTx, error } = await supabase
        .from('transactions')
        .select(`
          id,
          total_amount,
          created_at,
          notes,
          customer_id,
          transaction_items (product_name, quantity)
        `)
        .eq('status', 'unpaid')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Group by customer name
      const grouped: Record<string, DebtRecord> = {}

      unpaidTx?.forEach((tx: any) => {
        const customerName = tx.notes ? tx.notes.replace('Customer: ', '') : 'Pelanggan Tanpa Nama'
        
        if (!grouped[customerName]) {
          grouped[customerName] = {
            customer_id: tx.customer_id,
            customer_name: customerName,
            total_debt: 0,
            transaction_count: 0,
            last_transaction_date: tx.created_at,
            transactions: []
          }
        }

        grouped[customerName].total_debt += tx.total_amount
        grouped[customerName].transaction_count += 1
        grouped[customerName].transactions.push(tx)
        
        // Keep latest date
        if (new Date(tx.created_at) > new Date(grouped[customerName].last_transaction_date)) {
          grouped[customerName].last_transaction_date = tx.created_at
        }
      })

      // Convert to array dan sort by debt amount (terbesar dulu)
      const records = Object.values(grouped).sort((a, b) => b.total_debt - a.total_debt)
      setDebtRecords(records)
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsPaid = async (txIds: number[]) => {
    if (!confirm('Tandai transaksi ini sebagai LUNAS?')) return

    setLoading(true)
    try {
      for (const txId of txIds) {
        await supabase
          .from('transactions')
          .update({ status: 'paid' })
          .eq('id', txId)
      }

      alert('✅ Transaksi berhasil dilunasi!')
      setIsDetailOpen(false)
      fetchDebtData()
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    const content = printRef.current?.innerHTML
    if (!content) return

    const printWindow = window.open('', '', 'width=600,height=800')
    printWindow?.document.write(`
      <html>
        <head>
          <title>Laporan Hutang Pelanggan</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; margin-bottom: 10px; }
            .info { text-align: center; font-size: 12px; color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .total { background-color: #fff3cd; font-weight: bold; }
            .detail { font-size: 11px; margin: 5px 0; }
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

  const filteredRecords = debtRecords.filter(record =>
    record.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalDebt = filteredRecords.reduce((sum, r) => sum + r.total_debt, 0)

  return (
    <div className="space-y-6 pb-10">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-xl border border-red-200">
        <h1 className="text-3xl font-bold text-red-800 mb-2 flex items-center gap-2">
          <CreditCard className="text-red-600" /> Tracker Hutang Pelanggan
        </h1>
        <p className="text-red-700">Pantau list pelanggan yang masih punya cicilan/bon</p>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-orange-50 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-orange-700">Total Hutang</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-800">
              Rp {totalDebt.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-700">Jumlah Pelanggan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-800">{filteredRecords.length} Orang</div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-yellow-700">Total Transaksi Bon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-800">
              {filteredRecords.reduce((sum, r) => sum + r.transaction_count, 0)} Transaksi
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SEARCH & PRINT */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
        <div className="flex-1">
          <Label className="text-xs text-gray-600 font-bold">🔍 Cari Nama Pelanggan</Label>
          <Input
            placeholder="Ketik nama pelanggan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mt-2 h-9"
          />
        </div>
        <Button onClick={fetchDebtData} variant="outline" className="h-9 px-4">
          🔄 Refresh
        </Button>
        <Button onClick={handlePrint} className="h-9 bg-blue-600 hover:bg-blue-700 px-4 flex gap-2">
          <Printer size={16} /> Print
        </Button>
      </div>

      {/* TABLE HUTANG */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="text-red-600" size={20} />
            Daftar Pelanggan Hutang
          </CardTitle>
          <CardDescription>
            Klik nama pelanggan untuk melihat detail transaksi bon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Nama Pelanggan</TableHead>
                <TableHead className="text-right">Total Hutang</TableHead>
                <TableHead className="text-center">Jumlah Bon</TableHead>
                <TableHead>Terakhir</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                    {debtRecords.length === 0 ? 'Tidak ada hutang! 🎉' : 'Tidak ada hasil pencarian'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record, idx) => (
                  <TableRow key={idx} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="font-bold text-gray-800">{record.customer_name}</div>
                      <div className="text-xs text-gray-500">{record.transaction_count} transaksi bon</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-lg font-bold text-red-700">
                        Rp {record.total_debt.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="destructive">{record.transaction_count}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-gray-600 font-mono">
                        {new Date(record.last_transaction_date).toLocaleDateString('id-ID')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(record.last_transaction_date).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRecord(record)
                          setIsDetailOpen(true)
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        📋 Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* DETAIL MODAL */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Hutang - {selectedRecord?.customer_name}</DialogTitle>
          </DialogHeader>

          <div ref={printRef} className="space-y-4">
            {/* Summary */}
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700">Total Hutang:</span>
                <span className="text-2xl font-bold text-red-700">
                  Rp {selectedRecord?.total_debt.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Jumlah Bon:</span>
                <span className="font-bold">{selectedRecord?.transaction_count} transaksi</span>
              </div>
            </div>

            {/* Transaction List */}
            <div className="space-y-2">
              <h3 className="font-bold text-gray-800">Rincian Transaksi Bon:</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {selectedRecord?.transactions.map((tx: any, idx: number) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-mono text-xs text-gray-500">
                          {new Date(tx.created_at).toLocaleDateString('id-ID')}{' '}
                          {new Date(tx.created_at).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="text-sm text-gray-700 mt-1">
                          {tx.transaction_items?.map((item: any, i: number) => (
                            <div key={i} className="text-xs">
                              • {item.product_name} x{item.quantity}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-red-700">
                          Rp {tx.total_amount.toLocaleString()}
                        </div>
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          Bon
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              onClick={() =>
                handleMarkAsPaid(selectedRecord?.transactions.map((t: any) => t.id) || [])
              }
              className="w-full bg-green-600 hover:bg-green-700 flex gap-2"
              disabled={loading}
            >
              <Check size={16} /> Lunasin Semua
            </Button>
            <Button onClick={handlePrint} variant="outline" className="w-full flex gap-2">
              <Printer size={16} /> Print Detail
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
