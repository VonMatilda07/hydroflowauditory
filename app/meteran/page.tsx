"use client"

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card' // CardDescription dihapus
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Camera, Droplets, Activity } from 'lucide-react' // Upload & Save dihapus

export default function MeteranPage() {
  const [loading, setLoading] = useState(false)
  
  const fileBioRef = useRef<HTMLInputElement>(null)
  const fileRORef = useRef<HTMLInputElement>(null)

  // State Data
  const [shift, setShift] = useState('Awal')
  const [meterBio, setMeterBio] = useState('')
  const [meterRO, setMeterRO] = useState('')
  
  // State Foto
  const [fileBio, setFileBio] = useState<File | null>(null)
  const [previewBio, setPreviewBio] = useState<string | null>(null)

  const [fileRO, setFileRO] = useState<File | null>(null)
  const [previewRO, setPreviewRO] = useState<string | null>(null)

  // Handle Pilih Foto
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'bio' | 'ro') => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const preview = URL.createObjectURL(selectedFile)
      if (type === 'bio') {
        setFileBio(selectedFile)
        setPreviewBio(preview)
      } else {
        setFileRO(selectedFile)
        setPreviewRO(preview)
      }
    }
  }

  // Upload ke Storage
  const uploadImage = async (file: File) => {
    // Generate nama file unik (saran AI VS Code diterapkan)
    const fileExt = file.name.split('.').pop()
    const uniqueId = Math.random().toString(36).substring(2, 15) 
    const fileName = `${Date.now()}-${uniqueId}.${fileExt}`
    
    const { error } = await supabase.storage.from('meter-proofs').upload(fileName, file)
    if (error) throw error
    
    const { data } = supabase.storage.from('meter-proofs').getPublicUrl(fileName)
    return data.publicUrl
  }

  // Submit Data
  const handleSubmit = async () => {
    if (!meterBio || !meterRO) return alert('⚠️ Angka meteran BIO dan RO wajib diisi!')
    if (!fileBio) return alert('📸 Foto Meteran BIO belum ada!')
    if (!fileRO) return alert('📸 Foto Meteran RO belum ada!')

    setLoading(true)

    try {
      // 1. Upload Foto
      const [urlBio, urlRO] = await Promise.all([
        uploadImage(fileBio),
        uploadImage(fileRO)
      ])

      // 2. Simpan ke Database (Perbaikan kolom 'shift')
      const { error: dbError } = await supabase
        .from('meter_readings')
        .insert([{
          shift: shift,            // SUDAH DIPERBAIKI (Sesuai kolom database)
          meter_bio: parseFloat(meterBio), 
          meter_ro: parseFloat(meterRO),   
          image_url: urlBio,       
          image_url_ro: urlRO      
        }])

      if (dbError) throw dbError

      alert('✅ Laporan Sukses! Data Bio & RO tersimpan.')
      
      // Reset Form
      setMeterBio('')
      setMeterRO('')
      setFileBio(null)
      setPreviewBio(null)
      setFileRO(null)
      setPreviewRO(null)

    } catch (error: any) {
      console.error('Error detail:', error)
      alert('❌ Gagal simpan: ' + (error.message || 'Terjadi kesalahan sistem'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto pb-10">
      <div className="mb-8 text-center md:text-left">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center justify-center md:justify-start gap-2">
          <Activity className="text-blue-600" /> Audit Meteran Dual
        </h1>
        <p className="text-gray-500 mt-2">
          Wajib lampirkan foto bukti untuk masing-masing meteran.
        </p>
      </div>

      <Card className="shadow-lg border-t-4 border-t-blue-600">
        <CardHeader>
          <CardTitle>Input Shift & Data</CardTitle>
          <div className="pt-2">
             <Label>Pilih Shift</Label>
             <Select value={shift} onValueChange={setShift}>
              <SelectTrigger className="w-full md:w-1/2 mt-1 font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Awal">☀️ Shift Awal (Buka)</SelectItem>
                <SelectItem value="Akhir">🌙 Shift Akhir (Tutup)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* METERAN BIO */}
          <div className="p-4 rounded-xl border-2 border-blue-100 bg-blue-50/50">
             <div className="flex items-center gap-2 mb-4 text-blue-700">
                <div className="p-2 bg-blue-600 text-white rounded-lg"><Droplets size={20}/></div>
                <h3 className="text-xl font-bold">Meteran BIO (Biasa)</h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Angka Terakhir</Label>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    className="text-lg bg-white"
                    value={meterBio}
                    onChange={(e) => setMeterBio(e.target.value)}
                  />
                </div>
                <div 
                  className="relative h-32 bg-white border-2 border-dashed border-blue-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition"
                  onClick={() => fileBioRef.current?.click()}
                >
                  {previewBio ? (
                    <img src={previewBio} className="w-full h-full object-cover rounded-lg" alt="Preview Bio" />
                  ) : (
                    <div className="text-center text-blue-300">
                      <Camera className="mx-auto mb-1"/>
                      <span className="text-xs font-bold">Foto BIO</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" ref={fileBioRef} className="hidden" onChange={(e) => handleFileChange(e, 'bio')} capture="environment"/>
                </div>
             </div>
          </div>

          {/* METERAN RO */}
          <div className="p-4 rounded-xl border-2 border-purple-100 bg-purple-50/50">
             <div className="flex items-center gap-2 mb-4 text-purple-700">
                <div className="p-2 bg-purple-600 text-white rounded-lg"><Droplets size={20}/></div>
                <h3 className="text-xl font-bold">Meteran RO (Premium)</h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Angka Terakhir</Label>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    className="text-lg bg-white"
                    value={meterRO}
                    onChange={(e) => setMeterRO(e.target.value)}
                  />
                </div>
                <div 
                  className="relative h-32 bg-white border-2 border-dashed border-purple-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-purple-50 transition"
                  onClick={() => fileRORef.current?.click()}
                >
                  {previewRO ? (
                    <img src={previewRO} className="w-full h-full object-cover rounded-lg" alt="Preview RO" />
                  ) : (
                    <div className="text-center text-purple-300">
                      <Camera className="mx-auto mb-1"/>
                      <span className="text-xs font-bold">Foto RO</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" ref={fileRORef} className="hidden" onChange={(e) => handleFileChange(e, 'ro')} capture="environment"/>
                </div>
             </div>
          </div>

          <Button 
            className="w-full h-14 text-lg bg-gray-900 hover:bg-black shadow-xl" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Mengirim Data...' : 'SIMPAN SEMUA LAPORAN'}
          </Button>

        </CardContent>
      </Card>
    </div>
  )
}