import { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Calendar, Mail, Hash, Stethoscope } from 'lucide-react'
import { Card } from '../design-system/components'
import { Input } from '../design-system/components'
import Button from '../design-system/components/Button'
import { useAuthStore } from '../store'
import toast from 'react-hot-toast'

const profileSchema = z.object({ full_name: z.string().min(2), specialty: z.string().min(1) })
const passwordSchema = z.object({
  current_password: z.string().min(1, 'Required'),
  new_password: z.string().min(8, 'Min 8 characters').regex(/\d/, 'Must include a number'),
  confirm_password: z.string(),
}).refine(d => d.new_password === d.confirm_password, { message: "Passwords don't match", path: ['confirm_password'] })

const specialties = ['Neurology', 'Radiology', 'Oncology', 'Neurosurgery', 'General Practice', 'Other']

function AvatarLarge({ name }) {
  const initials = name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'DR'
  return (
    <div className="h-24 w-24 rounded-3xl bg-navy flex items-center justify-center flex-shrink-0">
      <span className="font-display text-white text-3xl font-bold">{initials}</span>
    </div>
  )
}

export default function ProfilePage() {
  const { doctor, updateDoctor } = useAuthStore()
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPw, setSavingPw] = useState(false)

  const { register: regProfile, handleSubmit: handleProfile, formState: { errors: errP } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: doctor?.full_name, specialty: doctor?.specialty },
  })

  const { register: regPw, handleSubmit: handlePw, formState: { errors: errPw }, reset: resetPw } = useForm({ resolver: zodResolver(passwordSchema) })

  const onSaveProfile = async (data) => {
    setSavingProfile(true)
    await new Promise(r => setTimeout(r, 800))
    updateDoctor(data)
    toast.success('Profile updated successfully')
    setSavingProfile(false)
  }

  const onSavePw = async (data) => {
    setSavingPw(true)
    await new Promise(r => setTimeout(r, 800))
    toast.success('Password changed successfully')
    resetPw()
    setSavingPw(false)
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-1">
          <Card className="text-center h-full">
            <div className="flex flex-col items-center gap-4 py-4">
              <AvatarLarge name={doctor?.full_name} />
              <div>
                <h2 className="font-display text-xl font-bold text-gray-900">{doctor?.full_name}</h2>
                <p className="text-muted text-sm">{doctor?.specialty}</p>
              </div>
              <div className="w-full space-y-2.5 text-left mt-2">
                {[
                  { icon: Mail, label: 'Email', value: doctor?.email },
                  { icon: Hash, label: 'License', value: doctor?.license || 'NRL-2024-001' },
                  { icon: Stethoscope, label: 'Specialty', value: doctor?.specialty },
                  { icon: Calendar, label: 'Member since', value: 'July 2025' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-bg">
                    <Icon size={15} className="text-muted flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted">{label}</p>
                      <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Edit forms */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2 space-y-5">
          {/* Profile form */}
          <Card header={<p className="font-display font-semibold text-gray-900">Edit Profile</p>}>
            <form onSubmit={handleProfile(onSaveProfile)} className="space-y-4">
              <Input label="Full name" placeholder="Dr. Jane Smith" error={errP.full_name?.message} {...regProfile('full_name')} />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Specialty</label>
                <select className="h-10 rounded-lg border border-border px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy" {...regProfile('specialty')}>
                  {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex justify-end">
                <Button type="submit" loading={savingProfile}>Save changes</Button>
              </div>
            </form>
          </Card>

          {/* Password form */}
          <Card header={<p className="font-display font-semibold text-gray-900">Change Password</p>}>
            <form onSubmit={handlePw(onSavePw)} className="space-y-4">
              <Input label="Current password" type="password" placeholder="••••••••" error={errPw.current_password?.message} {...regPw('current_password')} />
              <Input label="New password" type="password" placeholder="Min. 8 characters with a number" error={errPw.new_password?.message} {...regPw('new_password')} />
              <Input label="Confirm new password" type="password" placeholder="Repeat new password" error={errPw.confirm_password?.message} {...regPw('confirm_password')} />
              <div className="flex justify-end">
                <Button type="submit" loading={savingPw}>Update password</Button>
              </div>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
