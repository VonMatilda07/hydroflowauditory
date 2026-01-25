"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, ShoppingCart, Plus, Truck, CreditCard, Users, CalendarDays, ShieldAlert } from 'lucide-react'

// Tipe Data
type Product = {
  id: number
  name: string
  price: number
  category: string
}

type CartItem = Product & {
  quantity: number
}

type Customer = {
  id: number
  name: string
  phone: string
  points: number
}

export default function KasirPage() {
  const { role: authRole, isReady } = useAuth()
  const [loading, setLoading] = useState(false)
  
  // Data State
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  
  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('umum') 
  const [manualName, setManualName] = useState('') 
  const [shippingCost, setShippingCost] = useState(0)
  const [paymentType, setPaymentType] = useState('Tunai')

  // GOD MODE STATE: Tanggal Custom (Rapel Transaksi)
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]) // Default hari ini

  // Fetch data when auth is ready
  useEffect(() => {
    if (isReady) {
      fetchData()
    }
  }, [isReady])

  const fetchData = async () => {
    try {
      // Verify user is authenticated first
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        console.error('[POS] Auth error - cannot fetch data:', authError?.message)
        return
      }

      // Ambil Produk
      const { data: prodData, error: prodError } = await supabase.from('products').select('*')
      if (prodError) {
        console.error('[POS] Products fetch error:', prodError.message, { code: prodError.code })
      } else {
        console.log('[POS] ✅ Products loaded:', prodData?.length || 0, 'items')
        setProducts(prodData || [])
      }

      // Ambil Daftar Pelanggan
      const { data: custData, error: custError } = await supabase
        .from('customers')
        .select('id, name, phone, points')
        .order('name', { ascending: true })
      if (custError) {
        console.error('[POS] Customers fetch error:', custError.message, { code: custError.code })
      } else {
        console.log('[POS] ✅ Customers loaded:', custData?.length || 0, 'items')
        setCustomers(custData || [])
      }
    } catch (error) {
      console.error('[POS] Unexpected error in fetchData:', error)
    }
  }

  // --- LOGIC KERANJANG ---
  const addToCart = (product: Product) => {
    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.id === product.id)
      if (existingItem) {
        return currentCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...currentCart, { ...product, quantity: 1 }]
    })
  }

  const removeFromCart = (productId: number) => {
    setCart((currentCart) => currentCart.filter((item) => item.id !== productId))
  }

  // Hitung Total
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const grandTotal = subtotal + Number(shippingCost)

  // --- LOGIC CHECKOUT ---
  const handleCheckout = async () => {
    if (cart.length === 0) return alert('Keranjang kosong bos!')
    
    // Konfirmasi Rapel kalau God Mode Aktif
    const isGodModeActive = role === 'superadmin' && customDate !== new Date().toISOString().split('T')[0]
    
    if (isGodModeActive) {
       const confirmRapel = confirm(`⚠️ PERINGATAN GOD MODE ⚠️\n\nAnda akan mencatat transaksi untuk TANGGAL MASA LALU: ${customDate}.\n\nApakah Anda yakin?`)
       if (!confirmRapel) return
    }

    // Tentukan Nama Final
    let finalCustomerName = manualName
    let finalCustomerId = null

    if (selectedCustomerId !== 'umum') {
      const selectedMember = customers.find(c => c.id.toString() === selectedCustomerId)
      if (selectedMember) {
        finalCustomerName = selectedMember.name
        finalCustomerId = selectedMember.id
      }
    }

    if (paymentType === 'Bon' && !finalCustomerName) {
      return alert('⚠️ Kalau Bon/Hutang, wajib isi Nama Pelanggan!')
    }

    setLoading(true)

    try {
      // Siapkan Payload Transaksi
      const transactionPayload: any = {
        total_amount: grandTotal,
        shipping_cost: shippingCost,
        payment_type: paymentType,
        status: paymentType === 'Bon' ? 'unpaid' : 'paid',
        notes: finalCustomerName ? `Customer: ${finalCustomerName}` : 'Umum',
        customer_id: finalCustomerId
      }

      // ⚡ GOD MODE INJECTION ⚡
      if (isGodModeActive) {
         // Paksa created_at mundur ke tanggal pilihan
         const timeNow = new Date().toTimeString().split(' ')[0]
         transactionPayload.created_at = `${customDate}T${timeNow}`
      }

      // 1. SIMPAN TRANSAKSI
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert([transactionPayload])
        .select()
        .single()

      if (txError) throw txError

      // 2. SIMPAN ITEM BELANJA
      const transactionItems = cart.map((item) => ({
        transaction_id: transaction.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        price_at_transaction: item.price
      }))

      const { error: itemsError } = await supabase.from('transaction_items').insert(transactionItems)
      if (itemsError) throw itemsError

      // 3. UPDATE POIN LOYALTY (Jika Member)
      if (finalCustomerId) {
        const { data: currentCust } = await supabase
          .from('customers')
          .select('points')
          .eq('id', finalCustomerId)
          .single()
        
        if (currentCust) {
          await supabase
            .from('customers')
            .update({ points: currentCust.points + 1 })
            .eq('id', finalCustomerId)
        }
      }

      alert(`✅ Transaksi Berhasil! ${isGodModeActive ? '(BACKDATE)' : ''}`)
      
      // Reset Form
      setCart([])
      setManualName('')
      setSelectedCustomerId('umum')
      setShippingCost(0)
      setPaymentType('Tunai')
      setCustomDate(new Date().toISOString().split('T')[0]) // Balikin ke hari ini

    } catch (error: any) {
      alert('❌ Gagal: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-screen pb-10">
      
      {/* KIRI: PRODUK AREA */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
           <ShoppingCart className="text-blue-600"/> Kasir (POS)
           {role === 'superadmin' && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded border border-red-200 font-bold flex items-center gap-1"><ShieldAlert size={12}/> GOD MODE</span>}
        </h1>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => (
            <Card 
              key={product.id} 
              className="cursor-pointer hover:border-blue-500 hover:shadow-md transition-all active:scale-95 group relative overflow-hidden"
              onClick={() => addToCart(product)}
            >
              <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <div className="bg-blue-600 text-white p-1 rounded-full"><Plus size={16}/></div>
              </div>
              <CardContent className="p-4 flex flex-col items-center text-center h-full justify-center">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-3 transition-colors ${
                    product.category === 'refill' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                }`}>
                  {product.category === 'refill' ? <Truck size={24}/> : <ShoppingCart size={24}/>}
                </div>
                <h3 className="font-bold text-gray-700 leading-tight mb-1">{product.name}</h3>
                <p className="text-gray-500 text-sm font-mono font-bold">Rp {product.price.toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* KANAN: KERANJANG AREA */}
      <div className="w-full md:w-96">
        <Card className={`h-fit shadow-xl sticky top-4 ${role === 'superadmin' && customDate !== new Date().toISOString().split('T')[0] ? 'border-t-4 border-t-red-600' : 'border-t-4 border-t-blue-600'}`}>
          <CardHeader className="border-b py-4 bg-gray-50/50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart size={20} /> Keranjang
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-4 space-y-5">
            
            {/* ⚡ GOD MODE DATE PICKER ⚡ */}
            {role === 'superadmin' && (
               <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-xs">
                  <div className="text-red-700 font-bold mb-1 flex items-center gap-1"><CalendarDays size={12}/> TANGGAL TRANSAKSI</div>
                  <Input 
                    type="date" 
                    className="h-8 bg-white text-xs" 
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                  />
               </div>
            )}

            {/* 1. LIST ITEM */}
            <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="text-center py-10 text-gray-400 border-2 border-dashed rounded-xl bg-gray-50">
                  <ShoppingCart className="mx-auto mb-2 opacity-20" size={40}/>
                  <p>Belum ada item</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center border-b border-dashed pb-3 last:border-0">
                    <div>
                      <p className="font-bold text-gray-700 text-sm">{item.name}</p>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                         <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-mono">x{item.quantity}</span>
                         <span>@ {item.price.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-blue-600 text-sm">
                        {(item.price * item.quantity).toLocaleString()}
                      </span>
                      <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 2. PILIH PELANGGAN */}
            <div className="space-y-3 pt-4 border-t">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500 uppercase font-bold flex items-center gap-1">
                   <Users size={12}/> Pelanggan
                </Label>
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger className="w-full font-medium h-9 text-sm">
                    <SelectValue placeholder="Pilih Pelanggan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="umum">👤 Umum / Non-Member</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        ⭐ {c.name} ({c.points} Poin)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCustomerId === 'umum' && (
                  <Input 
                    placeholder="Nama Pelanggan (Opsional)..." 
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="mt-2 bg-gray-50 text-sm h-8"
                  />
                )}
              </div>

              {/* ONGKIR */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 uppercase font-bold flex items-center gap-1">
                  <Truck size={12}/> Ongkir
                </Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => setShippingCost(0)}>Free</Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => setShippingCost(2000)}>2rb</Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => setShippingCost(5000)}>5rb</Button>
                </div>
                {[0, 2000, 5000].includes(shippingCost) ? null : (
                   <div className="text-xs text-right text-gray-500">Manual: Rp {shippingCost.toLocaleString()}</div>
                )}
              </div>
            </div>

            {/* 3. TOTAL & BAYAR */}
            <div className="bg-gray-50 -mx-4 -mb-4 p-4 rounded-b-xl border-t space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500 uppercase font-bold">Pembayaran</Label>
                  <Select value={paymentType} onValueChange={setPaymentType}>
                    <SelectTrigger className="w-full bg-white h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tunai">💵 Tunai / Cash</SelectItem>
                      <SelectItem value="Transfer">🏦 Transfer / QRIS</SelectItem>
                      <SelectItem value="Bon">📝 Bon / Hutang</SelectItem>
                      <SelectItem value="Free">🎁 Free / Sample</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Subtotal</span>
                    <span>{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Ongkir</span>
                    <span>{shippingCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-gray-800 mb-4">
                    <span>Total</span>
                    <span>Rp {grandTotal.toLocaleString()}</span>
                  </div>

                  <Button 
                    className={`w-full h-11 text-base font-bold shadow-lg transition-all active:scale-[0.98] ${
                      role === 'superadmin' && customDate !== new Date().toISOString().split('T')[0] 
                        ? 'bg-red-600 hover:bg-red-700' // TOMBOL JADI MERAH KALAU GOD MODE
                        : paymentType === 'Bon' ? 'bg-orange-500 hover:bg-orange-600'
                        : paymentType === 'Free' ? 'bg-gray-500 hover:bg-gray-600'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                    onClick={handleCheckout}
                    disabled={loading || cart.length === 0}
                  >
                    {loading ? 'Memproses...' : 
                      role === 'superadmin' && customDate !== new Date().toISOString().split('T')[0] ? `SIMPAN TGL ${customDate.split('-')[2]}` :
                      paymentType === 'Bon' ? 'Catat Hutang' :
                      paymentType === 'Free' ? 'Simpan (Gratis)' :
                      'Bayar Sekarang'
                    }
                  </Button>
                </div>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  )
}