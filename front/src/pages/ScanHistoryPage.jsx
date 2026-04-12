import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Eye, Download, Trash2, ClipboardList, ChevronLeft, ChevronRight, Filter, FileText } from 'lucide-react'
import { Modal } from '../design-system/components'
import toast from 'react-hot-toast'

const allScans = [
  { id: 'scan-1', patient_name: 'Ahmed Benali', patient_id: 'PAT-12345678', date: '2025-07-14', tumor_detected: true, confidence: 94.2 },
  { id: 'scan-2', patient_name: 'Marie Dupont', patient_id: 'PAT-12345679', date: '2025-07-13', tumor_detected: false, confidence: 98.7 },
  { id: 'scan-3', patient_name: 'Carlos Rivera', patient_id: 'PAT-12345680', date: '2025-07-12', tumor_detected: true, confidence: 87.5 },
  { id: 'scan-4', patient_name: 'Fatima Al-Hassan', patient_id: 'PAT-12345681', date: '2025-07-11', tumor_detected: false, confidence: 99.1 },
  { id: 'scan-5', patient_name: 'James Okafor', patient_id: 'PAT-12345682', date: '2025-07-10', tumor_detected: true, confidence: 91.3 },
  { id: 'scan-6', patient_name: 'Yuki Tanaka', patient_id: 'PAT-12345683', date: '2025-07-09', tumor_detected: false, confidence: 97.4 },
  { id: 'scan-7', patient_name: 'Sofia Rossi', patient_id: 'PAT-12345684', date: '2025-07-08', tumor_detected: true, confidence: 88.9 },
  { id: 'scan-8', patient_name: 'Omar Khalil', patient_id: 'PAT-12345685', date: '2025-07-07', tumor_detected: false, confidence: 96.2 },
  { id: 'scan-9', patient_name: 'Lin Wei', patient_id: 'PAT-12345686', date: '2025-07-06', tumor_detected: true, confidence: 92.1 },
  { id: 'scan-10', patient_name: 'Amira Nasser', patient_id: 'PAT-12345687', date: '2025-07-05', tumor_detected: false, confidence: 98.3 },
  { id: 'scan-11', patient_name: 'David Chen', patient_id: 'PAT-12345688', date: '2025-07-04', tumor_detected: true, confidence: 85.7 },
  { id: 'scan-12', patient_name: 'Isabella Santos', patient_id: 'PAT-12345689', date: '2025-07-03', tumor_detected: false, confidence: 99.4 },
]

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-50">
      {[...Array(7)].map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className="skeleton h-4 rounded-full" style={{ width: `${50 + i * 8}%` }} />
        </td>
      ))}
    </tr>
  )
}

