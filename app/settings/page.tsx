"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js' // Hack buat 'Add User'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast-context'
import { Skeleton, TableSkeleton } from '@/components/skeleton'
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
import { Trash2, Plus, Edit, AlertTriangle, Moon, Sun, UserPlus, Shield, User, KeyRound } from 'lucide-react'

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
  const [isDarkMode, setIsDarkMode] = useState(false)
  const { addToast } = useToast()

  // State Produk
  const [products, setProducts] = useState<Product[]>([])
  const [prodDialog, setProdDialog] = useState(false)
  const [editingProdId, setEditingProdId] = useState<number | null>(null)
  const [prodForm, setProdForm] = useState({ name: '', price: '', category: 'refill', source_type: 'BIO', liters: '19' })

  // State User Management
  const [users, setUsers] = useState<UserProfile[]>([])
  const [userDialog, setUserDialog] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null) // ID User yg lagi diedit
  const [userForm, setUserForm] = useState({ email: '', password: '', fullName: '', role: 'karyawan' })

  useEffect(() => {
    fetchProducts()
    fetchUsers()
    
    // Cek Dark Mode
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true); document.documentElement.classList.add('dark')
    } else {
      setIsDarkMode(false); document.documentElement.classList.remove('dark')
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
    try {
      const { data, error } = await supabase.from('products').select('*').order('id', { ascending: true })
      if (error) throw error
      if (data) {
        console.log("✅ Fetched products:", data.length)
        setProducts(data as any[])
      }
    } catch (e: any) {
      console.error("❌ Fetch products error:", e)
    }
  }

  const fetchUsers = async () => {
    try {
      console.log("📝 Fetching users from database...")
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true })
      
      if (error) {
        console.error("❌ Fetch error:", error)
        throw error
      }
      
      console.log("✅ Fetched users:", data)
      if (data) {
        setUsers([...data] as any[]) // Force new array reference
      }
    } catch (e: any) {
      console.error("❌ Fetch users error:", e)
      addToast(`Gagal load users: ${e.message}`, "error")
    }
  }

  // --- LOGIC PRODUK ---
  const handleSaveProduct = async () => {
    if (!prodForm.name || !prodForm.price) {
      addToast("Nama & Harga wajib diisi!", "error")
      return
    }
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
        addToast("✅ Produk berhasil diperbarui!", "success")
      } else {
        await supabase.from('products').insert([payload])
        addToast("✅ Produk berhasil ditambahkan!", "success")
      }
      await fetchProducts()
      setProdDialog(false)
      resetProdForm()
    } catch (e: any) {
      addToast(`❌ Gagal: ${e.message}`, "error")
    }
    setLoading(false)
  }

  const handleDeleteProduct = async (id: number) => {
    if (confirm('Hapus produk ini?')) {
      setLoading(true)
      try {
        await supabase.from('products').delete().eq('id', id)
        addToast("🗑️ Produk berhasil dihapus!", "success")
        fetchProducts()
      } catch (e: any) {
        addToast(`❌ Gagal hapus: ${e.message}`, "error")
      }
      setLoading(false)
    }
  }

  const resetProdForm = () => {
    setEditingProdId(null)
    setProdForm({ name: '', price: '', category: 'refill', source_type: 'BIO', liters: '19' })
  }

  // --- LOGIC USER MANAGEMENT (CRUD LENGKAP) ---

  // 1. Reset Form User
  const resetUserForm = () => {
    setEditingUserId(null)
    setUserForm({ email: '', password: '', fullName: '', role: 'karyawan' })
  }

  // 2. Open Modal Edit
  const handleEditUser = (u: UserProfile) => {
    setEditingUserId(u.id)
    setUserForm({ 
      email: u.email, 
      password: '', // Password kosongin aja (gak bisa edit password user lain)
      fullName: u.full_name, 
      role: u.role 
    })
    setUserDialog(true)
  }

  // 3. Save User (Create / Update)
  const handleSaveUser = async () => {
    if (!userForm.fullName) {
      addToast("Nama wajib diisi!", "error")
      return
    }
    
    setLoading(true)

    try {
      if (editingUserId) {
        // --- MODE UPDATE (Edit Profil) via API ---
        console.log("🔄 Updating user via API:", { id: editingUserId, name: userForm.fullName, role: userForm.role })
        
        const response = await fetch('/api/users/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: editingUserId,
            fullName: userForm.fullName,
            role: userForm.role
          })
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to update user')
        }

        console.log("✅ Update API success:", result)
        addToast(`✅ Data ${userForm.fullName} berhasil diperbarui!`, "success")
        
        // Modal tutup dulu
        setUserDialog(false)
        resetUserForm()
        
        // Tunggu sebentar biar database sync
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Refetch users
        console.log("🔄 Refetching users after update...")
        await fetchUsers()
        
      } else {
        // --- MODE CREATE (Buat User Baru) ---
        if (!userForm.email || !userForm.password) {
          addToast("Email & Password wajib diisi untuk user baru!", "error")
          setLoading(false)
          return
        }

        const tempSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { auth: { persistSession: false } }
        )

        const { data, error } = await tempSupabase.auth.signUp({
          email: userForm.email,
          password: userForm.password,
          options: { data: { full_name: userForm.fullName } }
        })

        if (error) throw error
        if (data.user) {
          console.log("✅ New user created in auth:", data.user.id)
          await supabase.from('profiles').update({ role: userForm.role }).eq('id', data.user.id)
          await new Promise(resolve => setTimeout(resolve, 300))
        }
        addToast(`✅ User baru ${userForm.fullName} berhasil dibuat!`, "success")
        
        setUserDialog(false)
        resetUserForm()
        await fetchUsers()
      }

    } catch (error: any) {
      console.error("❌ Save user error:", error)
      addToast(`❌ Gagal: ${error.message}`, "error")
    } finally {
      setLoading(false)
    }
  }

  // 4. Delete User
  const handleDeleteUser = async (userId: string) => {
    const confirmDelete = confirm("⚠️ PERINGATAN: Menghapus user ini akan mencabut akses login mereka.\n\nApakah Anda yakin ingin menghapus user ini?")
    if (!confirmDelete) return

    setLoading(true)
    try {
      console.log("Calling delete user API for:", userId)
      
      // Call API backend yang punya service role key
      const response = await fetch('/api/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user')
      }

      console.log("Delete success:", result)
      addToast("🗑️ User berhasil dihapus!", "success")
      
      // Tunggu sebentar biar database sync, baru refetch
      await new Promise(resolve => setTimeout(resolve, 300))
      await fetchUsers()
      
    } catch (e: any) {
      console.error("Delete user failed:", e)
      addToast(`❌ Gagal hapus: ${e.message}`, "error")
    } finally {
      setLoading(false)
    }
  }

  // --- LOGIC RESET SYSTEM ---
  const handleResetData = async () => {
    const confirmText = prompt("Ketik 'RESET' untuk menghapus SEMUA data transaksi & meteran:")
    if (confirmText === 'RESET') {
       setLoading(true)
       try {
         await supabase.from('transaction_items').delete().neq('id', 0)
         await supabase.from('transactions').delete().neq('id', 0)
         await supabase.from('meter_readings').delete().neq('id', 0)
         await supabase.from('expenses').delete().neq('id', 0)
         addToast('✅ Data berhasil di-reset jadi 0!', 'success')
       } catch (e: any) {
         addToast(`❌ Gagal reset: ${e.message}`, 'error')
       }
       setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4 pb-20 transition-colors duration-300">
      
      {/* HEADER & DARK MODE */}
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
                  <Button onClick={resetProdForm}>
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
                  {products.length === 0 && !loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-8">Belum ada produk</TableCell>
                    </TableRow>
                  ) : loading ? (
                    <TableRow>
                      <TableCell colSpan={5}><TableSkeleton /></TableCell>
                    </TableRow>
                  ) : (
                    products.map((p) => (
                      <TableRow key={p.id} className="dark:hover:bg-gray-800">
                        <TableCell className="font-medium dark:text-gray-200">{p.name}</TableCell>
                        <TableCell className="dark:text-gray-300">Rp {p.price.toLocaleString()}</TableCell>
                        <TableCell className="dark:text-gray-300">{p.liters} L</TableCell>
                        <TableCell><Badge variant="outline">{p.source_type}</Badge></TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button size="icon" variant="ghost" onClick={() => { setEditingProdId(p.id); setProdForm({name: p.name, price: String(p.price), category: p.category, source_type: p.source_type, liters: String(p.liters)}); setProdDialog(true); }}><Edit size={14} /></Button>
                          <Button size="icon" variant="ghost" className="text-red-500" onClick={() => handleDeleteProduct(p.id)} disabled={loading}><Trash2 size={14} /></Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB 2: MANAJEMEN USER (UPDATED CRUD) --- */}
        <TabsContent value="users">
          <Card className="dark:bg-gray-900 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="dark:text-white flex items-center gap-2"><Shield size={20} className="text-purple-600"/> Manajemen Akses</CardTitle>
                <CardDescription>Kelola akun karyawan dan admin.</CardDescription>
              </div>
              
              {/* MODAL USER (CREATE & EDIT) */}
              <Dialog open={userDialog} onOpenChange={setUserDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700" onClick={resetUserForm}>
                    <UserPlus size={16} className="mr-2"/> User Baru
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingUserId ? 'Edit Data User' : 'Buat Akun Baru'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nama Lengkap</Label>
                      <Input placeholder="Contoh: Budi Santoso" value={userForm.fullName} onChange={e => setUserForm({...userForm, fullName: e.target.value})} />
                    </div>
                    
                    {/* Input Email & Password cuma aktif pas bikin user baru */}
                    <div className="space-y-2">
                      <Label className={editingUserId ? "text-gray-400" : ""}>Email Login {editingUserId && "(Tidak bisa diubah)"}</Label>
                      <Input 
                        type="email" 
                        placeholder="budi@hydroflow.com" 
                        value={userForm.email} 
                        onChange={e => setUserForm({...userForm, email: e.target.value})} 
                        disabled={!!editingUserId} // Disabled kalau lagi edit
                        className={editingUserId ? "bg-gray-100 dark:bg-gray-800 text-gray-500" : ""}
                      />
                    </div>

                    {!editingUserId && (
                       <div className="space-y-2">
                         <Label>Password</Label>
                         <div className="relative">
                            <KeyRound size={14} className="absolute left-3 top-3 text-gray-400"/>
                            <Input type="password" placeholder="Minimal 6 karakter" className="pl-9" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} />
                         </div>
                       </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-purple-600 font-bold">Jabatan / Role</Label>
                      <Select value={userForm.role} onValueChange={(v) => setUserForm({...userForm, role: v as any})}>
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
                    <Button onClick={handleSaveUser} disabled={loading} className="w-full bg-purple-600">
                      {loading ? 'Menyimpan...' : editingUserId ? 'Simpan Perubahan' : 'Buat User Baru'}
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
                  {users.length === 0 && !loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-500 py-8">Belum ada user</TableCell>
                    </TableRow>
                  ) : loading ? (
                    <TableRow>
                      <TableCell colSpan={4}><TableSkeleton /></TableCell>
                    </TableRow>
                  ) : (
                    users.map((u) => (
                      <TableRow key={u.id} className="dark:hover:bg-gray-800">
                        <TableCell className="font-bold flex items-center gap-2 dark:text-gray-200">
                            <div className={`p-2 rounded-full ${u.role === 'superadmin' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                               <User size={14}/>
                            </div>
                            {u.full_name || 'Tanpa Nama'}
                        </TableCell>
                        <TableCell className="text-gray-500 dark:text-gray-400 font-mono text-sm">{u.email}</TableCell>
                        <TableCell>
                            <Badge variant="outline" className={`
                              ${u.role === 'superadmin' ? 'border-red-500 text-red-600 bg-red-50' : 
                                u.role === 'admin' ? 'border-blue-500 text-blue-600 bg-blue-50' : 
                                'border-gray-500 text-gray-600 bg-gray-50'}
                            `}>
                              {u.role.toUpperCase()}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                           <Button size="icon" variant="ghost" onClick={() => handleEditUser(u)} disabled={loading}>
                              <Edit size={14} className="text-blue-500"/>
                           </Button>
                           <Button size="icon" variant="ghost" onClick={() => handleDeleteUser(u.id)} disabled={loading}>
                              <Trash2 size={14} className="text-red-500"/>
                           </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
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