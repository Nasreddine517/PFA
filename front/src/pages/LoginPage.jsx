import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Brain, AlertCircle } from 'lucide-react'
import { authApi } from '../api'
import { useAuthStore } from '../store'
import Button from '../design-system/components/Button'
import { Input } from '../design-system/components'
import toast from 'react-hot-toast'

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export default function LoginPage() {
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/dashboard'

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    setError('')
    try {
      // Mock login for demo — replace with: const res = await authApi.login(data)
      await new Promise(r => setTimeout(r, 1000))
      const mockDoctor = { id: '1', full_name: 'Dr. Sarah Bennett', email: data.email, specialty: 'Neurology', license: 'NRL-2024-001' }
      setAuth(mockDoctor, 'mock-jwt-token-xyz')
      toast.success('Welcome back, Dr. ' + mockDoctor.full_name.split(' ').pop())
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password')
      setShake(true)
      setTimeout(() => setShake(false), 400)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg via-blue-50/30 to-bg flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="absolute rounded-full bg-navy/3"
            style={{ width: `${120 + i * 80}px`, height: `${120 + i * 80}px`, top: `${10 + i * 12}%`, left: `${5 + i * 15}%`, }} />
        ))}
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className={`relative w-full max-w-sm ${shake ? 'animate-shake' : ''}`}>
        {/* Card */}
        <div className="bg-white rounded-2xl border border-border shadow-modal p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-navy mb-4">
              <Brain className="h-7 w-7 text-white" />
            </div>
            <h1 className="font-display text-2xl font-bold text-gray-900">NeuroScan AI</h1>
            <p className="text-muted text-sm mt-1">Clinical MRI Analysis Platform</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Email address" type="email" placeholder="doctor@hospital.com"
              error={errors.email?.message} {...register('email')} />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} placeholder="••••••••"
                  className={`w-full h-10 rounded-lg border px-3 pr-10 text-sm text-gray-900 placeholder-gray-400 transition-all
                    focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy
                    ${errors.password ? 'border-danger' : 'border-border'}`}
                  {...register('password')} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-gray-900">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="remember" className="h-4 w-4 rounded border-border text-navy accent-navy" />
              <label htmlFor="remember" className="text-sm text-muted">Remember me</label>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-danger/8 rounded-lg border border-danger/20">
                <AlertCircle size={15} className="text-danger flex-shrink-0" />
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}

            <Button type="submit" loading={isSubmitting} className="w-full mt-2" size="lg">
              Sign in
            </Button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-navy font-medium hover:text-navy-light transition-colors">Create account</Link>
          </p>
        </div>

        <p className="text-center text-xs text-muted mt-4">
          © 2025 NeuroScan AI — For medical professional use only
        </p>
      </motion.div>
    </div>
  )
}
