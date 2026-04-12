// Input.jsx
export function Input({ label, error, helper, icon, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">{icon}</span>}
        <input
          className={`w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-gray-900 placeholder-gray-400 transition-all
            focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy
            disabled:bg-gray-50 disabled:text-muted
            ${error ? 'border-danger focus:ring-danger/20 focus:border-danger' : ''}
            ${icon ? 'pl-9' : ''}
            ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      {helper && !error && <p className="text-xs text-muted">{helper}</p>}
    </div>
  )
}

// Badge.jsx
const badgeVariants = {
  success: 'bg-success/10 text-success',
  danger: 'bg-danger/10 text-danger',
  warning: 'bg-warning/10 text-warning',
  neutral: 'bg-gray-100 text-gray-600',
  navy: 'bg-navy/10 text-navy',
}
export function Badge({ children, variant = 'neutral', className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badgeVariants[variant]} ${className}`}>
      {children}
    </span>
  )
}

// Card.jsx
export function Card({ children, header, footer, className = '', padding = true }) {
  return (
    <div className={`bg-white rounded-xl border border-border shadow-card ${className}`}>
      {header && <div className="px-5 py-4 border-b border-border">{header}</div>}
      <div className={padding ? 'p-5' : ''}>{children}</div>
      {footer && <div className="px-5 py-4 border-t border-border bg-gray-50 rounded-b-xl">{footer}</div>}
    </div>
  )
}

// Spinner.jsx
export function Spinner({ size = 'md', className = '' }) {
  const s = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' }[size]
  return (
    <svg className={`animate-spin text-navy ${s} ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
    </svg>
  )
}

// Avatar.jsx
export function Avatar({ name = '', size = 'md', className = '' }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const s = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-12 w-12 text-base' }[size]
  return (
    <div className={`rounded-full bg-navy text-white font-semibold flex items-center justify-center flex-shrink-0 ${s} ${className}`}>
      {initials}
    </div>
  )
}

// Modal.jsx
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
export function Modal({ open, onClose, title, children, size = 'md' }) {
  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' }
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }}
            className={`relative bg-white rounded-xl shadow-modal w-full ${widths[size]} z-10`}>
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h3 className="font-semibold text-gray-900 font-display">{title}</h3>
                <button onClick={onClose} className="text-muted hover:text-gray-900 transition-colors">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                </button>
              </div>
            )}
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
