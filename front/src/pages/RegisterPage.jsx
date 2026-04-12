import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Brain } from 'lucide-react'
import { useAuthStore } from '../store'
import toast from 'react-hot-toast'

const schema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email (e.g. yazid@gmail.com)'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/\d/, 'Password must contain at least one number'),
  confirm_password: z.string().min(1, 'Please confirm your password'),
  license_number: z.string().min(2, 'License number is required'),
  specialty: z.string().min(1, 'Please select a specialty'),
}).refine(d => d.password === d.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
})

const specialties = ['Neurology', 'Radiology', 'Oncology', 'Neurosurgery', 'General Practice', 'Other']

function PasswordStrength({ password }) {
  const score = !password ? 0 : [/.{8,}/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter(r => r.test(password)).length
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = ['', 'bg-red-500', 'bg-amber-500', 'bg-blue-400', 'bg-green-500']
  const textColors = ['', 'text-red-500', 'text-amber-500', 'text-blue-500', 'text-green-600']
  if (!password) return null
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= score ? colors[score] : 'bg-gray-200'}`} />
        ))}
      </div>
      <p className={`text-xs mt-1.5 font-medium ${textColors[score]}`}>{labels[score]} password</p>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
      {children}
      {error && (
        <p className="text-xs text-red-500 font-medium flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  )
}

export default function RegisterPage() {
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwValue, setPwValue] = useState('')
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })

  const inputClass = (hasError) =>
    `w-full h-11 rounded-xl border px-4 text-sm text-gray-900 placeholder-gray-400 bg-white transition-all duration-150
     focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900
     ${hasError
       ? 'border-red-400 bg-red-50/30 focus:ring-red-200 focus:border-red-400'
       : 'border-gray-200 hover:border-gray-300'
     }`

  const onSubmit = async (data) => {
    try {
      await new Promise(r => setTimeout(r, 1200))
      const mockDoctor = {
        id: '2',
        full_name: data.full_name,
        email: data.email,
        specialty: data.specialty,
        license: data.license_number,
      }
      setAuth(mockDoctor, 'mock-jwt-token-new')
      toast.success('Account created! Welcome to NeuroScan AI')
      navigate('/dashboard')
    } catch {
      toast.error('Registration failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-50 flex items-center justify-center p-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_8px_40px_rgba(0,0,0,0.1)] p-8">
          <div className="text-center mb-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1E3A5F] mb-4 shadow-lg">
              <Brain className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Syne, sans-serif' }}>
              Create account
            </h1>
            <p className="text-gray-500 text-sm mt-1">Join NeuroScan AI clinical platform</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Field label="Full name" error={errors.full_name?.message}>
              <input
                type="text"
                placeholder="Dr. Yazid Ouali"
                className={inputClass(!!errors.full_name)}
                {...register('full_name')}
              />
            </Field>

            <Field label="Email address" error={errors.email?.message}>
              <input
                type="email"
                placeholder="yazid@gmail.com"
                className={inputClass(!!errors.email)}
                {...register('email')}
              />
            </Field>

            <Field label="Password" error={errors.password?.message}>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  className={inputClass(!!errors.password) + ' pr-11'}
                  {...register('password', { onChange: (e) => setPwValue(e.target.value) })}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors">
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <PasswordStrength password={pwValue} />
            </Field>

            <Field label="Confirm password" error={errors.confirm_password?.message}>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat password"
                  className={inputClass(!!errors.confirm_password) + ' pr-11'}
                  {...register('confirm_password')}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors">
                  {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="License number" error={errors.license_number?.message}>
                <input
                  type="text"
                  placeholder="NRL-2024-001"
                  className={inputClass(!!errors.license_number)}
                  {...register('license_number')}
                />
              </Field>

              <Field label="Specialty" error={errors.specialty?.message}>
                <select
                  className={inputClass(!!errors.specialty) + ' cursor-pointer'}
                  defaultValue=""
                  {...register('specialty')}
                >
                  <option value="" disabled>Select...</option>
                  {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 mt-2 rounded-xl bg-[#1E3A5F] text-white font-semibold text-sm
                hover:bg-[#2E5FA3] active:bg-[#152C47] transition-all duration-150
                disabled:opacity-60 disabled:cursor-not-allowed
                flex items-center justify-center gap-2 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Creating account...
                </>
              ) : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-[#1E3A5F] font-semibold hover:text-[#2E5FA3] transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