export default function ScanHistoryPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [deleteId, setDeleteId] = useState(null)
  const [scans, setScans] = useState(allScans)
  const PER_PAGE = 8

  const filtered = scans.filter(s => {
    const matchSearch = s.patient_name.toLowerCase().includes(search.toLowerCase()) || s.patient_id.includes(search)
    const matchFilter = filter === 'all' || (filter === 'detected' ? s.tumor_detected : !s.tumor_detected)
    return matchSearch && matchFilter
  })
  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const handleDelete = () => {
    setScans(prev => prev.filter(s => s.id !== deleteId))
    setDeleteId(null)
    toast.success('Scan deleted successfully')
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(30,58,95,0.07)' }}>
        {/* Filters */}
        <div className="p-4 flex flex-col sm:flex-row gap-3 border-b border-gray-50" style={{ background: 'linear-gradient(135deg, #f8faff, #eef2f8)' }}>
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by patient name or ID..."
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white" />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            {[['all', 'All'], ['detected', 'Tumor detected'], ['clear', 'Clear']].map(([val, lbl]) => (
              <motion.button key={val} whileTap={{ scale: 0.95 }} onClick={() => { setFilter(val); setPage(1) }}
                className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${filter === val ? 'text-white shadow-sm' : 'text-gray-500 hover:bg-white border border-gray-200'}`}
                style={filter === val ? { background: 'linear-gradient(135deg, #1E3A5F, #2E5FA3)' } : {}}>
                {lbl}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/60">
                {['#', 'Patient', 'Patient ID', 'Date', 'Result', 'Confidence', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: '#eef2f8' }}>
                      <ClipboardList size={24} className="text-gray-400" />
                    </div>
                    <p className="font-semibold text-gray-900">No scans found</p>
                    <p className="text-sm text-gray-400">Try adjusting your search or filter</p>
                    <motion.button whileHover={{ scale: 1.02 }} onClick={() => navigate('/scan/new')}
                      className="px-4 py-2 rounded-xl text-white text-sm font-semibold" style={{ background: 'linear-gradient(135deg, #1E3A5F, #2E5FA3)' }}>
                      Upload first scan
                    </motion.button>
                  </div>
                </td></tr>
              ) : paginated.map((scan, i) => (
                <motion.tr key={scan.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                  className="border-b border-gray-50 last:border-0 hover:bg-blue-50/30 transition-colors group cursor-pointer"
                  onClick={() => navigate(`/scan/${scan.id}/result`)}>
                  <td className="px-5 py-3.5 text-sm text-gray-400 font-mono">{(page - 1) * PER_PAGE + i + 1}</td>
                  <td className="px-5 py-3.5">
                    <span className="font-semibold text-sm text-gray-900 group-hover:text-blue-700 transition-colors">{scan.patient_name}</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-mono text-gray-400">{scan.patient_id}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-400">
                    {new Date(scan.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${scan.tumor_detected ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${scan.tumor_detected ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                      {scan.tumor_detected ? 'Detected' : 'Clear'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${scan.confidence}%`, background: scan.confidence >= 90 ? 'linear-gradient(90deg,#059669,#10b981)' : 'linear-gradient(90deg,#d97706,#f59e0b)' }} />
                      </div>
                      <span className={`text-sm font-bold ${scan.confidence >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>{scan.confidence}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
                        onClick={() => navigate(`/scan/${scan.id}/result`)} title="View result"
                        className="p-1.5 text-gray-400 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all"><Eye size={15} /></motion.button>
                      <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
                        onClick={() => navigate(`/scan/${scan.id}/report`)} title="View report"
                        className="p-1.5 text-gray-400 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all"><FileText size={15} /></motion.button>
                      <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
                        title="Download PDF" className="p-1.5 text-gray-400 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all"><Download size={15} /></motion.button>
                      <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
                        onClick={() => setDeleteId(scan.id)} title="Delete"
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={15} /></motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-50 flex items-center justify-between bg-gray-50/30">
            <p className="text-sm text-gray-400">Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE,filtered.length)} of {filtered.length} scans</p>
            <div className="flex items-center gap-1">
              <motion.button whileHover={{ scale: 1.05 }} disabled={page===1} onClick={() => setPage(p=>p-1)}
                className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"><ChevronLeft size={15} /></motion.button>
              {[...Array(totalPages)].map((_,i) => (
                <motion.button key={i} whileHover={{ scale: 1.05 }} onClick={() => setPage(i+1)}
                  className={`h-8 w-8 rounded-xl text-sm font-semibold transition-all ${page===i+1 ? 'text-white' : 'border border-gray-200 text-gray-500 hover:bg-white'}`}
                  style={page===i+1 ? { background: 'linear-gradient(135deg, #1E3A5F, #2E5FA3)' } : {}}>
                  {i+1}
                </motion.button>
              ))}
              <motion.button whileHover={{ scale: 1.05 }} disabled={page===totalPages} onClick={() => setPage(p=>p+1)}
                className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"><ChevronRight size={15} /></motion.button>
            </div>
          </div>
        )}
      </div>

      {/* Delete modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete scan" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Are you sure you want to delete this scan? This action cannot be undone.</p>
          <div className="flex gap-3 justify-end">
            <motion.button whileHover={{ scale: 1.02 }} onClick={() => setDeleteId(null)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-all">Cancel</motion.button>
            <motion.button whileHover={{ scale: 1.02 }} onClick={handleDelete}
              className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-all">Delete scan</motion.button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
