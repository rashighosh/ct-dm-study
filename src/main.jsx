/* eslint-disable react-refresh/only-export-components -- entry point, not itself Fast-Refreshed */
import { createRoot } from 'react-dom/client'
import { Suspense, lazy } from 'react'
import './index.css'
import { BrowserRouter, Routes, Route } from 'react-router'
import Adaptive from './components/Adaptive.jsx'
import SelectTopics from './components/SelectTopics.jsx'
const NotesReview = lazy(() => import('./components/NotesReview'))
const AdaptiveNotesReview = lazy(
  () => import('./components/AdaptiveNotesReview'),
)

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Suspense fallback={null}>
      <Routes>
        <Route path="/conversation" element={<Adaptive />} />
        <Route path="/notes-review" element={<NotesReview />} />
        <Route path="/" element={<SelectTopics />} />
        <Route
          path="/interaction-notes-review"
          element={<AdaptiveNotesReview />}
        />
      </Routes>
    </Suspense>
  </BrowserRouter>,
)
