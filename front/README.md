# NeuroScan AI — Frontend

Clinical MRI Analysis Platform for brain cancer detection.

## Tech Stack
- React 18 + Vite
- Tailwind CSS (DM Sans + Syne fonts)
- React Router v6
- Zustand (auth + scan state)
- TanStack Query
- Framer Motion
- React Hook Form + Zod
- React Dropzone
- Konva.js (MRI bounding box overlay)
- React Hot Toast

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

App runs at: http://localhost:5173

## Demo Login
Use any email/password on the login screen (mock auth is enabled).

## Project Structure
```
src/
├── api/              ← Axios instance + API modules
├── store/            ← Zustand stores (auth, scan)
├── router/           ← AppRouter + ProtectedRoute
├── design-system/    ← Color tokens + base components
├── components/       ← Layout, scan, report, dashboard components
└── pages/            ← All 8 pages
```

## Pages
| Route | Page |
|---|---|
| /login | Login |
| /register | Register |
| /dashboard | Dashboard |
| /scan/new | New Scan (3-step) |
| /scan/:id/result | Scan Result + MRI Viewer |
| /scan/:id/report | Medical Report |
| /scan/history | Scan History |
| /profile | Doctor Profile |

## Backend Integration
Replace mock data in pages with real API calls from `src/api/index.js`.
Set your backend URL in `.env`:
```
VITE_API_URL=http://localhost:8000/api
```
