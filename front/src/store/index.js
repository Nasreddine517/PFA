import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      doctor: null,
      token: null,
      isAuthenticated: false,
      setAuth: (doctor, token) => {
        localStorage.setItem('neuroscan_token', token)
        set({ doctor, token, isAuthenticated: true })
      },
      updateDoctor: (data) => set((s) => ({ doctor: { ...s.doctor, ...data } })),
      logout: () => {
        localStorage.removeItem('neuroscan_token')
        set({ doctor: null, token: null, isAuthenticated: false })
      },
    }),
    { name: 'neuroscan-auth', partialize: (s) => ({ doctor: s.doctor, token: s.token, isAuthenticated: s.isAuthenticated }) }
  )
)

export const useScanStore = create((set) => ({
  currentScan: null,
  step: 1,
  patientInfo: null,
  uploadedFile: null,
  analysisResult: null,
  setStep: (step) => set({ step }),
  setPatientInfo: (info) => set({ patientInfo: info }),
  setUploadedFile: (file) => set({ uploadedFile: file }),
  setAnalysisResult: (result) => set({ analysisResult: result }),
  setCurrentScan: (scan) => set({ currentScan: scan }),
  reset: () => set({ currentScan: null, step: 1, patientInfo: null, uploadedFile: null, analysisResult: null }),
}))
