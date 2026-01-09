"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Pencil, Save, Trash2, UserCircle } from 'lucide-react'

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

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gray-100 rounded-full">
          <UserCircle size={40} className="text-gray-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Pengaturan Toko</h1>
          <p className="text-gray-500">Kelola produk dan profil depot.</p>
        </div>
      </div>

      {/* 1. MANAJEMEN PRODUK (FITUR SULTAN) */}
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
                    
                    {/* TOMBOL EDIT POPUP (DIALOG) */}
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
              <p className="text-sm text-red-600">Hapus semua riwayat penjualan (Kembali ke 0).</p>
            </div>
            <Button variant="destructive" onClick={() => alert('Fitur ini dimatikan demi keamanan Demo!')}>
              Reset Data
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}