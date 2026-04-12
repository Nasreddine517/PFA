import api from './axiosInstance'

// auth.api.js
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/profile', data),
  changePassword: (data) => api.patch('/auth/password', data),
}

// scans.api.js
export const scansApi = {
  upload: (formData, onProgress) => api.post('/scans/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => onProgress?.(Math.round((e.loaded * 100) / e.total)),
  }),
  getScan: (id) => api.get(`/scans/${id}`),
  listScans: (params) => api.get('/scans', { params }),
  deleteScan: (id) => api.delete(`/scans/${id}`),
  getStats: () => api.get('/scans/stats'),
}

// reports.api.js
export const reportsApi = {
  getReport: (scanId) => api.get(`/reports/${scanId}`),
  downloadPDF: (scanId) => api.get(`/reports/${scanId}/pdf`, { responseType: 'blob' }),
}
