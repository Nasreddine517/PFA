import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Stage, Layer, Image as KonvaImage, Rect, Text as KonvaText } from 'react-konva'
import { AlertTriangle, CheckCircle, ZoomIn, ZoomOut, RotateCcw, Eye, EyeOff, Download, FileText, MapPin, Ruler, Activity } from 'lucide-react'
import { useScanStore } from '../store'

const mockScan = {
  id: 'mock-scan-id',
  patient: { full_name: 'Ahmed Benali', age: 47, gender: 'Male', scan_date: '2025-07-14', patient_id: 'PAT-12345678' },
  tumor_detected: true,
  confidence: 94.2,
  bounding_box: { x: 160, y: 100, width: 120, height: 100 },
}

// Predefined scans for history navigation
const predefinedScans = {
  'scan-1': { patient: { full_name: 'Ahmed Benali', age: 47, gender: 'Male', scan_date: '2025-07-14', patient_id: 'PAT-12345678' }, tumor_detected: true, confidence: 94.2, bounding_box: { x: 160, y: 100, width: 120, height: 100 } },
  'scan-2': { patient: { full_name: 'Marie Dupont', age: 34, gender: 'Female', scan_date: '2025-07-13', patient_id: 'PAT-12345679' }, tumor_detected: false, confidence: 98.7, bounding_box: null },
  'scan-3': { patient: { full_name: 'Carlos Rivera', age: 55, gender: 'Male', scan_date: '2025-07-12', patient_id: 'PAT-12345680' }, tumor_detected: true, confidence: 87.5, bounding_box: { x: 200, y: 130, width: 100, height: 90 } },
  'scan-4': { patient: { full_name: 'Fatima Al-Hassan', age: 42, gender: 'Female', scan_date: '2025-07-11', patient_id: 'PAT-12345681' }, tumor_detected: false, confidence: 99.1, bounding_box: null },
  'scan-5': { patient: { full_name: 'James Okafor', age: 61, gender: 'Male', scan_date: '2025-07-10', patient_id: 'PAT-12345682' }, tumor_detected: true, confidence: 91.3, bounding_box: { x: 180, y: 150, width: 110, height: 95 } },
  'scan-6': { patient: { full_name: 'Yuki Tanaka', age: 38, gender: 'Female', scan_date: '2025-07-09', patient_id: 'PAT-12345683' }, tumor_detected: false, confidence: 97.4, bounding_box: null },
  'scan-7': { patient: { full_name: 'Sofia Rossi', age: 49, gender: 'Female', scan_date: '2025-07-08', patient_id: 'PAT-12345684' }, tumor_detected: true, confidence: 88.9, bounding_box: { x: 150, y: 120, width: 130, height: 105 } },
  'scan-8': { patient: { full_name: 'Omar Khalil', age: 53, gender: 'Male', scan_date: '2025-07-07', patient_id: 'PAT-12345685' }, tumor_detected: false, confidence: 96.2, bounding_box: null },
}

function CircularProgress({ value }) {
  const size = 90, r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ
  const color = value >= 90 ? '#10b981' : value >= 70 ? '#f59e0b' : '#ef4444'
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E2E8F0" strokeWidth="8" />
      <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeLinecap="round" strokeDasharray={circ} initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }} transition={{ duration: 1.2, ease: 'easeOut' }}
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central" fontSize="14" fontWeight="700" fill={color}>{value}%</text>
    </svg>
  )
}

