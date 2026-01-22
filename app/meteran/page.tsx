"use client"

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card' 
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Camera, Droplets, Activity, CalendarDays, ShieldAlert } from 'lucide-react' 

export default function MeteranPage() {
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<string | null>(null) // State buat nyimpen role user
  
  const fileBioRef = useRef<HTMLInputElement>(null)
  const fileRORef = useRef<HTMLInputElement>(null)

  // State Data Standard
  const [shift, setShift] = useState('Awal')
  const [meterBio, setMeterBio] = useState('')
  const [meterRO, setMeterRO] = useState('')
  
  // GOD MODE STATE: Tanggal Custom (Rapel)
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]) // Default hari ini

  // State Foto
  const [fileBio, setFileBio] = useState<File | null>(null)
  const [previewBio, setPreviewBio] = useState<string | null>(null)

  const [fileRO, setFileRO] = useState<File | null>(null)
  const [previewRO, setPreviewRO] = useState<string | null>(null)

  // 1. Cek Role saat halaman dimuat
  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        setRole(data?.role || 'karyawan')
      }
    }
    checkRole()
  }, [])

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

    // Konfirmasi kalau lagi mode rapel
    if (role === 'superadmin' && customDate !== new Date().toISOString().split('T')[0]) {
      const confirmRapel = confirm(`⚠️ PERINGATAN GOD MODE ⚠️\n\nAnda akan menginput data untuk tanggal MASA LALU: ${customDate}.\n\nApakah Anda yakin?`)
      if (!confirmRapel) return
    }

    setLoading(true)

    try {
      // 1. Upload Foto
      const [urlBio, urlRO] = await Promise.all([
        uploadImage(fileBio),
        uploadImage(fileRO)
      ])

      // 2. Siapkan Payload Database
      const payload: any = {
        shift: shift,
        meter_bio: parseFloat(meterBio), 
        meter_ro: parseFloat(meterRO),   
        image_url: urlBio,       
        image_url_ro: urlRO      
      }

      // ⚡ GOD MODE INJECTION ⚡
      // Kalau Superadmin & Tanggal bukan hari ini, paksa created_at mundur
      if (role === 'superadmin') {
         // Kita gabungkan tanggal pilihan dengan jam saat ini biar urutannya bener
         const timeNow = new Date().toTimeString().split(' ')[0] // Ambil "14:30:00"
         payload.created_at = `${customDate}T${timeNow}`
      }

      // 3. Simpan ke Database
      const { error: dbError } = await supabase
        .from('meter_readings')
        .insert([payload])

      if (dbError) throw dbError

      alert('✅ Laporan Sukses! Data Bio & RO tersimpan.')
      
      // Reset Form
      setMeterBio('')
      setMeterRO('')
      setFileBio(null)
      setPreviewBio(null)
      setFileRO(null)
      setPreviewRO(null)
      // Reset tanggal ke hari ini
      setCustomDate(new Date().toISOString().split('T')[0])

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
          <CardTitle className="flex justify-between items-center">
             <span>Input Shift & Data</span>
             {role === 'superadmin' && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded border border-red-200 font-bold flex items-center gap-1"><ShieldAlert size={12}/> GOD MODE ACTIVE</span>}
          </CardTitle>

          {/* ⚡ AREA KHUSUS GOD MODE (CUMA SUPERADMIN YANG LIHAT) ⚡ */}
          {role === 'superadmin' && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg animate-in fade-in slide-in-from-top-2">
               <div className="text-red-800 font-bold text-sm mb-2 flex items-center gap-2">
                  <CalendarDays size={16}/> RAPEL TANGGAL (Time Travel)
               </div>
               <div className="flex flex-col gap-1">
                  <Label className="text-xs text-red-600">Pilih Tanggal Laporan:</Label>
                  <Input 
                    type="date" 
                    className="bg-white border-red-300 focus:ring-red-500"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                  />
                  <p className="text-[10px] text-red-500 mt-1">*Hati-hati! Data akan diselipkan ke tanggal yang Anda pilih.</p>
               </div>
            </div>
          )}

          <div className="pt-4">
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
            className={`w-full h-14 text-lg shadow-xl transition-all ${
              role === 'superadmin' && customDate !== new Date().toISOString().split('T')[0]
                ? 'bg-red-600 hover:bg-red-700' // Merah kalau lagi mode rapel
                : 'bg-gray-900 hover:bg-black'
            }`} 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Mengirim Data...' : 
              role === 'superadmin' && customDate !== new Date().toISOString().split('T')[0]
                ? `SIMPAN RAPEL TGL ${customDate.split('-')[2]}`
                : 'SIMPAN SEMUA LAPORAN'
            }
          </Button>

        </CardContent>
      </Card>
    </div>
  )
}