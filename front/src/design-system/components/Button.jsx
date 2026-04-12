import { motion } from 'framer-motion'

const variants = {
  primary: 'bg-navy text-white hover:bg-navy-light active:bg-navy-dark shadow-sm',
  secondary: 'bg-white text-navy border border-border hover:bg-bg active:bg-gray-100',
  danger: 'bg-danger text-white hover:bg-red-700 active:bg-red-800',
  ghost: 'text-navy hover:bg-navy/8 active:bg-navy/12',
  outline: 'border border-navy text-navy hover:bg-navy hover:text-white',
}
const sizes = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
}

export default function Button({ children, variant = 'primary', size = 'md', loading, disabled, icon, className = '', ...props }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
      ) : icon ? <span className="flex-shrink-0">{icon}</span> : null}
      {children}
    </motion.button>
  )
}
