"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, ShoppingCart, Plus, Truck, CreditCard } from 'lucide-react'

type Product = {
  id: number
  name: string
  price: number
  category: string
}

type CartItem = Product & {
  quantity: number
}

export default function KasirPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  
  // Form State
  const [customerName, setCustomerName] = useState('')
  const [shippingCost, setShippingCost] = useState(0)
  const [paymentType, setPaymentType] = useState('Tunai') // Default Tunai

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase.from('products').select('*')
      if (data) setProducts(data)
    }
    fetchProducts()
  }, [])

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

  const handleCheckout = async () => {
    if (cart.length === 0) return alert('Keranjang kosong bos!')
    
    // Validasi Bon: Kalau Bon, wajib isi nama customer
    if (paymentType === 'Bon' && !customerName) {
      return alert('⚠️ Kalau Bon/Hutang, wajib isi Nama Pelanggan!')
    }

    setLoading(true)

    try {
      // 1. SIMPAN TRANSAKSI
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert([
          {
            total_amount: grandTotal,
            shipping_cost: shippingCost,
            payment_type: paymentType, // <-- INI YANG BARU
            status: 'completed',
            notes: customerName ? `Customer: ${customerName}` : 'Umum'
          }
        ])
        .select()
        .single()

      if (txError) throw txError

      // 2. SIMPAN ITEM
      const transactionItems = cart.map((item) => ({
        transaction_id: transaction.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        price_at_transaction: item.price
      }))

      const { error: itemsError } = await supabase.from('transaction_items').insert(transactionItems)

      if (itemsError) throw itemsError

      alert(`✅ Transaksi ${paymentType} Berhasil!`)
      
      // Reset Form
      setCart([])
      setCustomerName('')
      setShippingCost(0)
      setPaymentType('Tunai')

    } catch (error: any) {
      alert('❌ Gagal: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-screen pb-10">
      
      {/* KIRI: Produk */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Pilih Produk</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {products.map((product) => (
            <Card 
              key={product.id} 
              className="cursor-pointer hover:border-blue-500 transition-all active:scale-95 group"
              onClick={() => addToCart(product)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="h-12 w-12 bg-blue-50 group-hover:bg-blue-100 rounded-full flex items-center justify-center mb-3 text-blue-600 transition-colors">
                  <Plus size={24} />
                </div>
                <h3 className="font-bold text-gray-700">{product.name}</h3>
                <p className="text-gray-500 text-sm font-mono">Rp {product.price.toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* KANAN: Keranjang */}
      <div className="w-full md:w-96">
        <Card className="h-fit shadow-xl border-t-4 border-t-blue-600 sticky top-4">
          <CardHeader className="border-b py-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart size={20} /> Keranjang
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-4 space-y-5">
            
            {/* 1. List Item */}
            <div className="max-h-[250px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-lg">
                  <p>Keranjang Kosong</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center border-b pb-2 text-sm">
                    <div>
                      <p className="font-medium text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.quantity} x {item.price.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-700">
                        {(item.price * item.quantity).toLocaleString()}
                      </span>
                      <Trash2 size={16} className="text-red-400 hover:text-red-600 cursor-pointer" onClick={() => removeFromCart(item.id)}/>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 2. Form Input Customer & Ongkir */}
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500 uppercase font-bold">Pelanggan</Label>
                <Input 
                  placeholder="Nama Pelanggan (Opsional)" 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-500 uppercase font-bold flex items-center gap-1">
                  <Truck size={12}/> Ongkir
                </Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setShippingCost(0)}>Free</Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setShippingCost(2000)}>2rb</Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setShippingCost(5000)}>5rb</Button>
                </div>
                <Input 
                  type="number" 
                  value={shippingCost === 0 ? '' : shippingCost}
                  onChange={(e) => setShippingCost(Number(e.target.value))}
                  placeholder="Manual..."
                  className="text-right font-mono text-sm h-8"
                />
              </div>
            </div>

            {/* 3. METODE PEMBAYARAN (BARU) */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs text-gray-500 uppercase font-bold flex items-center gap-1">
                <CreditCard size={12}/> Metode Pembayaran
              </Label>
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger className="w-full font-bold text-gray-700">
                  <SelectValue placeholder="Pilih Metode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tunai">💵 Tunai / Cash</SelectItem>
                  <SelectItem value="Transfer">🏦 Transfer / QRIS</SelectItem>
                  <SelectItem value="Bon">📝 Bon / Hutang</SelectItem>
                  <SelectItem value="Free">🎁 Free / Sample</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 4. Total & Tombol */}
            <div className="pt-4 border-t space-y-1 bg-gray-50 -mx-4 px-4 pb-4 -mb-4 rounded-b-lg">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal:</span>
                <span>{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Ongkir:</span>
                <span>{shippingCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-blue-600 mt-2 mb-4">
                <span>Total:</span>
                <span>Rp {grandTotal.toLocaleString()}</span>
              </div>

              <Button 
                className={`w-full h-12 text-lg shadow-lg transition-colors ${
                  paymentType === 'Bon' ? 'bg-orange-500 hover:bg-orange-600' : 
                  paymentType === 'Free' ? 'bg-gray-500 hover:bg-gray-600' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
                onClick={handleCheckout}
                disabled={loading || cart.length === 0}
              >
                {loading ? 'Menyimpan...' : 
                  paymentType === 'Bon' ? 'Catat Hutang' :
                  paymentType === 'Free' ? 'Simpan (Gratis)' :
                  'Bayar Sekarang'
                }
              </Button>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  )
}