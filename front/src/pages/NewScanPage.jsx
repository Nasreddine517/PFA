import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Upload, X, Check, Brain, ChevronRight, ChevronLeft } from 'lucide-react'
import { useScanStore } from '../store'
import toast from 'react-hot-toast'

const patientSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  age: z.string().min(1, 'Age is required').refine(v => { const n = parseInt(v); return !isNaN(n) && n >= 1 && n <= 120 }, 'Age must be between 1 and 120'),
  gender: z.enum(['Male', 'Female', 'Other'], { required_error: 'Please select a gender' }),
  scan_date: z.string().min(1, 'Scan date is required'),
  notes: z.string().optional(),
})

// No YOLO mention in analysis steps
const analysisSteps = [
  { label: 'Image received and validated', duration: 700 },
  { label: 'Preprocessing MRI scan...', duration: 1500 },
  { label: 'Running AI detection model...', duration: 2800 },
  { label: 'Analyzing detected regions...', duration: 2000 },
  { label: 'Generating medical report with AI...', duration: 2500 },
  { label: 'Compiling PDF report...', duration: 900 },
]

function StepIndicator({ current }) {
  const steps = ['Patient Info', 'MRI Upload', 'Analysis']
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className="flex flex-col items-center gap-2">
            <motion.div whileHover={{ scale: 1.05 }}
              className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-all duration-300 ${i <= current ? 'text-white' : 'bg-white text-gray-400 border-2 border-gray-200'}`}
              style={i <= current ? { background: 'linear-gradient(135deg, #1E3A5F, #3b82f6)' } : {}}>
              {i < current ? <Check size={15} /> : i + 1}
            </motion.div>
            <span className={`text-xs font-semibold whitespace-nowrap ${i === current ? 'text-blue-700' : i < current ? 'text-blue-500' : 'text-gray-400'}`}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div className="w-16 h-0.5 mx-3 mb-5 rounded-full overflow-hidden bg-gray-200">
              <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #1E3A5F, #3b82f6)' }}
                animate={{ width: i < current ? '100%' : '0%' }} transition={{ duration: 0.5 }} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function Field({ label, error, children, optional }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
        {label} {optional && <span className="text-gray-400 normal-case font-normal">(optional)</span>}
      </label>
      {children}
      <AnimatePresence>
        {error && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
          className="text-xs text-red-500 font-medium">⚠ {error}</motion.p>}
      </AnimatePresence>
    </div>
  )
}

const inputCls = (err) =>
  `w-full h-11 rounded-xl border px-4 text-sm text-gray-900 placeholder-gray-400 bg-white transition-all duration-200
   focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-300
   ${err ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`

function PatientForm({ onNext }) {
  const { setPatientInfo, patientInfo } = useScanStore()
  const patientId = `PAT-${Date.now().toString().slice(-8)}`
  const today = new Date().toISOString().split('T')[0]

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(patientSchema),
    mode: 'onSubmit', reValidateMode: 'onChange',
    defaultValues: { full_name: '', age: '', gender: 'Male', scan_date: today, notes: '' },
  })

  const onSubmit = (data) => {
    setPatientInfo({ ...data, age: parseInt(data.age), patient_id: patientId })
    onNext()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient ID</label>
        <div className="mt-1.5 flex items-center gap-2 h-11 px-4 rounded-xl border border-gray-100 bg-gray-50">
          <span className="text-sm font-mono font-bold" style={{ color: '#1E3A5F' }}>{patientId}</span>
          <span className="text-xs text-gray-400 ml-auto bg-gray-200 px-2 py-0.5 rounded-full">Auto-generated</span>
        </div>
      </div>
      <Field label="Full name" error={errors.full_name?.message}>
        <input type="text" placeholder="Mohamed Rehmouni" className={inputCls(errors.full_name)} {...register('full_name')} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Age" error={errors.age?.message}>
          <input type="number" min="1" max="120" placeholder="45" className={inputCls(errors.age)} {...register('age')} />
        </Field>
        <Field label="Gender" error={errors.gender?.message}>
          <div className="flex gap-2 h-11">
            {['Male', 'Female', 'Other'].map(g => (
              <label key={g} className="flex-1 cursor-pointer">
                <input type="radio" value={g} className="peer sr-only" {...register('gender')} />
                <div className="h-full flex items-center justify-center rounded-xl border border-gray-200 text-sm font-medium text-gray-500 cursor-pointer transition-all duration-200 peer-checked:text-white peer-checked:border-transparent hover:border-gray-300"
                  style={{}}>
                  {g}
                </div>
                <style>{`.peer:checked + div { background: linear-gradient(135deg, #1E3A5F, #3b82f6); color: white !important; border-color: transparent; }`}</style>
              </label>
            ))}
          </div>
        </Field>
      </div>
      <Field label="Scan date" error={errors.scan_date?.message}>
        <input type="date" className={inputCls(errors.scan_date)} {...register('scan_date')} />
      </Field>
      <Field label="Medical history notes" optional>
        <textarea rows={3} placeholder="Relevant symptoms, history..." className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-300 transition-all" {...register('notes')} />
      </Field>
      <motion.button type="submit" whileHover={{ scale: 1.01, boxShadow: '0 8px 25px rgba(30,58,95,0.35)' }} whileTap={{ scale: 0.97 }}
        className="w-full h-12 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg, #1E3A5F, #2E5FA3)' }}>
        Next — Upload MRI <ChevronRight size={17} />
      </motion.button>
    </form>
  )
}

