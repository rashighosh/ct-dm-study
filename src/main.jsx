/* eslint-disable react-refresh/only-export-components -- entry point, not itself Fast-Refreshed */
import { createRoot } from 'react-dom/client'
import { Suspense, lazy } from 'react'
import './index.css'
import { BrowserRouter, Routes, Route } from 'react-router'
import Adaptive from './components/Adaptive.jsx'
import SelectTopics from './components/SelectTopics.jsx'
import SelectResources from './components/SelectResources'
import IntroWalkthrough from './components/IntroWalkthrough'
import { CompanionPreviewPage } from './components/CompanionPreview'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Suspense fallback={null}>
      <Routes>
        <Route path="/start" element={<IntroWalkthrough />} />
        <Route path="/" element={<Adaptive />} />
        <Route path="/topics" element={<SelectTopics />} />
        <Route path="/resources" element={<SelectResources />} />
        <Route path="/companion-preview" element={<CompanionPreviewPage />} />
      </Routes>
    </Suspense>
  </BrowserRouter>,
)