function MRIViewer({ scan, uploadedFile }) {
  const [scale, setScale] = useState(1)
  const [showOverlay, setShowOverlay] = useState(true)
  const [img, setImg] = useState(null)
  const stageW = 480, stageH = 400

  useEffect(() => {
    // Use actual uploaded image if available, otherwise generate placeholder
    if (uploadedFile && uploadedFile.type?.startsWith('image/')) {
      const url = URL.createObjectURL(uploadedFile)
      const image = new window.Image()
      image.src = url
      image.onload = () => setImg(image)
      return () => URL.revokeObjectURL(url)
    }

    // Placeholder brain MRI canvas
    const canvas = document.createElement('canvas')
    canvas.width = stageW; canvas.height = stageH
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#111'
    ctx.fillRect(0, 0, stageW, stageH)
    const grad = ctx.createRadialGradient(240, 200, 20, 240, 200, 180)
    grad.addColorStop(0, '#888'); grad.addColorStop(0.4, '#555'); grad.addColorStop(0.7, '#333'); grad.addColorStop(1, '#111')
    ctx.fillStyle = grad
    ctx.beginPath(); ctx.ellipse(240, 200, 175, 160, 0, 0, Math.PI * 2); ctx.fill()
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2
      const x = 240 + Math.cos(angle) * (80 + Math.random() * 60)
      const y = 200 + Math.sin(angle) * (70 + Math.random() * 50)
      ctx.beginPath(); ctx.arc(x, y, 8 + Math.random() * 15, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${100 + Math.random()*80},${100 + Math.random()*80},${100 + Math.random()*80},0.3)`; ctx.fill()
    }
    ctx.fillStyle = '#222'
    ctx.beginPath(); ctx.ellipse(215, 195, 18, 28, -0.2, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.ellipse(265, 195, 18, 28, 0.2, 0, Math.PI * 2); ctx.fill()
    if (scan.tumor_detected) {
      const tg = ctx.createRadialGradient(235, 165, 0, 235, 165, 55)
      tg.addColorStop(0, 'rgba(255,255,200,0.9)'); tg.addColorStop(0.4, 'rgba(220,200,100,0.6)'); tg.addColorStop(1, 'rgba(150,100,50,0)')
      ctx.fillStyle = tg; ctx.beginPath(); ctx.ellipse(235, 165, 52, 46, 0, 0, Math.PI * 2); ctx.fill()
    }
    const image = new window.Image()
    image.src = canvas.toDataURL()
    image.onload = () => setImg(image)
  }, [uploadedFile, scan.tumor_detected])

  const bb = scan.bounding_box

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">MRI IMAGE</span>
        <div className="flex items-center gap-2">
          <motion.button whileHover={{ scale: 1.1 }} onClick={() => setScale(s => Math.max(0.5, s - 0.15))}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"><ZoomOut size={14} /></motion.button>
          <span className="text-xs text-gray-400 w-10 text-center">{Math.round(scale * 100)}%</span>
          <motion.button whileHover={{ scale: 1.1 }} onClick={() => setScale(s => Math.min(2.5, s + 0.15))}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"><ZoomIn size={14} /></motion.button>
          <motion.button whileHover={{ scale: 1.1 }} onClick={() => setScale(1)}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"><RotateCcw size={14} /></motion.button>
          {scan.tumor_detected && (
            <motion.button whileHover={{ scale: 1.02 }} onClick={() => setShowOverlay(!showOverlay)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${showOverlay ? 'text-white border-transparent' : 'border-gray-200 text-gray-500 hover:border-blue-300'}`}
              style={showOverlay ? { background: 'linear-gradient(135deg, #1E3A5F, #3b82f6)' } : {}}>
              {showOverlay ? <Eye size={12} /> : <EyeOff size={12} />} Overlay
            </motion.button>
          )}
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border border-gray-100 bg-black" style={{ height: 400 }}>
        {img ? (
          <Stage width={stageW} height={stageH} scaleX={scale} scaleY={scale}
            x={(stageW * (1 - scale)) / 2} y={(stageH * (1 - scale)) / 2}>
            <Layer>
              <KonvaImage image={img} width={stageW} height={stageH} />
              {showOverlay && scan.tumor_detected && bb && (
                <>
                  <Rect x={bb.x} y={bb.y} width={bb.width} height={bb.height}
                    fill="rgba(220,38,38,0.18)" stroke="#ef4444" strokeWidth={2.5}
                    dash={[7, 3]} cornerRadius={5} />
                  <Rect x={bb.x} y={bb.y - 26} width={140} height={22} fill="rgba(220,38,38,0.9)" cornerRadius={4} />
                  <KonvaText text={`Tumor region · ${scan.confidence}%`} x={bb.x + 8} y={bb.y - 20}
                    fontSize={11} fill="white" fontStyle="bold" />
                </>
              )}
            </Layer>
          </Stage>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        )}
      </div>
    </div>
  )
}

