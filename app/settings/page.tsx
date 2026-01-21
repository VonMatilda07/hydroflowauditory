"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js' // Kita butuh ini buat hack 'Add User'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus, Edit, AlertTriangle, Droplets, Moon, Sun, UserPlus, Shield, User } from 'lucide-react'

// --- TIPE DATA ---
type Product = {
  id: number
  name: string
  price: number
  category: string
  source_type: 'BIO' | 'RO' | 'NONE'
  liters: number
}

type UserProfile = {
  id: string
  full_name: string
  email: string
  role: 'superadmin' | 'admin' | 'karyawan'
}

export default function PengaturanPage() {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("produk")
  
  // State Dark Mode
  const [isDarkMode, setIsDarkMode] = useState(false)

  // State Produk
  const [products, setProducts] = useState<Product[]>([])
  const [prodDialog, setProdDialog] = useState(false)
  const [editingProdId, setEditingProdId] = useState<number | null>(null)
  const [prodForm, setProdForm] = useState({ name: '', price: '', category: 'refill', source_type: 'BIO', liters: '19' })

  // State User Management
  const [users, setUsers] = useState<UserProfile[]>([])
  const [userDialog, setUserDialog] = useState(false)
  const [userForm, setUserForm] = useState({ email: '', password: '', fullName: '', role: 'karyawan' })

  useEffect(() => {
    fetchProducts()
    fetchUsers()
    
    // Cek Dark Mode saat load
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true)
      document.documentElement.classList.add('dark')
    } else {
      setIsDarkMode(false)
      document.documentElement.classList.remove('dark')
    }
  }, [])

  // --- LOGIC DARK MODE ---
  const toggleDarkMode = (checked: boolean) => {
    setIsDarkMode(checked)
    if (checked) {
      document.documentElement.classList.add('dark')
      localStorage.theme = 'dark'
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.theme = 'light'
    }
  }

  // --- FETCH DATA ---
  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('id', { ascending: true })
    if (data) setProducts(data as any[])
  }

  const fetchUsers = async () => {
    // Ambil semua profil user
    const { data } = await supabase.from('profiles').select('*').order('full_name', { ascending: true })
    if (data) setUsers(data as any[])
  }

  // --- LOGIC PRODUK (Sama kayak sebelumnya) ---
  const handleSaveProduct = async () => {
    if (!prodForm.name || !prodForm.price) return alert("Nama & Harga wajib diisi!")
    setLoading(true)
    try {
      const payload = {
        name: prodForm.name,
        price: parseInt(prodForm.price),
        category: prodForm.category,
        source_type: prodForm.source_type,
        liters: parseFloat(prodForm.liters) || 0
      }
      if (editingProdId) {
        await supabase.from('products').update(payload).eq('id', editingProdId)
      } else {
        await supabase.from('products').insert([payload])
      }
      await fetchProducts()
      setProdDialog(false)
      setProdForm({ name: '', price: '', category: 'refill', source_type: 'BIO', liters: '19' })
      setEditingProdId(null)
    } catch (e: any) { alert(e.message) }
    setLoading(false)
  }

  const handleDeleteProduct = async (id: number) => {
    if (confirm('Hapus produk ini?')) {
      await supabase.from('products').delete().eq('id', id)
      fetchProducts()
    }
  }

  // --- LOGIC USER MANAGEMENT (SUPERADMIN FITUR) ---
  
  // 1. Tambah User Baru
  const handleAddUser = async () => {
    if (!userForm.email || !userForm.password || !userForm.fullName) return alert("Semua data wajib diisi!")
    setLoading(true)

    try {
      // TRIK: Bikin client sementara biar ga logout sesi Superadmin saat create user baru
      const tempSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } } // PENTING: Jangan simpan sesi
      )

      // 1. Buat Akun di Auth
      const { data, error } = await tempSupabase.auth.signUp({
        email: userForm.email,
        password: userForm.password,
        options: {
          data: { full_name: userForm.fullName } // Metadata nama
        }
      })

      if (error) throw error
      if (!data.user) throw new Error("Gagal membuat user")

      // 2. Update Role di tabel Profiles (karena defaultnya 'karyawan')
      // Kita pake client utama (Superadmin) buat update ini karena punya hak akses
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ role: userForm.role }) // Set role sesuai pilihan
        .eq('id', data.user.id)

      if (roleError) throw roleError

      alert(`✅ User ${userForm.fullName} berhasil dibuat sebagai ${userForm.role}!`)
      setUserDialog(false)
      setUserForm({ email: '', password: '', fullName: '', role: 'karyawan' })
      fetchUsers() // Refresh tabel

    } catch (error: any) {
      console.error(error)
      alert('Gagal: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // 2. Edit Role User Lama
  const handleUpdateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    if (error) alert("Gagal update role")
    else {
      // Update state lokal biar cepet
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as any } : u))
    }
  }

  // --- LOGIC RESET ---
  const handleResetData = async () => {
    const confirmText = prompt("Ketik 'RESET' untuk menghapus SEMUA data transaksi & meteran:")
    if (confirmText === 'RESET') {
       setLoading(true)
       await supabase.from('transaction_items').delete().neq('id', 0)
       await supabase.from('transactions').delete().neq('id', 0)
       await supabase.from('meter_readings').delete().neq('id', 0)
       await supabase.from('expenses').delete().neq('id', 0)
       alert('Data berhasil di-reset jadi 0!')
       setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4 pb-20 transition-colors duration-300">
      
      {/* HEADER & DARK MODE TOGGLE */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Pengaturan Sistem</h1>
        
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-full px-4 border border-gray-200 dark:border-gray-700">
          {isDarkMode ? <Moon size={18} className="text-blue-400" /> : <Sun size={18} className="text-orange-500" />}
          <Label htmlFor="dark-mode" className="text-sm font-medium cursor-pointer dark:text-gray-200">
             {isDarkMode ? 'Mode Gelap' : 'Mode Terang'}
          </Label>
          <Switch id="dark-mode" checked={isDarkMode} onCheckedChange={toggleDarkMode} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-gray-100 dark:bg-gray-800">
          <TabsTrigger value="produk">📦 Produk & Harga</TabsTrigger>
          <TabsTrigger value="users">👥 Manajemen User</TabsTrigger>
          <TabsTrigger value="system">⚠️ System & Reset</TabsTrigger>
        </TabsList>

        {/* --- TAB 1: PRODUK --- */}
        <TabsContent value="produk">
          <Card className="dark:bg-gray-900 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="dark:text-white">Daftar Produk</CardTitle>
                <CardDescription>Atur harga dan takaran air.</CardDescription>
              </div>
              <Dialog open={prodDialog} onOpenChange={setProdDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingProdId(null); setProdForm({name:'', price:'', category:'refill', source_type:'BIO', liters:'19'}) }}>
                    <Plus size={16} className="mr-2"/> Tambah
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingProdId ? 'Edit' : 'Tambah'} Produk</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <Input placeholder="Nama Produk" value={prodForm.name} onChange={e => setProdForm({...prodForm, name: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input type="number" placeholder="Harga (Rp)" value={prodForm.price} onChange={e => setProdForm({...prodForm, price: e.target.value})} />
                        <Input type="number" placeholder="Liter" value={prodForm.liters} onChange={e => setProdForm({...prodForm, liters: e.target.value})} />
                    </div>
                    <Select value={prodForm.source_type} onValueChange={(v) => setProdForm({...prodForm, source_type: v as any})}>
                      <SelectTrigger><SelectValue placeholder="Sumber Air" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BIO">BIO</SelectItem><SelectItem value="RO">RO</SelectItem><SelectItem value="NONE">Bukan Air</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter><Button onClick={handleSaveProduct} disabled={loading}>Simpan</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead><TableHead>Harga</TableHead><TableHead>Liter</TableHead><TableHead>Sumber</TableHead><TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id} className="dark:hover:bg-gray-800">
                      <TableCell className="font-medium dark:text-gray-200">{p.name}</TableCell>
                      <TableCell className="dark:text-gray-300">Rp {p.price.toLocaleString()}</TableCell>
                      <TableCell className="dark:text-gray-300">{p.liters} L</TableCell>
                      <TableCell><Badge variant="outline">{p.source_type}</Badge></TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="icon" variant="ghost" onClick={() => { setEditingProdId(p.id); setProdForm({name: p.name, price: String(p.price), category: p.category, source_type: p.source_type, liters: String(p.liters)}); setProdDialog(true); }}><Edit size={14} /></Button>
                        <Button size="icon" variant="ghost" className="text-red-500" onClick={() => handleDeleteProduct(p.id)}><Trash2 size={14} /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB 2: MANAJEMEN USER (BARU!) --- */}
        <TabsContent value="users">
          <Card className="dark:bg-gray-900 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="dark:text-white flex items-center gap-2"><Shield size={20} className="text-purple-600"/> Manajemen Akses</CardTitle>
                <CardDescription>Tambah karyawan atau ubah jabatan.</CardDescription>
              </div>
              
              {/* MODAL TAMBAH USER */}
              <Dialog open={userDialog} onOpenChange={setUserDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <UserPlus size={16} className="mr-2"/> User Baru
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Buat Akun Karyawan/Admin</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nama Lengkap</Label>
                      <Input placeholder="Contoh: Budi Santoso" value={userForm.fullName} onChange={e => setUserForm({...userForm, fullName: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Login</Label>
                      <Input type="email" placeholder="budi@hydroflow.com" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input type="password" placeholder="Minimal 6 karakter" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-purple-600 font-bold">Jabatan / Role</Label>
                      <Select value={userForm.role} onValueChange={(v) => setUserForm({...userForm, role: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="karyawan">👮 Karyawan (Kasir & Meteran)</SelectItem>
                          <SelectItem value="admin">🤵 Admin (Laporan & Stok)</SelectItem>
                          <SelectItem value="superadmin">👑 Superadmin (God Mode)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddUser} disabled={loading} className="w-full bg-purple-600">
                      {loading ? 'Membuat Akun...' : 'Buat User Baru'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Jabatan (Role)</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className="dark:hover:bg-gray-800">
                      <TableCell className="font-bold flex items-center gap-2 dark:text-gray-200">
                         <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full"><User size={14}/></div>
                         {u.full_name || 'Tanpa Nama'}
                      </TableCell>
                      <TableCell className="text-gray-500 dark:text-gray-400 font-mono text-sm">{u.email}</TableCell>
                      <TableCell>
                        <Select defaultValue={u.role} onValueChange={(val) => handleUpdateRole(u.id, val)}>
                          <SelectTrigger className={`h-8 w-[140px] border-none font-bold ${
                            u.role === 'superadmin' ? 'text-red-600 bg-red-50' : 
                            u.role === 'admin' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 bg-gray-100'
                          }`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="karyawan">Karyawan</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="superadmin">Superadmin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                         <Badge variant="outline" className="text-xs text-gray-400">Auto-Saved</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB 3: SYSTEM --- */}
        <TabsContent value="system">
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900">
            <CardHeader>
              <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2"><AlertTriangle /> Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-4 rounded border border-red-100 dark:border-red-900">
                  <div>
                    <h4 className="font-bold text-gray-800 dark:text-gray-200">Reset Semua Data</h4>
                    <p className="text-sm text-gray-500">Hapus riwayat transaksi & meteran.</p>
                  </div>
                  <Button variant="destructive" onClick={handleResetData}>RESET DATA</Button>
               </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}