function UploadForm({ onNext, onBack }) {
  const { uploadedFile, setUploadedFile } = useScanStore()
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState(null)

  const onDrop = useCallback((accepted, rejected) => {
    setError('')
    if (rejected.length) { setError('Invalid file or size exceeded (max 50MB)'); return }
    const file = accepted[0]
    setUploadedFile(file)
    // Create preview URL for image files
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }, [setUploadedFile])

  const handleRemove = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setUploadedFile(null)
    setPreviewUrl(null)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg'], 'application/dicom': ['.dcm'] },
    maxSize: 50 * 1024 * 1024,
    multiple: false,
  })

  return (
    <div className="space-y-5">
      <AnimatePresence mode="wait">
        {!uploadedFile ? (
          <motion.div key="dropzone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            {...getRootProps()}
            className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300 min-h-[280px]
              ${isDragActive ? 'border-blue-500 bg-blue-50 scale-[1.01]' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/30'}`}>
            <input {...getInputProps()} />
            <motion.div animate={isDragActive ? { scale: 1.15, rotate: 5 } : { scale: 1, rotate: 0 }}
              className="h-16 w-16 rounded-2xl flex items-center justify-center"
              style={{ background: isDragActive ? 'linear-gradient(135deg, #3b82f6, #06b6d4)' : '#eef2f8' }}>
              <Upload size={28} className={isDragActive ? 'text-white' : 'text-blue-700'} />
            </motion.div>
            <div className="text-center">
              <p className="font-bold text-gray-900 text-lg">{isDragActive ? 'Drop it here!' : 'Drop your MRI scan'}</p>
              <p className="text-sm text-gray-500 mt-1">or <span className="text-blue-600 font-medium">click to browse</span></p>
              <p className="text-xs text-gray-400 mt-3 bg-gray-50 px-3 py-1.5 rounded-full">DICOM · PNG · JPEG — max 50MB</p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="file" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 overflow-hidden">
            {/* Image preview — shows actual uploaded image */}
            {previewUrl && (
              <div className="relative w-full bg-black flex items-center justify-center" style={{ maxHeight: '320px' }}>
                <img src={previewUrl} alt="MRI preview" className="w-full object-contain" style={{ maxHeight: '320px' }} />
                <div className="absolute top-3 right-3">
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={handleRemove} className="p-2 bg-black/60 hover:bg-red-600 text-white rounded-xl transition-all backdrop-blur-sm">
                    <X size={16} />
                  </motion.button>
                </div>
                {/* Overlay badge */}
                <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-xl">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-white text-xs font-semibold">Ready for analysis</span>
                </div>
              </div>
            )}
            {/* File info */}
            <div className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{uploadedFile.name}</p>
                <p className="text-sm text-gray-500">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB · {uploadedFile.type || 'DICOM'}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Check size={14} className="text-emerald-600" />
                <span className="text-xs text-emerald-600 font-semibold">Ready</span>
              </div>
              {!previewUrl && (
                <motion.button whileHover={{ scale: 1.1 }} onClick={handleRemove} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                  <X size={16} />
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-500 font-medium">⚠ {error}</motion.p>}

      <div className="flex justify-between gap-3">
        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }} onClick={onBack}
          className="flex items-center gap-2 h-12 px-5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:border-gray-300 hover:bg-gray-50 transition-all">
          <ChevronLeft size={16} /> Back
        </motion.button>
        <motion.button whileHover={{ scale: 1.01, boxShadow: '0 8px 25px rgba(30,58,95,0.35)' }} whileTap={{ scale: 0.97 }}
          onClick={() => { if (!uploadedFile) { setError('Please upload an MRI scan first'); return } onNext() }}
          className="flex-1 h-12 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all"
          style={{ background: uploadedFile ? 'linear-gradient(135deg, #1E3A5F, #2E5FA3)' : '#9ca3af' }}>
          Upload & Analyze <ChevronRight size={16} />
        </motion.button>
      </div>
    </div>
  )
}

function AnalysisProgress({ onComplete }) {
  const [completed, setCompleted] = useState([])
  const [current, setCurrent] = useState(0)

  useState(() => {
    let delay = 0
    analysisSteps.forEach((step, i) => {
      delay += step.duration
      setTimeout(() => {
        setCompleted(prev => [...prev, i])
        setCurrent(i + 1)
        if (i === analysisSteps.length - 1) setTimeout(onComplete, 700)
      }, delay)
    })
  })

  const progress = (completed.length / analysisSteps.length) * 100

  return (
    <div className="text-center space-y-8 py-4">
      <div className="relative flex items-center justify-center h-36">
        {[1, 2, 3].map(i => (
          <motion.div key={i} className="absolute rounded-full border border-blue-300/30"
            style={{ width: `${60 + i * 40}px`, height: `${60 + i * 40}px` }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, delay: i * 0.4, repeat: Infinity }} />
        ))}
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="absolute h-24 w-24 rounded-full border-2 border-dashed border-blue-400/30" />
        <div className="h-16 w-16 rounded-2xl flex items-center justify-center z-10" style={{ background: 'linear-gradient(135deg, #1E3A5F, #3b82f6)' }}>
          <Brain className="text-white" size={30} />
        </div>
      </div>

      <div>
        <h3 className="font-display text-2xl font-bold" style={{ color: '#1E3A5F' }}>Analyzing MRI scan...</h3>
        <p className="text-gray-500 text-sm mt-1">Our AI model is processing the image</p>
      </div>

      <div className="text-left space-y-3 max-w-sm mx-auto">
        {analysisSteps.map((step, i) => {
          const done = completed.includes(i)
          const active = current === i
          return (
            <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
              className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
                style={done ? { background: 'linear-gradient(135deg, #10b981, #059669)' } : active ? { background: 'linear-gradient(135deg, #1E3A5F, #3b82f6)' } : { background: '#f3f4f6' }}>
                {done
                  ? <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}><Check size={12} className="text-white" /></motion.div>
                  : active ? <motion.div className="h-2 w-2 rounded-full bg-white" animate={{ scale: [1, 0.6, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
                  : <div className="h-2 w-2 rounded-full bg-gray-300" />}
              </div>
              <span className={`text-sm font-medium ${done ? 'text-emerald-600' : active ? 'text-blue-800' : 'text-gray-400'}`}>{step.label}</span>
              {done && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-auto text-emerald-500 text-xs font-bold">✓</motion.span>}
            </motion.div>
          )
        })}
      </div>

      <div className="max-w-sm mx-auto">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5"><span>Progress</span><span>{Math.round(progress)}%</span></div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #1E3A5F, #3b82f6, #06b6d4)' }}
            animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
        </div>
      </div>
    </div>
  )
}

export default function NewScanPage() {
  const [step, setStep] = useState(0)
  const navigate = useNavigate()

  const handleComplete = () => {
    toast.success('Analysis complete!')
    navigate('/scan/mock-scan-id/result')
  }

  return (
    <div className="max-w-xl mx-auto">
      <StepIndicator current={step} />
      <motion.div layout className="bg-white rounded-2xl border border-gray-100 p-7" style={{ boxShadow: '0 4px 30px rgba(30,58,95,0.10)' }}>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: step > 0 ? 30 : -30 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: step > 0 ? -30 : 30 }} transition={{ duration: 0.22 }}>
            {step === 0 && <PatientForm onNext={() => setStep(1)} />}
            {step === 1 && <UploadForm onNext={() => setStep(2)} onBack={() => setStep(0)} />}
            {step === 2 && <AnalysisProgress onComplete={handleComplete} />}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
