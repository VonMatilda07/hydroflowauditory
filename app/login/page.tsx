"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Droplets, Lock, Mail } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })

      if (error) throw error

      // Login sukses, lempar ke dashboard
      router.push('/')
      router.refresh()
      
    } catch (error: any) {
      setErrorMsg('Login Gagal: Email atau Password salah.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <Card className="w-full max-w-md shadow-2xl border-slate-800 bg-white">
        <CardHeader className="text-center space-y-2 pb-6 border-b">
          <div className="flex justify-center mb-2">
            <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-200">
              <Droplets className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">HydroFlow Audit</CardTitle>
          <CardDescription>Silakan masuk untuk mengakses sistem.</CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6">
          <form onSubmit={handleLogin} className="space-y-4">
            
            {errorMsg && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm font-medium border border-red-100 text-center">
                {errorMsg}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email Karyawan</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="nama@hydroflow.com" 
                  className="pl-10 h-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-10 h-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-base font-bold shadow-lg shadow-blue-900/10" disabled={loading}>
              {loading ? 'Memeriksa...' : 'Masuk Sistem'}
            </Button>

          </form>
          
          <div className="mt-6 text-center text-xs text-gray-400">
            &copy; 2026 HydroFlow System v1.0
          </div>
        </CardContent>
      </Card>
    </div>
  )
}