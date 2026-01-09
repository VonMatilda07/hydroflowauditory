"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Pencil, UserCircle } from 'lucide-react'

export default function SettingsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // State untuk Edit Produk
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('id')
    if (data) setProducts(data)
  }

  // --- FUNGSI UPDATE PRODUK ---
  const handleUpdateProduct = async () => {
    if (!editingProduct) return
    setLoading(true)

    try {
      const { error } = await supabase
        .from('products')
        .update({
          name: editingProduct.name,
          price: parseInt(editingProduct.price),
          water_usage_liter: parseFloat(editingProduct.water_usage_liter)
        })
        .eq('id', editingProduct.id)

      if (error) throw error
      
      alert('✅ Produk berhasil diupdate!')
      setIsOpen(false)
      fetchProducts()
    } catch (error: any) {
      alert('Gagal update: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // --- FUNGSI RESET DATA (DATA KIAMAT) ---
  const handleResetData = async () => {
    // 1. Konfirmasi Pertama
    const isConfirmed = confirm("⚠️ PERINGATAN KERAS ⚠️\n\nApakah Anda yakin ingin MENGHAPUS SEMUA DATA transaksi, laporan, dan audit?\n\nData yang hilang tidak bisa dikembalikan!")
    if (!isConfirmed) return

    // 2. Konfirmasi Kedua (Biar gak salah klik)
    const secondConfirm = confirm("Yakin 100%? Klik OK untuk menghapus bersih database.")
    if (!secondConfirm) return

    setLoading(true)
    try {
      // Hapus data secara berurutan (Anak dulu baru Induk biar ga error Foreign Key)
      
      // 1. Hapus Item Transaksi
      const { error: err1 } = await supabase.from('transaction_items').delete().neq('id', 0)
      if (err1) throw err1

      // 2. Hapus Transaksi Utama
      const { error: err2 } = await supabase.from('transactions').delete().neq('id', 0)
      if (err2) throw err2

      // 3. Hapus Pengeluaran
      const { error: err3 } = await supabase.from('expenses').delete().neq('id', 0)
      if (err3) throw err3

      // 4. Hapus Log Meteran
      const { error: err4 } = await supabase.from('meter_readings').delete().neq('id', 0)
      if (err4) throw err4

      alert('♻️ SUKSES! Aplikasi kembali bersih seperti baru.')
      window.location.reload() // Refresh halaman biar data kosong

    } catch (error: any) {
      console.error('Gagal reset:', error)
      alert('Gagal reset data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gray-100 rounded-full">
          <UserCircle size={40} className="text-gray-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Pengaturan Toko</h1>
          <p className="text-gray-500">Kelola produk dan profil depot.</p>
        </div>
      </div>

      {/* 1. MANAJEMEN PRODUK */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Produk & Harga</CardTitle>
          <CardDescription>Klik tombol edit untuk mengubah harga atau nama produk.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Produk</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Penggunaan Air (L)</TableHead>
                <TableHead>Harga (Rp)</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>{product.water_usage_liter} Liter</TableCell>
                  <TableCell>Rp {product.price.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    
                    {/* TOMBOL EDIT POPUP */}
                    <Dialog open={isOpen && editingProduct?.id === product.id} onOpenChange={(open) => {
                      setIsOpen(open)
                      if (open) setEditingProduct(product)
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="hover:bg-blue-50 text-blue-600">
                          <Pencil size={16} /> Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Produk: {product.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Nama Produk</Label>
                            <Input 
                              value={editingProduct?.name || ''} 
                              onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Harga (Rp)</Label>
                            <Input 
                              type="number"
                              value={editingProduct?.price || 0} 
                              onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Penggunaan Air per Item (Liter)</Label>
                            <Input 
                              type="number"
                              value={editingProduct?.water_usage_liter || 0} 
                              onChange={(e) => setEditingProduct({...editingProduct, water_usage_liter: e.target.value})}
                            />
                            <p className="text-xs text-gray-500">Isi 0 jika produk tidak menggunakan air (misal: Tisu)</p>
                          </div>
                          <Button className="w-full bg-blue-600" onClick={handleUpdateProduct} disabled={loading}>
                            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 2. ZONA BAHAYA */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>Hati-hati, aksi di sini tidak bisa dibatalkan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-red-100 bg-red-50 rounded-lg">
            <div>
              <h4 className="font-bold text-red-700">Reset Database Transaksi</h4>
              <p className="text-sm text-red-600">Hapus semua riwayat penjualan, pengeluaran, dan audit.</p>
            </div>
            
            {/* TOMBOL RESET AKTIF */}
            <Button variant="destructive" onClick={handleResetData} disabled={loading}>
              {loading ? 'Menghapus...' : 'Reset Data'}
            </Button>
            
          </div>
        </CardContent>
      </Card>

    </div>
  )
}