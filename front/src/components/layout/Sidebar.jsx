import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ScanLine, ClipboardList, UserCircle, LogOut, Brain, Wifi, AlertTriangle, CheckCircle } from 'lucide-react'
import { useAuthStore } from '../../store'
import { motion, AnimatePresence } from 'framer-motion'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/scan/new', icon: ScanLine, label: 'New Scan' },
  { to: '/scan/history', icon: ClipboardList, label: 'Scan History' },
  { to: '/profile', icon: UserCircle, label: 'Profile' },
]

const mockRiskFeed = [
  { id: 1, name: 'Ahmed B.', risk: 'critical', label: 'Tumor detected', time: '2 min ago', confidence: 94 },
  { id: 2, name: 'Marie D.', risk: 'clear', label: 'No pathology', time: '18 min ago', confidence: 99 },
  { id: 3, name: 'Carlos R.', risk: 'warning', label: 'Moderate risk', time: '41 min ago', confidence: 78 },
]

const riskColors = {
  critical: { dot: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  warning: { dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' },
  clear: { dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
}

function AIStatusBadge() {
  const [processing, setProcessing] = useState(false)
  useEffect(() => {
    const interval = setInterval(() => {
      setProcessing(true)
      setTimeout(() => setProcessing(false), 2000)
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="mx-3 mb-3 p-3 rounded-xl glass border border-white/10">
      <div className="flex items-center gap-2.5">
        <div className="relative flex-shrink-0">
          <div className={`h-2.5 w-2.5 rounded-full ${processing ? 'bg-amber-400' : 'bg-emerald-400'}`} />
          <div className={`absolute inset-0 h-2.5 w-2.5 rounded-full ${processing ? 'bg-amber-400' : 'bg-emerald-400'} animate-ping2 opacity-60`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-semibold truncate">{processing ? 'Processing...' : 'AI Model Online'}</p>
          <p className="text-white/40 text-[10px]">Detection System</p>
        </div>
        <Wifi size={13} className="text-emerald-400 flex-shrink-0" />
      </div>
      {processing && (
        <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div className="h-full bg-amber-400 rounded-full"
            animate={{ x: ['-100%', '100%'] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: '40%' }} />
        </div>
      )}
    </div>
  )
}

function QuickStats() {
  const stats = [
    { label: 'Today', value: '7', sub: 'scans' },
    { label: 'Found', value: '2', sub: 'tumors' },
    { label: 'Rate', value: '96%', sub: 'accuracy' },
  ]
  return (
    <div className="mx-3 mb-3 grid grid-cols-3 gap-1.5">
      {stats.map((s, i) => (
        <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }}
          className="glass rounded-xl p-2 text-center border border-white/10">
          <p className="text-white font-bold text-sm leading-tight">{s.value}</p>
          <p className="text-white/40 text-[9px] uppercase tracking-wide leading-tight">{s.sub}</p>
        </motion.div>
      ))}
    </div>
  )
}

function PatientRiskFeed() {
  return (
    <div className="mx-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold">Patient Risk Feed</p>
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
      </div>
      <div className="space-y-1.5">
        {mockRiskFeed.map((patient, i) => {
          const c = riskColors[patient.risk]
          return (
            <motion.div key={patient.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.08 }}
              className={`flex items-center gap-2.5 p-2 rounded-xl border ${c.bg} cursor-pointer hover:brightness-110 transition-all`}>
              <div className="relative flex-shrink-0">
                <div className={`h-2 w-2 rounded-full ${c.dot}`} />
                {patient.risk === 'critical' && <div className={`absolute inset-0 h-2 w-2 rounded-full ${c.dot} animate-ping2`} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold truncate">{patient.name}</p>
                <p className={`text-[10px] truncate ${c.text}`}>{patient.label}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-white/40 text-[9px]">{patient.time}</p>
                <p className={`text-[10px] font-bold ${c.text}`}>{patient.confidence}%</p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

export default function Sidebar({ mobile, onClose }) {
  const { doctor, logout } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'linear-gradient(180deg, #0d1e30 0%, #1E3A5F 45%, #1a3560 100%)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/8">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}
          className="h-10 w-10 rounded-xl flex items-center justify-center animate-glow"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>
          <Brain className="h-5 w-5 text-white" />
        </motion.div>
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
          <div className="font-display text-white font-bold text-base leading-tight">NeuroScan AI</div>
          <div className="text-white/40 text-[10px] uppercase tracking-widest">Clinical Platform</div>
        </motion.div>
      </div>

      {/* Nav */}
      <nav className="px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }, i) => (
          <motion.div key={to} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + i * 0.06 }}>
            <NavLink to={to} onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden
                ${isActive ? 'bg-white text-navy-700 shadow-lg' : 'text-white/65 hover:text-white hover:bg-white/10'}`
              }>
              {({ isActive }) => (
                <>
                  {isActive && <motion.div layoutId="activeNav" className="absolute inset-0 bg-white rounded-xl" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
                  <Icon size={17} className={`relative z-10 flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-navy-700' : ''}`} />
                  <span className="relative z-10">{label}</span>
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      <div className="mx-4 mb-3 h-px bg-white/8" />

      {/* AI Status */}
      <AIStatusBadge />
      {/* Quick Stats */}
      <QuickStats />
      {/* Patient Risk Feed */}
      <PatientRiskFeed />

      {/* Doctor info */}
      <div className="mt-auto px-3 pb-4 pt-2 border-t border-white/8">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/8">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>
            {(doctor?.full_name || 'D').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-semibold truncate">{doctor?.full_name || 'Doctor'}</div>
            <div className="text-white/40 text-[10px] truncate">{doctor?.specialty || 'Specialist'}</div>
          </div>
          <motion.button whileHover={{ scale: 1.1, rotate: 10 }} whileTap={{ scale: 0.9 }}
            onClick={() => { logout(); navigate('/login') }} className="text-white/40 hover:text-red-400 transition-colors">
            <LogOut size={14} />
          </motion.button>
        </div>
      </div>
    </div>
  )
}
