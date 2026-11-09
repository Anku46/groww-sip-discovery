import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/layout/ErrorBoundary'
import { Header } from './components/layout/Header'
import { SettingsDrawer } from './components/layout/SettingsDrawer'
import { Loading } from './components/ui/States'

const Tab1 = lazy(() => import('./tabs/tab1/Tab1LivePipeline'))
const Tab2 = lazy(() => import('./tabs/tab2/Tab2OpportunityMatrix'))
const Tab3 = lazy(() => import('./tabs/tab3/Tab3DatasetExplorer'))
const Tab4 = lazy(() => import('./tabs/tab4/Tab4EvidenceLog'))

const routes = [
  { path: '/', el: <Tab1 />, label: 'The pipeline' },
  { path: '/opportunity-matrix', el: <Tab2 />, label: 'The opportunity matrix' },
  { path: '/dataset-explorer', el: <Tab3 />, label: 'The dataset explorer' },
  { path: '/evidence-log', el: <Tab4 />, label: 'The evidence log' },
]

export function AppRoutes() {
  return (
    <Routes>
      {routes.map((r) => (
        <Route key={r.path} path={r.path} element={<ErrorBoundary label={r.label}>{r.el}</ErrorBoundary>} />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary label="The app">
      <HashRouter>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-slate focus:px-3 focus:py-2"
          onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus() }}>
          Skip to content
        </a>
        <Header />
        <main id="main" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-6 outline-none md:px-6">
          <Suspense fallback={<Loading label="Loading section" lines={6} />}>
            <AppRoutes />
          </Suspense>
        </main>
        <SettingsDrawer />
      </HashRouter>
    </ErrorBoundary>
  )
}
