"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Users, Plus, Search, MapPin, Phone, Edit, Trash2, Crown, Star } from 'lucide-react'

// Definisi Tipe Data Customer
type Customer = {
  id: number
  name: string
  phone: string
  address: string
  points: number
  is_member: boolean
}

export default function PelangganPage() {
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  
  // State Form (Modal)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' })

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    setLoading(true)
    // Ambil data pelanggan, urutkan dari yang poinnya paling banyak (Sultan)
    const { data } = await supabase
      .from('customers')
      .select('*')
      .order('points', { ascending: false })
    
    if (data) setCustomers(data)
    setLoading(false)
  }

  // Handle Simpan (Tambah Baru / Edit)
  const handleSave = async () => {
    if (!formData.name) return alert("Nama wajib diisi!")
    setLoading(true)

    try {
      const payload = {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        is_member: true // Default jadi member
      }

      if (editingId) {
        // Mode Edit
        await supabase.from('customers').update(payload).eq('id', editingId)
      } else {
        // Mode Tambah
        await supabase.from('customers').insert([payload])
      }

      setIsDialogOpen(false)
      resetForm()
      fetchCustomers() // Refresh tabel

    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle Hapus
  const handleDelete = async (id: number) => {
    if (!confirm('Hapus data pelanggan ini?')) return
    await supabase.from('customers').delete().eq('id', id)
    fetchCustomers()
  }

  const resetForm = () => {
    setEditingId(null)
    setFormData({ name: '', phone: '', address: '' })
  }

  const openEdit = (c: Customer) => {
    setEditingId(c.id)
    setFormData({ name: c.name, phone: c.phone, address: c.address })
    setIsDialogOpen(true)
  }

  // Logic Pencarian (Filter di Client Side aja biar cepet)
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm))
  )

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8 pb-20">
      
      {/* HEADER PAGE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="text-blue-600"/> Manajemen Pelanggan
          </h1>
          <p className="text-gray-500">Database member & tracking loyalty poin.</p>
        </div>
        
        {/* TOMBOL TAMBAH (+ MODAL) */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-900/20">
              <Plus size={16} className="mr-2"/> Pelanggan Baru
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
               <div className="space-y-2">
                 <Label>Nama Lengkap</Label>
                 <Input placeholder="Contoh: Pak Budi Santoso" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
               </div>
               <div className="space-y-2">
                 <Label>No. WhatsApp / HP</Label>
                 <Input type="tel" placeholder="0812..." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
               </div>
               <div className="space-y-2">
                 <Label>Alamat Lengkap</Label>
                 <Input placeholder="Jl. Mawar No. 10" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
               </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave} disabled={loading} className="w-full">
                {loading ? 'Menyimpan...' : 'Simpan Data'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* STATISTIK RINGKAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         {/* KARTU SULTAN (POIN TERTINGGI) */}
         <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-yellow-700 flex items-center gap-2">
                <Crown size={16} className="fill-yellow-600"/> Top Loyal Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
               <div className="text-xl font-bold text-gray-800">{customers[0]?.name || '-'}</div>
               <p className="text-xs text-gray-500">{customers[0]?.points || 0} Poin Terkumpul</p>
            </CardContent>
         </Card>
         
         {/* KARTU TOTAL MEMBER */}
         <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-blue-700 flex items-center gap-2">
                <Users size={16}/> Total Member
              </CardTitle>
            </CardHeader>
            <CardContent>
               <div className="text-xl font-bold text-gray-800">{customers.length} Orang</div>
               <p className="text-xs text-gray-500">Aktif berbelanja</p>
            </CardContent>
         </Card>
      </div>

      {/* TABEL PELANGGAN */}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Daftar Member</CardTitle>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Cari nama atau no hp..." 
              className="pl-8" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Pelanggan</TableHead>
                <TableHead>Kontak & Alamat</TableHead>
                <TableHead>Loyalty Poin</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-400">
                    Tidak ada data ditemukan
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-bold flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 border">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          {c.name}
                          {c.is_member && <Badge variant="secondary" className="ml-2 text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-200">Member</Badge>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-2 text-gray-600"><Phone size={12}/> {c.phone || '-'}</div>
                        <div className="flex items-center gap-2 text-gray-400 text-xs"><MapPin size={12}/> {c.address || '-'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 font-bold text-yellow-700 bg-yellow-50 w-fit px-2 py-1 rounded-full text-xs border border-yellow-200">
                        <Star size={12} className="fill-yellow-500 text-yellow-500"/> {c.points} Poin
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)} className="hover:bg-blue-50 text-blue-600">
                        <Edit size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="hover:bg-red-50 text-red-600">
                        <Trash2 size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  )
}