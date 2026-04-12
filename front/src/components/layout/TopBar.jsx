import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, Menu, X, Search, FileText } from 'lucide-react'
import { useAuthStore } from '../../store'
import { motion, AnimatePresence } from 'framer-motion'

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/scan/new': 'New MRI Scan',
  '/scan/history': 'Scan History',
  '/profile': 'My Profile',
  '/scan': 'Scan Details',
}

// Mock patient database — matches scan history data
export const mockPatients = [
  { id: 'scan-1', name: 'Ahmed Benali', patient_id: 'PAT-12345678', result: true, confidence: 94.2, date: '2025-07-14' },
  { id: 'scan-2', name: 'Marie Dupont', patient_id: 'PAT-12345679', result: false, confidence: 98.7, date: '2025-07-13' },
  { id: 'scan-3', name: 'Carlos Rivera', patient_id: 'PAT-12345680', result: true, confidence: 87.5, date: '2025-07-12' },
  { id: 'scan-4', name: 'Fatima Al-Hassan', patient_id: 'PAT-12345681', result: false, confidence: 99.1, date: '2025-07-11' },
  { id: 'scan-5', name: 'James Okafor', patient_id: 'PAT-12345682', result: true, confidence: 91.3, date: '2025-07-10' },
  { id: 'scan-6', name: 'Yuki Tanaka', patient_id: 'PAT-12345683', result: false, confidence: 97.4, date: '2025-07-09' },
  { id: 'scan-7', name: 'Sofia Rossi', patient_id: 'PAT-12345684', result: true, confidence: 88.9, date: '2025-07-08' },
  { id: 'scan-8', name: 'Omar Khalil', patient_id: 'PAT-12345685', result: false, confidence: 96.2, date: '2025-07-07' },
]

export default function TopBar({ onMenuToggle, menuOpen }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { doctor, logout } = useAuthStore()

  const title = Object.entries(pageTitles).find(([k]) => location.pathname.startsWith(k))?.[1] || 'NeuroScan AI'
  const initials = (doctor?.full_name || 'Dr').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  // Search logic
  useEffect(() => {
    if (searchQuery.trim().length < 1) { setSearchResults([]); return }
    const q = searchQuery.toLowerCase()
    const results = mockPatients.filter(p =>
      p.name.toLowerCase().includes(q) || p.patient_id.toLowerCase().includes(q)
    )
    setSearchResults(results)
  }, [searchQuery])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelectPatient = (patient) => {
    setSearchOpen(false)
    setSearchQuery('')
    navigate(`/scan/${patient.id}/result`)
  }

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center px-5 gap-4 sticky top-0 z-30"
      style={{ boxShadow: '0 1px 0 rgba(30,58,95,0.06), 0 4px 16px rgba(30,58,95,0.04)' }}>

      <button className="md:hidden text-navy-700 p-1.5 rounded-lg hover:bg-gray-50 transition-colors" onClick={onMenuToggle}>
        <motion.div animate={{ rotate: menuOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </motion.div>
      </button>

      <motion.h1 key={title} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
        className="font-display font-bold text-navy-700 text-xl flex-1" style={{ color: '#1E3A5F' }}>{title}</motion.h1>

      {/* Search bar with live results */}
      <div ref={searchRef} className="hidden md:block relative">
        <div className={`flex items-center gap-2 h-9 px-3 rounded-xl border text-sm transition-all duration-200 ${searchOpen ? 'border-blue-400 bg-white w-64 shadow-sm' : 'border-gray-200 bg-gray-50 w-48 hover:border-gray-300'}`}>
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search patients..."
            className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchResults([]) }} className="text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Search results dropdown */}
        <AnimatePresence>
          {searchOpen && searchResults.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-gray-100 py-2 z-50 overflow-hidden"
              style={{ boxShadow: '0 20px 60px rgba(30,58,95,0.15)' }}>
              <p className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                {searchResults.length} patient{searchResults.length > 1 ? 's' : ''} found
              </p>
              {searchResults.map(patient => (
                <motion.button key={patient.id} whileHover={{ backgroundColor: '#f8faff' }}
                  onClick={() => handleSelectPatient(patient)}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: patient.result ? 'linear-gradient(135deg, #dc2626, #ef4444)' : 'linear-gradient(135deg, #059669, #10b981)' }}>
                    {patient.name.split(' ').map(w => w[0]).join('').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{patient.name}</p>
                    <p className="text-xs text-gray-400">{patient.patient_id} · {new Date(patient.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${patient.result ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {patient.result ? '⚠ Tumor' : '✓ Clear'}
                    </span>
                    <span className="text-[10px] text-gray-400">{patient.confidence}%</span>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
          {searchOpen && searchQuery.length > 0 && searchResults.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-gray-100 p-4 z-50 text-center"
              style={{ boxShadow: '0 20px 60px rgba(30,58,95,0.15)' }}>
              <p className="text-sm text-gray-500">No patient found for "<span className="font-semibold">{searchQuery}</span>"</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bell */}
      <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
        className="relative p-2 text-gray-400 hover:text-navy-700 hover:bg-gray-50 rounded-xl transition-colors">
        <Bell size={18} />
        <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full">
          <span className="absolute inset-0 h-2 w-2 bg-red-500 rounded-full animate-ping opacity-60" />
        </span>
      </motion.button>

      {/* Profile */}
      <div className="relative">
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1E3A5F, #2E5FA3)' }}>
            {initials}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-semibold leading-tight max-w-[110px] truncate" style={{ color: '#1E3A5F' }}>{doctor?.full_name}</p>
            <p className="text-[10px] text-gray-400 leading-tight">{doctor?.specialty}</p>
          </div>
          <motion.div animate={{ rotate: dropdownOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={14} className="text-gray-400" />
          </motion.div>
        </motion.button>

        <AnimatePresence>
          {dropdownOpen && (
            <motion.div initial={{ opacity: 0, scale: 0.95, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }} transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl border border-gray-100 py-1.5 z-50"
              style={{ boxShadow: '0 20px 60px rgba(30,58,95,0.15)' }}>
              <button onClick={() => { navigate('/profile'); setDropdownOpen(false) }}
                className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors" style={{ color: '#1E3A5F' }}>
                View profile
              </button>
              <hr className="my-1 border-gray-50" />
              <button onClick={() => { logout(); navigate('/login') }}
                className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                Sign out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
