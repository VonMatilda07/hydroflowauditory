"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TrendingDown, Trash2, PlusCircle } from 'lucide-react'

// Tipe data buat tabel
type Expense = {
  id: number
  category: string
  amount: number
  description: string
  date: string
}

export default function PengeluaranPage() {
  const [loading, setLoading] = useState(false)
  const [expenses, setExpenses] = useState<Expense[]>([])
  
  // State Form
  const [formData, setFormData] = useState({
    category: 'Operasional',
    amount: '',
    description: ''
  })

  // 1. Ambil Data Pengeluaran Hari Ini
  const fetchExpenses = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('date', today)
      .order('created_at', { ascending: false })
    
    if (data) setExpenses(data)
  }

  useEffect(() => {
    fetchExpenses()
  }, [])

  // 2. Fungsi Simpan
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.from('expenses').insert([
        {
          category: formData.category,
          amount: parseFloat(formData.amount),
          description: formData.description,
          date: new Date().toISOString().split('T')[0] // Set tanggal hari ini
        }
      ])

      if (error) throw error

      alert('✅ Pengeluaran dicatat!')
      setFormData({ category: 'Operasional', amount: '', description: '' }) // Reset form
      fetchExpenses() // Refresh tabel bawah

    } catch (error: any) {
      alert('Gagal: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // 3. Fungsi Hapus (Kalau salah input)
  const handleDelete = async (id: number) => {
    if (!confirm('Yakin mau hapus catatan ini?')) return
    
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (!error) fetchExpenses()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* JUDUL */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-red-100 text-red-600 rounded-lg">
          <TrendingDown size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Catat Pengeluaran</h1>
          <p className="text-gray-500">Jangan sampai boncos, catat setiap sen!</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* KIRI: Form Input */}
        <Card className="shadow-lg border-t-4 border-t-red-500">
          <CardHeader>
            <CardTitle>Input Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="space-y-2">
                <Label>Kategori</Label>
                <select 
                  className="w-full p-2 border rounded-md bg-white"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="Operasional">🛠️ Operasional (Tisu, Sabun, dll)</option>
                  <option value="Bensin">⛽ Bensin / Transport</option>
                  <option value="Makan">🍛 Uang Makan Karyawan</option>
                  <option value="Restock">📦 Kulakan / Restock Barang</option>
                  <option value="Maintenance">🔧 Service / Ganti Filter</option>
                  <option value="Gaji">💰 Gaji / Upah</option>
                  <option value="Lainnya">📝 Lainnya</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Nominal (Rp)</Label>
                <Input 
                  type="number" 
                  placeholder="Contoh: 15000" 
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label>Keterangan</Label>
                <Input 
                  placeholder="Contoh: Beli bensin motor Tossa" 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <Button className="w-full bg-red-600 hover:bg-red-700" disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan Pengeluaran'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* KANAN: Riwayat Hari Ini */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Pengeluaran Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Belum ada pengeluaran hari ini. Hemat pangkal kaya! 🤑</p>
            ) : (
              <div className="space-y-4">
                {expenses.map((item) => (
                  <div key={item.id} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <p className="font-bold text-gray-800">{item.category}</p>
                      <p className="text-xs text-gray-500">{item.description || '-'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-red-600 font-semibold">
                        -Rp {item.amount.toLocaleString()}
                      </span>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Total Kecil di Bawah */}
                <div className="pt-4 mt-4 border-t flex justify-between items-center">
                  <span className="font-bold">Total Hari Ini:</span>
                  <span className="text-xl font-bold text-red-600">
                    Rp {expenses.reduce((a, b) => a + b.amount, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}