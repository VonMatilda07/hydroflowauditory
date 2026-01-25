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
    <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-3 sm:p-4">
      <Card className="w-full max-w-sm sm:max-w-md shadow-2xl border-slate-700 bg-white rounded-2xl">
        <CardHeader className="text-center space-y-3 pb-6 border-b border-slate-100">
          <div className="flex justify-center mb-1">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 sm:p-4 rounded-2xl shadow-lg shadow-blue-900/30 transform transition-transform hover:scale-105">
              <Droplets className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900">HydroFlow Audit</CardTitle>
          <CardDescription className="text-sm sm:text-base text-slate-600">Silakan masuk untuk mengakses sistem</CardDescription>
        </CardHeader>
        
        <CardContent className="pt-5 sm:pt-6 pb-5 sm:pb-6">
          <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
            
            {errorMsg && (
              <div className="bg-red-50 text-red-700 p-3 sm:p-4 rounded-lg text-xs sm:text-sm font-medium border border-red-200 text-center animate-pulse">
                {errorMsg}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-slate-700">Email Karyawan</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="nama@hydroflow.com" 
                  className="pl-10 h-10 sm:h-11 text-sm sm:text-base rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-10 h-10 sm:h-11 text-sm sm:text-base rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 h-10 sm:h-11 text-sm sm:text-base font-bold shadow-lg shadow-blue-900/20 transition-all transform hover:scale-105 active:scale-95 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Memeriksa...
                </span>
              ) : (
                'Masuk Sistem'
              )}
            </Button>

          </form>
          
          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-400 font-medium">
            &copy; 2026 HydroFlow System v1.0
          </div>
        </CardContent>
      </Card>
    </div>
  )
}