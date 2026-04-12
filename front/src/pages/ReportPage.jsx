import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Download, Brain, Printer } from 'lucide-react'
import Button from '../design-system/components/Button'
import { useAuthStore } from '../store'

const mockReport = {
  id: 'RPT-2025-001423',
  date: '2025-07-14',
  patient: { full_name: 'Ahmed Benali', age: 47, gender: 'Male', patient_id: 'PAT-12345678', scan_date: '2025-07-14' },
  tumor_detected: true,
  confidence: 94.2,
  sections: {
    clinical_indication: 'Patient presented with persistent headaches, visual disturbances, and progressive cognitive changes over the past 3 months. Neurological examination revealed mild left-sided weakness. MRI of the brain was requested to evaluate for intracranial pathology.',
    technique: 'Multiplanar, multisequence MRI of the brain was performed on a 3.0 Tesla scanner. Sequences included T1-weighted sagittal, T2-weighted axial, FLAIR axial, diffusion-weighted imaging (DWI), and T1-weighted post-gadolinium contrast sequences in axial, coronal, and sagittal planes. Automated YOLO v11 AI-assisted detection model (confidence: 94.2%) was applied to assist in lesion identification and localization.',
    findings: `A well-defined, heterogeneously enhancing mass lesion is identified in the right frontoparietal region measuring approximately 3.2 cm × 2.8 cm (anteroposterior × transverse dimensions). The lesion demonstrates the following characteristics:

• Signal intensity: Hypointense on T1-weighted sequences, hyperintense on T2/FLAIR
• Enhancement pattern: Marked heterogeneous enhancement following gadolinium contrast administration with a peripheral ring-enhancing component
• Associated findings: Moderate surrounding vasogenic edema extending into the adjacent white matter; mass effect with approximately 4mm midline shift to the left
• Diffusion restriction: Present within the central necrotic core
• No evidence of leptomeningeal enhancement or additional parenchymal lesions identified
• Ventricles: Mild compression of the right lateral ventricle
• Cerebellum and brainstem: Within normal limits`,
    impression: `1. Large heterogeneously enhancing right frontoparietal mass lesion with surrounding vasogenic edema and mild midline shift. The imaging characteristics are highly suspicious for a high-grade primary brain neoplasm, most consistent with glioblastoma multiforme (WHO Grade IV) or metastatic disease.

2. Moderate vasogenic edema and mass effect as described.

3. No additional intracranial metastatic lesions identified on current study.

AI-assisted detection confidence: 94.2% — Findings should be correlated with clinical presentation and may warrant histopathological confirmation.`,
    recommendation: `1. Urgent neurosurgical consultation is strongly recommended given the imaging characteristics and degree of mass effect.
2. Consider advanced MRI sequences including MR Spectroscopy (MRS), MR Perfusion, and functional MRI for surgical planning.
3. Systemic workup to exclude primary malignancy if metastatic disease is a clinical consideration.
4. Correlation with clinical history and laboratory findings is advised.
5. Short-interval follow-up MRI with contrast in 4-6 weeks following any intervention, or sooner if clinically indicated.`,
  }
}

export default function ReportPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { doctor } = useAuthStore()
  const report = mockReport

  return (
    <div className="space-y-4">
      {/* Sticky top bar */}
      <div className="flex items-center justify-between sticky top-0 z-20 bg-bg py-2">
        <Button variant="ghost" onClick={() => navigate(`/scan/${id}/result`)} icon={<ArrowLeft size={16} />} size="sm">
          Back to results
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Printer size={14} />} onClick={() => window.print()}>Print</Button>
          <Button size="sm" icon={<Download size={14} />}>Download PDF</Button>
        </div>
      </div>

      {/* Report document */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto bg-white rounded-2xl border border-border shadow-card overflow-hidden">

        {/* Header */}
        <div className="bg-navy px-8 py-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-white/15 flex items-center justify-center">
                <Brain className="text-white" size={22} />
              </div>
              <div>
                <p className="font-display text-white text-xl font-bold">NeuroScan AI</p>
                <p className="text-white/60 text-xs">Clinical MRI Analysis Platform</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white font-semibold text-lg">Radiology Report</p>
              <p className="text-white/60 text-xs mt-0.5">Report ID: {report.id}</p>
              <p className="text-white/60 text-xs">Date: {new Date(report.date).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</p>
            </div>
          </div>
        </div>

        {/* Status banner */}
        <div className={`px-8 py-3 flex items-center gap-2 ${report.tumor_detected ? 'bg-danger/8 border-b border-danger/20' : 'bg-success/8 border-b border-success/20'}`}>
          <div className={`h-2 w-2 rounded-full ${report.tumor_detected ? 'bg-danger' : 'bg-success'}`} />
          <span className={`text-sm font-semibold ${report.tumor_detected ? 'text-danger' : 'text-success'}`}>
            {report.tumor_detected ? 'ABNORMAL — Tumor Detected' : 'NORMAL — No Pathology Identified'}
          </span>
          <span className="ml-auto text-xs text-muted">AI Confidence: {report.confidence}%</span>
        </div>

        <div className="px-8 py-7 space-y-7">
          {/* Patient info table */}
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">Patient Information</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-bg rounded-xl border border-border">
              {[
                ['Patient ID', report.patient.patient_id],
                ['Full name', report.patient.full_name],
                ['Age', `${report.patient.age} years`],
                ['Gender', report.patient.gender],
                ['Scan date', new Date(report.patient.scan_date).toLocaleDateString()],
                ['Referring doctor', doctor?.full_name || 'Dr. —'],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs text-muted">{k}</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{v}</p>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-border" />

          {/* Report sections */}
          {[
            { key: 'clinical_indication', label: 'Clinical Indication' },
            { key: 'technique', label: 'Technique' },
            { key: 'findings', label: 'Findings' },
            { key: 'impression', label: 'Impression' },
            { key: 'recommendation', label: 'Recommendation' },
          ].map(({ key, label }) => (
            <div key={key}>
              <p className="text-xs font-semibold text-navy uppercase tracking-widest mb-2">{label}</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{report.sections[key]}</p>
            </div>
          ))}

          <hr className="border-border" />

          {/* Signature block */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-muted uppercase tracking-wide mb-3">Reporting Physician</p>
              <div className="border-b-2 border-gray-900 w-48 mb-2" />
              <p className="font-semibold text-gray-900">{doctor?.full_name || 'Dr. —'}</p>
              <p className="text-xs text-muted">{doctor?.specialty || 'Neurologist'}</p>
              <p className="text-xs text-muted font-mono">License: {doctor?.license || 'NRL-2024-001'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted">Report generated</p>
              <p className="text-sm font-medium text-gray-900">{new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</p>
              <p className="text-xs text-muted mt-1 max-w-xs">
                This report was generated with AI assistance. Clinical correlation with patient history and examination findings is required.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-bg rounded-xl p-4 border border-border text-center">
            <p className="text-xs text-muted">
              ⚕ This report is confidential and intended solely for the use of the named patient and authorized medical personnel.
              NeuroScan AI — AI-Assisted Clinical Radiology Platform
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
