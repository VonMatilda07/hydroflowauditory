"use client" // Wajib ada biar bisa interaksi (klik tombol)

import { useState } from 'react'
import { supabase } from '../../lib/supabase' // Mundur 2 folder ke lib
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export default function MeteranPage() {
  const [loading, setLoading] = useState(false)
  
  // State buat nampung inputan user
  const [formData, setFormData] = useState({
    meterValue: '',
    shift: 'Opening', // Default shift Pagi
    petugas: ''
  })

  // Fungsi saat tombol simpan diklik
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault() // Biar gak reload halaman
    setLoading(true)

    try {
      // Kirim data ke Supabase (Tabel 'meter_readings')
      const { error } = await supabase
        .from('meter_readings')
        .insert([
          {
            meter_value: parseFloat(formData.meterValue), // Ubah teks jadi angka
            shift: formData.shift,
            reported_by: formData.petugas,
            date: new Date().toISOString() // Tanggal hari ini
          }
        ])

      if (error) throw error

      alert('Mantap! Data meteran berhasil disimpan.')
      // Reset form
      setFormData({ meterValue: '', shift: 'Opening', petugas: '' })

    } catch (error: any) {
      alert('Gagal simpan: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-blue-600">
            💧 Input Agrometer
          </CardTitle>
          <p className="text-center text-gray-500 text-sm">
            Catat meteran air sebelum & sesudah operasional.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Input Shift */}
            <div className="space-y-2">
              <Label>Shift Operasional</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.shift}
                onChange={(e) => setFormData({...formData, shift: e.target.value})}
              >
                <option value="Opening">☀️ Opening (Buka Toko)</option>
                <option value="Closing">🌙 Closing (Tutup Toko)</option>
              </select>
            </div>

            {/* Input Angka Meteran */}
            <div className="space-y-2">
              <Label>Angka Meteran Air</Label>
              <Input 
                type="number" 
                placeholder="Contoh: 12405.5" 
                value={formData.meterValue}
                onChange={(e) => setFormData({...formData, meterValue: e.target.value})}
                required
              />
            </div>

            {/* Input Nama Petugas */}
            <div className="space-y-2">
              <Label>Nama Petugas</Label>
              <Input 
                type="text" 
                placeholder="Siapa yang catat?" 
                value={formData.petugas}
                onChange={(e) => setFormData({...formData, petugas: e.target.value})}
                required
              />
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Laporan'}
            </Button>

          </form>
        </CardContent>
      </Card>
    </div>
  )
}