export default function ScanResultPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { uploadedFile } = useScanStore()

  // Get scan data — from predefined history or mock
  const scanData = predefinedScans[id] || mockScan
  const scan = { id, ...scanData }

  const bb = scan.bounding_box
  const quadrant = bb ? (bb.x < 240 ? (bb.y < 200 ? 'Upper-left' : 'Lower-left') : (bb.y < 200 ? 'Upper-right' : 'Lower-right')) : 'N/A'

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* MRI Viewer */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-5"
          style={{ boxShadow: '0 4px 20px rgba(30,58,95,0.08)' }}>
          <MRIViewer scan={scan} uploadedFile={uploadedFile} />
        </motion.div>

        {/* Results panel */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          className="lg:col-span-2 space-y-4">

          {/* Status */}
          <div className={`rounded-2xl p-4 border ${scan.tumor_detected ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <div className="flex items-center gap-3">
              {scan.tumor_detected
                ? <AlertTriangle className="text-red-500 flex-shrink-0" size={24} />
                : <CheckCircle className="text-emerald-500 flex-shrink-0" size={24} />}
              <div>
                <p className={`font-display font-bold text-lg ${scan.tumor_detected ? 'text-red-600' : 'text-emerald-600'}`}>
                  {scan.tumor_detected ? 'Tumor Detected' : 'No Tumor Detected'}
                </p>
                <p className="text-sm text-gray-500">{scan.tumor_detected ? 'Immediate medical attention recommended' : 'Scan appears clear'}</p>
              </div>
            </div>
          </div>

          {/* Confidence */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4" style={{ boxShadow: '0 4px 20px rgba(30,58,95,0.06)' }}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Detection Confidence</p>
            <div className="flex items-center gap-4">
              <CircularProgress value={scan.confidence} />
              <div>
                <p className="text-3xl font-display font-bold" style={{ color: '#1E3A5F' }}>{scan.confidence}%</p>
                <span className={`inline-flex items-center gap-1 mt-1 text-xs font-bold px-2.5 py-1 rounded-full ${scan.confidence >= 90 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {scan.confidence >= 90 ? '✓ High confidence' : '~ Moderate confidence'}
                </span>
              </div>
            </div>
          </div>

          {/* Tumor details */}
          {scan.tumor_detected && bb && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4" style={{ boxShadow: '0 4px 20px rgba(30,58,95,0.06)' }}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Tumor Details</p>
              <div className="space-y-3">
                {[
                  { icon: MapPin, label: 'Location', value: `${quadrant} region` },
                  { icon: Ruler, label: 'Est. size', value: `${bb.width} × ${bb.height} px` },
                  { icon: Activity, label: 'Confidence', value: `${scan.confidence}%` },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-red-50 flex items-center justify-center"><Icon size={14} className="text-red-500" /></div>
                    <div><p className="text-xs text-gray-400">{label}</p><p className="text-sm font-semibold text-gray-900">{value}</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Patient info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4" style={{ boxShadow: '0 4px 20px rgba(30,58,95,0.06)' }}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Patient Info</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[['Name', scan.patient.full_name], ['Age', `${scan.patient.age} years`], ['Gender', scan.patient.gender], ['Scan date', scan.patient.scan_date]].map(([k, v]) => (
                <div key={k}><p className="text-xs text-gray-400">{k}</p><p className="font-semibold text-gray-900">{v}</p></div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <motion.button whileHover={{ scale: 1.01, boxShadow: '0 8px 25px rgba(30,58,95,0.3)' }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate(`/scan/${id}/report`)}
              className="w-full h-12 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #1E3A5F, #2E5FA3)' }}>
              <FileText size={16} /> View Full Report
            </motion.button>
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
              className="w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all" style={{ color: '#1E3A5F' }}>
              <Download size={16} /> Download PDF
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
