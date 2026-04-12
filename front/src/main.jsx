import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import AppRouter from './router/AppRouter'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 60 * 5 } }
})

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false } }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center space-y-4">
          <div className="text-6xl">⚠️</div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Something went wrong</h1>
          <p className="text-muted">An unexpected error occurred in the application.</p>
          <button onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-navy text-white rounded-lg font-medium hover:bg-navy-light transition-colors">
            Reload app
          </button>
        </div>
      </div>
    )
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppRouter />
        <Toaster position="top-right" toastOptions={{
          style: { borderRadius: '10px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' },
          success: { iconTheme: { primary: '#16A34A', secondary: '#fff' } },
          error: { iconTheme: { primary: '#DC2626', secondary: '#fff' } },
        }} />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
