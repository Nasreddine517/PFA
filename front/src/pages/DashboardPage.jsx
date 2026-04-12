import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ScanLine, TrendingUp, FileText, AlertTriangle, Eye, Download, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react'
import { useAuthStore } from '../store'

const mockStats = [
  { label: 'Total Scans', value: 142, icon: ScanLine, trend: '+12%', up: true, gradient: 'linear-gradient(135deg, #1E3A5F, #2E5FA3)', glow: 'rgba(30,58,95,0.45)' },
  { label: 'Tumors Detected', value: 38, icon: AlertTriangle, trend: '+3%', up: true, gradient: 'linear-gradient(135deg, #b91c1c, #ef4444)', glow: 'rgba(185,28,28,0.45)' },
  { label: 'Detection Rate', value: '26.8%', icon: TrendingUp, trend: '-1.2%', up: false, gradient: 'linear-gradient(135deg, #b45309, #f59e0b)', glow: 'rgba(180,83,9,0.45)' },
  { label: 'Reports Generated', value: 142, icon: FileText, trend: '+12%', up: true, gradient: 'linear-gradient(135deg, #065f46, #10b981)', glow: 'rgba(6,95,70,0.45)' },
]

const mockScans = [
  { id: 'scan-1', patient: 'Ahmed Benali', date: '2025-07-14', result: true, confidence: 94.2 },
  { id: 'scan-2', patient: 'Marie Dupont', date: '2025-07-13', result: false, confidence: 98.7 },
  { id: 'scan-3', patient: 'Carlos Rivera', date: '2025-07-12', result: true, confidence: 87.5 },
  { id: 'scan-4', patient: 'Fatima Al-Hassan', date: '2025-07-11', result: false, confidence: 99.1 },
  { id: 'scan-5', patient: 'James Okafor', date: '2025-07-10', result: true, confidence: 91.3 },
]

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0)
  const isString = typeof value === 'string'
  useEffect(() => {
    if (isString) return
    let start = 0
    const end = parseInt(value)
    const step = end / 40
    const timer = setInterval(() => {
      start += step
      if (start >= end) { setDisplay(end); clearInterval(timer) }
      else setDisplay(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [value])
  return <span>{isString ? value : display}</span>
}

function StatCard({ label, value, icon: Icon, trend, up, gradient, glow, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{
        y: -8,
        scale: 1.03,
        boxShadow: `0 24px 50px ${glow}`,
        transition: { duration: 0.18, ease: 'easeOut' }
      }}
      whileTap={{ scale: 0.97 }}
      className="relative overflow-hidden rounded-2xl p-5 cursor-pointer"
      style={{ background: gradient, boxShadow: `0 4px 20px ${glow.replace('0.45', '0.25')}` }}
    >
      {/* Animated background orbs */}
      <motion.div
        className="absolute top-0 right-0 h-28 w-28 rounded-full"
        style={{ background: 'rgba(255,255,255,0.08)', transform: 'translate(30%, -30%)' }}
        animate={{ scale: [1, 1.15, 1], rotate: [0, 15, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-0 left-0 h-16 w-16 rounded-full"
        style={{ background: 'rgba(255,255,255,0.06)', transform: 'translate(-30%, 30%)' }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />

      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-2">{label}</p>
          <p className="text-white text-3xl font-display font-bold">
            <AnimatedNumber value={value} />
          </p>
          <div className="inline-flex items-center gap-1 mt-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-black/20 text-white/90">
            {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {trend} this month
          </div>
        </div>
        <motion.div
          className="h-11 w-11 rounded-xl bg-white/15 flex items-center justify-center"
          whileHover={{ rotate: 10, scale: 1.1 }}
          transition={{ duration: 0.2 }}
        >
          <Icon size={20} className="text-white" />
        </motion.div>
      </div>
    </motion.div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { doctor } = useAuthStore()

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="space-y-6">
      {/* Greeting banner — no YOLO mention */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6 text-white"
        style={{ background: 'linear-gradient(135deg, #0d1e30 0%, #1E3A5F 60%, #2E5FA3 100%)', boxShadow: '0 8px 32px rgba(30,58,95,0.3)' }}>
        {[...Array(8)].map((_, i) => (
          <motion.div key={i} className="absolute h-1.5 w-1.5 rounded-full bg-blue-400/40"
            style={{ left: `${10 + i * 12}%`, bottom: '20%' }}
            animate={{ y: [0, -80, 0], opacity: [0, 0.8, 0] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.4, ease: 'easeOut' }} />
        ))}
        <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-blue-500/10 -translate-y-12 translate-x-12" />
        <div className="relative z-10">
          <p className="text-blue-300 text-sm font-medium mb-1">{getGreeting()},</p>
          <h2 className="font-display text-2xl font-bold">{doctor?.full_name || 'Doctor'} 👋</h2>
          <p className="text-blue-200/70 text-sm mt-1">Here's your clinical activity overview for today</p>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {mockStats.map((s, i) => <StatCard key={s.label} {...s} delay={i * 0.08} />)}
      </div>

      {/* Recent scans */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
        style={{ boxShadow: '0 4px 20px rgba(30,58,95,0.07)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50"
          style={{ background: 'linear-gradient(135deg, #f8faff, #eef2f8)' }}>
          <div className="flex items-center gap-2">
            <Activity size={17} style={{ color: '#1E3A5F' }} />
            <h3 className="font-display font-bold" style={{ color: '#1E3A5F' }}>Recent Scans</h3>
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/scan/history')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all">
            View all →
          </motion.button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                {['Patient', 'Date', 'Result', 'Confidence', 'Actions'].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockScans.map((scan, i) => (
                <motion.tr key={scan.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.06 }}
                  className="border-b border-gray-50 last:border-0 hover:bg-blue-50/30 transition-colors group cursor-pointer"
                  onClick={() => navigate(`/scan/${scan.id}/result`)}>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-sm text-gray-900 group-hover:text-blue-700 transition-colors">{scan.patient}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(scan.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${scan.result ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${scan.result ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                      {scan.result ? 'Tumor Detected' : 'Clear'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${scan.confidence}%`, background: scan.confidence >= 90 ? 'linear-gradient(90deg, #059669, #10b981)' : 'linear-gradient(90deg, #d97706, #f59e0b)' }} />
                      </div>
                      <span className={`text-sm font-bold ${scan.confidence >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>{scan.confidence}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
                        onClick={() => navigate(`/scan/${scan.id}/result`)}
                        className="p-2 text-gray-400 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all"><Eye size={15} /></motion.button>
                      <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
                        className="p-2 text-gray-400 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all"><Download size={15} /></motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}
